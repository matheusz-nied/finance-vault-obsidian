import { describe, expect, it } from 'vitest';
import { TFile, TFolder, type Vault } from 'obsidian';
import { TransactionRepository } from '../src/repositories/TransactionRepository';
import { DEFAULT_SETTINGS } from '../src/settings/settings';
import type { PendingMove, Transaction } from '../src/types';

class FakeVault {
	private readonly files = new Map<string, { file: TFile; content: string }>();
	private readonly folders = new Map<string, TFolder>();

	getAbstractFileByPath(path: string): TFile | TFolder | null {
		return this.files.get(path)?.file ?? this.folders.get(path) ?? null;
	}

	async createFolder(path: string): Promise<TFolder> {
		const folder = Object.assign(new TFolder(), { path });
		this.folders.set(path, folder);
		return folder;
	}

	async create(path: string, content: string): Promise<TFile> {
		const file = Object.assign(new TFile(), { path });
		this.files.set(path, { file, content });
		return file;
	}

	async cachedRead(file: TFile): Promise<string> {
		const entry = this.files.get(file.path);
		if (!entry) {
			throw new Error('Arquivo ausente.');
		}
		return entry.content;
	}

	async process(file: TFile, callback: (content: string) => string): Promise<string> {
		const entry = this.files.get(file.path);
		if (!entry) {
			throw new Error('Arquivo ausente.');
		}
		entry.content = callback(entry.content);
		return entry.content;
	}
}

function transaction(id: string, date: string): Transaction {
	return {
		id,
		date,
		type: 'expense',
		accountId: 'bank',
		categoryId: 'food',
		description: 'Teste',
		amountCents: 1000,
		createdAt: '2026-08-10T10:00:00Z',
	};
}

describe('repositório Markdown mensal', () => {
	it('faz CRUD e move uma transação entre meses com journal', async () => {
		const vault = new FakeVault();
		let pendingMove: PendingMove | undefined;
		const repository = new TransactionRepository(
			vault as unknown as Vault,
			() => 'Financas',
			() => DEFAULT_SETTINGS,
			{
				setPendingMove: async (move) => {
					pendingMove = move;
				},
			},
		);
		const original = transaction('tx-move', '2026-08-31');
		await repository.create(original);
		expect((await repository.listRange({ start: '2026-08-01', end: '2026-08-31' })).records).toHaveLength(1);
		const moved = { ...original, date: '2026-09-01', updatedAt: '2026-09-01T10:00:00Z' };
		await repository.update(original.id, original.date, moved);
		expect(pendingMove).toBeUndefined();
		expect((await repository.listRange({ start: '2026-08-01', end: '2026-08-31' })).records).toHaveLength(0);
		expect((await repository.listRange({ start: '2026-09-01', end: '2026-09-30' })).records[0]?.date).toBe('2026-09-01');
		await repository.delete(moved.id, moved.date);
		expect((await repository.listRange({ start: '2026-09-01', end: '2026-09-30' })).records).toHaveLength(0);
	});

	it('recupera de forma idempotente uma movimentação preparada', async () => {
		const vault = new FakeVault();
		let pendingMove: PendingMove | undefined;
		const repository = new TransactionRepository(
			vault as unknown as Vault,
			() => 'Financas',
			() => DEFAULT_SETTINGS,
			{ setPendingMove: async (move) => { pendingMove = move; } },
		);
		const original = transaction('tx-recover', '2026-08-31');
		const moved = { ...original, date: '2026-09-01', updatedAt: '2026-09-01T10:00:00Z' };
		await repository.create(original);
		const move: PendingMove = {
			entity: 'transaction',
			id: original.id,
			fromDate: original.date,
			toDate: moved.date,
			payload: moved,
			phase: 'prepared',
		};
		await repository.recoverMove(move);
		expect(pendingMove).toBeUndefined();
		expect((await repository.listRange({ start: '2026-08-01', end: '2026-09-30' })).records).toEqual([moved]);
	});

	it('cria um parcelamento em vários arquivos mensais', async () => {
		const vault = new FakeVault();
		const repository = new TransactionRepository(
			vault as unknown as Vault,
			() => 'Financas',
			() => DEFAULT_SETTINGS,
			{ setPendingMove: async () => undefined },
		);
		const records = [
			transaction('tx-aug', '2026-08-31'),
			transaction('tx-sep', '2026-09-30'),
			transaction('tx-oct', '2026-10-31'),
		];
		await repository.createMany(records);
		const result = await repository.listRange({ start: '2026-08-01', end: '2026-10-31' });
		expect(result.records.map((record) => record.id)).toEqual(['tx-aug', 'tx-sep', 'tx-oct']);
	});
});
