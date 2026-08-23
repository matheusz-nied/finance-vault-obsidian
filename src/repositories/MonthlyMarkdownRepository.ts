import { normalizePath, TFile, TFolder, Vault } from 'obsidian';
import { isWithinRange, monthKey, monthKeysBetween } from '../domain/date';
import type {
	DateRange,
	LocalDate,
	MoveEntity,
	PendingMove,
	RepositoryQuery,
	StorageDiagnostic,
} from '../types';
import {
	createMarkdownDocument,
	deleteMarkdownRow,
	insertMarkdownRow,
	parseMarkdownTable,
	updateMarkdownRow,
	type MarkdownTableSchema,
} from '../persistence/markdownTable';

export interface EntityCodec<T extends { id: string; date: LocalDate }> {
	toCells(record: T): Record<string, string>;
	fromCells(cells: Record<string, string>): T;
	validate(record: T): T;
}

export interface MoveJournal {
	setPendingMove(move: PendingMove | undefined): Promise<void>;
}

export class MonthlyMarkdownRepository<T extends { id: string; date: LocalDate }> {
	private queue: Promise<void> = Promise.resolve();

	constructor(
		private readonly vault: Vault,
		private readonly getDataRoot: () => string,
		private readonly folder: string,
		private readonly entity: MoveEntity,
		private readonly schema: MarkdownTableSchema,
		private readonly codec: EntityCodec<T>,
		private readonly journal: MoveJournal,
	) {}

	private pathForDate(date: LocalDate): string {
		return normalizePath(`${this.getDataRoot()}/${this.folder}/${monthKey(date)}.md`);
	}

	private async serialized<R>(operation: () => Promise<R>): Promise<R> {
		const waitFor = this.queue;
		let release: (() => void) | undefined;
		this.queue = new Promise<void>((resolve) => {
			release = resolve;
		});
		await waitFor;
		try {
			return await operation();
		} finally {
			release?.();
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const parts = normalizePath(path).split('/').filter(Boolean);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.vault.getAbstractFileByPath(current);
			if (existing instanceof TFile) {
				throw new Error(`${current} existe, mas não é uma pasta.`);
			}
			if (!existing) {
				await this.vault.createFolder(current);
			} else if (!(existing instanceof TFolder)) {
				throw new Error(`Não foi possível acessar a pasta ${current}.`);
			}
		}
	}

	private async ensureFile(path: string): Promise<TFile> {
		const existing = this.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			return existing;
		}
		if (existing) {
			throw new Error(`${path} existe, mas não é um arquivo.`);
		}
		const folderPath = path.slice(0, path.lastIndexOf('/'));
		await this.ensureFolder(folderPath);
		return this.vault.create(path, createMarkdownDocument(this.schema));
	}

	private fileAtDate(date: LocalDate): TFile | undefined {
		const file = this.vault.getAbstractFileByPath(this.pathForDate(date));
		return file instanceof TFile ? file : undefined;
	}

	async listRange(range: DateRange): Promise<RepositoryQuery<T>> {
		const records: T[] = [];
		const diagnostics: StorageDiagnostic[] = [];
		const seenIds = new Set<string>();
		for (const key of monthKeysBetween(range)) {
			const path = normalizePath(`${this.getDataRoot()}/${this.folder}/${key}.md`);
			const file = this.vault.getAbstractFileByPath(path);
			if (!file) {
				continue;
			}
			if (!(file instanceof TFile)) {
				diagnostics.push({ path, message: 'O caminho mensal não é um arquivo Markdown.' });
				continue;
			}
			const content = await this.vault.cachedRead(file);
			const table = parseMarkdownTable(content, this.schema);
			for (const message of table.diagnostics) {
				diagnostics.push({ path, message });
			}
			for (const row of table.rows) {
				try {
					const record = this.codec.validate(this.codec.fromCells(row.cells));
					if (monthKey(record.date) !== key) {
						diagnostics.push({ path, line: row.lineIndex + 1, message: `A data ${record.date} não pertence ao arquivo ${key}.` });
						continue;
					}
					if (seenIds.has(record.id)) {
						diagnostics.push({ path, line: row.lineIndex + 1, message: `ID duplicado no período: ${record.id}.` });
						continue;
					}
					seenIds.add(record.id);
					if (isWithinRange(record.date, range)) {
						records.push(record);
					}
				} catch (error) {
					diagnostics.push({
						path,
						line: row.lineIndex + 1,
						message: error instanceof Error ? error.message : 'Registro inválido.',
					});
				}
			}
		}
		return { records: records.sort((left, right) => left.date.localeCompare(right.date)), diagnostics };
	}

	private async contains(date: LocalDate, id: string): Promise<boolean> {
		const file = this.fileAtDate(date);
		if (!file) {
			return false;
		}
		const content = await this.vault.cachedRead(file);
		return parseMarkdownTable(content, this.schema).rows.some((row) => row.cells.id === id);
	}

	private async createUnsafe(record: T): Promise<void> {
		this.codec.validate(record);
		const path = this.pathForDate(record.date);
		const file = await this.ensureFile(path);
		await this.vault.process(file, (content) => insertMarkdownRow(content, this.schema, this.codec.toCells(record)));
	}

	private async deleteUnsafe(id: string, date: LocalDate): Promise<void> {
		const file = this.fileAtDate(date);
		if (!file) {
			throw new Error(`Arquivo de origem não encontrado para ${id}.`);
		}
		await this.vault.process(file, (content) => deleteMarkdownRow(content, this.schema, id));
	}

	async create(record: T): Promise<void> {
		await this.serialized(() => this.createUnsafe(record));
	}

	async update(id: string, originalDate: LocalDate, next: T): Promise<void> {
		await this.serialized(async () => {
			this.codec.validate(next);
			if (next.id !== id) {
				throw new Error('O ID de um registro existente não pode ser alterado.');
			}
			if (monthKey(originalDate) === monthKey(next.date)) {
				const file = this.fileAtDate(originalDate);
				if (!file) {
					throw new Error(`Arquivo de origem não encontrado para ${id}.`);
				}
				await this.vault.process(file, (content) =>
					updateMarkdownRow(content, this.schema, id, this.codec.toCells(next)),
				);
				return;
			}
			const pending: PendingMove = {
				entity: this.entity,
				id,
				fromDate: originalDate,
				toDate: next.date,
				payload: next as unknown as PendingMove['payload'],
				phase: 'prepared',
			};
			await this.journal.setPendingMove(pending);
			await this.createUnsafe(next);
			await this.journal.setPendingMove({ ...pending, phase: 'inserted' });
			await this.deleteUnsafe(id, originalDate);
			await this.journal.setPendingMove(undefined);
		});
	}

	async delete(id: string, date: LocalDate): Promise<void> {
		await this.serialized(() => this.deleteUnsafe(id, date));
	}

	async recoverMove(move: PendingMove): Promise<void> {
		if (move.entity !== this.entity) {
			return;
		}
		await this.serialized(async () => {
			const payload = move.payload as unknown as T;
			if (!(await this.contains(move.toDate, move.id))) {
				await this.createUnsafe(payload);
			}
			await this.journal.setPendingMove({ ...move, phase: 'inserted' });
			if (await this.contains(move.fromDate, move.id)) {
				await this.deleteUnsafe(move.id, move.fromDate);
			}
			await this.journal.setPendingMove(undefined);
		});
	}
}
