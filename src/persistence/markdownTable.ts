export interface MarkdownTableSchema {
	kind: string;
	title: string;
	columns: readonly string[];
	requiredColumns: readonly string[];
}

export interface ParsedTableRow {
	lineIndex: number;
	raw: string;
	cells: Record<string, string>;
}

export interface ParsedMarkdownTable {
	lines: string[];
	newline: '\n' | '\r\n';
	columns: string[];
	rows: ParsedTableRow[];
	headerLineIndex: number;
	insertLineIndex: number;
	diagnostics: string[];
}

function markers(schema: MarkdownTableSchema): { start: string; end: string } {
	return {
		start: `<!-- finance-vault:table:v1:${schema.kind}:start -->`,
		end: `<!-- finance-vault:table:v1:${schema.kind}:end -->`,
	};
}

export function encodeTableCell(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
}

export function decodeTableCell(value: string): string {
	let result = '';
	let escaped = false;
	for (const character of value.trim()) {
		if (escaped) {
			result += character;
			escaped = false;
		} else if (character === '\\') {
			escaped = true;
		} else {
			result += character;
		}
	}
	if (escaped) {
		result += '\\';
	}
	return result;
}

export function splitTableRow(line: string): string[] | undefined {
	const trimmed = line.trim();
	if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
		return undefined;
	}
	const cells: string[] = [];
	let current = '';
	let escaped = false;
	for (let index = 1; index < trimmed.length - 1; index += 1) {
		const character = trimmed[index];
		if (escaped) {
			current += `\\${character ?? ''}`;
			escaped = false;
		} else if (character === '\\') {
			escaped = true;
		} else if (character === '|') {
			cells.push(decodeTableCell(current));
			current = '';
		} else {
			current += character;
		}
	}
	if (escaped) {
		current += '\\';
	}
	cells.push(decodeTableCell(current));
	return cells;
}

function isSeparator(line: string, cellCount: number): boolean {
	const cells = splitTableRow(line);
	return Boolean(cells && cells.length === cellCount && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim())));
}

function rowFromCells(columns: readonly string[], cells: readonly string[], lineIndex: number, raw: string): ParsedTableRow {
	const values: Record<string, string> = {};
	for (let index = 0; index < columns.length; index += 1) {
		const column = columns[index];
		if (column) {
			values[column] = cells[index] ?? '';
		}
	}
	return { lineIndex, raw, cells: values };
}

export function parseMarkdownTable(content: string, schema: MarkdownTableSchema): ParsedMarkdownTable {
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	const lines = content.split(/\r?\n/);
	const tableMarkers = markers(schema);
	const markerStarts = lines.flatMap((line, index) => line === tableMarkers.start ? [index] : []);
	const markerEnds = lines.flatMap((line, index) => line === tableMarkers.end ? [index] : []);
	const markerStart = markerStarts[0] ?? -1;
	const markerEnd = markerEnds[0] ?? -1;
	const diagnostics: string[] = [];
	let headerIndex = -1;
	let rowLimit = lines.length;

	if (markerStarts.length > 1 || markerEnds.length > 1) {
		diagnostics.push('Existe mais de um bloco financeiro do mesmo tipo no arquivo.');
	}
	if ((markerStart >= 0) !== (markerEnd >= 0) || markerEnd >= 0 && markerEnd <= markerStart) {
		diagnostics.push('Os marcadores da tabela estão incompletos ou fora de ordem.');
	} else if (markerStart >= 0 && markerEnd > markerStart) {
		headerIndex = markerStart + 1;
		rowLimit = markerEnd;
	}

	if (headerIndex < 0) {
		headerIndex = lines.findIndex((line, index) => {
			const cells = splitTableRow(line);
			const next = lines[index + 1];
			return Boolean(cells
				&& schema.requiredColumns.every((column) => cells.includes(column))
				&& next
				&& isSeparator(next, cells.length));
		});
		if (headerIndex >= 0) {
			let cursor = headerIndex + 2;
			while (cursor < lines.length && splitTableRow(lines[cursor] ?? '')) {
				cursor += 1;
			}
			rowLimit = cursor;
		}
	}

	if (headerIndex < 0) {
		return {
			lines,
			newline,
			columns: [...schema.columns],
			rows: [],
			headerLineIndex: -1,
			insertLineIndex: lines.length,
			diagnostics: [...diagnostics, 'Tabela financeira não encontrada.'],
		};
	}

	const columns = splitTableRow(lines[headerIndex] ?? '') ?? [];
	if (!schema.requiredColumns.every((column) => columns.includes(column))) {
		diagnostics.push('A tabela não contém todas as colunas obrigatórias.');
	}
	const separator = lines[headerIndex + 1];
	if (!separator || !isSeparator(separator, columns.length)) {
		diagnostics.push('O separador da tabela é inválido.');
	}
	const rows: ParsedTableRow[] = [];
	const seenIds = new Set<string>();
	for (let index = headerIndex + 2; index < rowLimit; index += 1) {
		const raw = lines[index] ?? '';
		if (!raw.trim()) {
			continue;
		}
		const cells = splitTableRow(raw);
		if (!cells || cells.length !== columns.length) {
			diagnostics.push(`Linha ${index + 1}: quantidade de células inválida.`);
			continue;
		}
		const row = rowFromCells(columns, cells, index, raw);
		const id = row.cells.id;
		if (!id) {
			diagnostics.push(`Linha ${index + 1}: ID ausente.`);
			continue;
		}
		if (seenIds.has(id)) {
			diagnostics.push(`Linha ${index + 1}: ID duplicado (${id}).`);
			continue;
		}
		seenIds.add(id);
		rows.push(row);
	}
	return { lines, newline, columns, rows, headerLineIndex: headerIndex, insertLineIndex: rowLimit, diagnostics };
}

function serializeRow(columns: readonly string[], values: Record<string, string>): string {
	return `| ${columns.map((column) => encodeTableCell(values[column] ?? '')).join(' | ')} |`;
}

function requireMutableTable(table: ParsedMarkdownTable): void {
	if (table.diagnostics.length > 0) {
		throw new Error(`O arquivo possui problemas e não foi alterado: ${table.diagnostics.join(' ')}`);
	}
}

function addMissingSchemaColumns(table: ParsedMarkdownTable, schema: MarkdownTableSchema): void {
	const missing = schema.columns.filter((column) => !table.columns.includes(column));
	if (missing.length === 0) {
		return;
	}
	const columns = [...table.columns, ...missing];
	table.lines[table.headerLineIndex] = `| ${columns.join(' | ')} |`;
	table.lines[table.headerLineIndex + 1] = `| ${columns
		.map((column) => column === 'amountCents' ? '---:' : '---')
		.join(' | ')} |`;
	for (const row of table.rows) {
		table.lines[row.lineIndex] = serializeRow(columns, row.cells);
	}
	table.columns = columns;
}

export function createMarkdownDocument(schema: MarkdownTableSchema): string {
	const tableMarkers = markers(schema);
	const header = `| ${schema.columns.join(' | ')} |`;
	const separator = `| ${schema.columns.map((column) => column === 'amountCents' ? '---:' : '---').join(' | ')} |`;
	return `# ${schema.title}\n\nValores monetários são armazenados como centavos inteiros em \`amountCents\`.\n\n${tableMarkers.start}\n${header}\n${separator}\n${tableMarkers.end}\n`;
}

export function insertMarkdownRow(
	content: string,
	schema: MarkdownTableSchema,
	values: Record<string, string>,
): string {
	const table = parseMarkdownTable(content, schema);
	requireMutableTable(table);
	addMissingSchemaColumns(table, schema);
	if (table.rows.some((row) => row.cells.id === values.id)) {
		throw new Error(`Já existe um registro com o ID ${values.id}.`);
	}
	table.lines.splice(table.insertLineIndex, 0, serializeRow(table.columns, values));
	return table.lines.join(table.newline);
}

export function updateMarkdownRow(
	content: string,
	schema: MarkdownTableSchema,
	id: string,
	values: Record<string, string>,
): string {
	const table = parseMarkdownTable(content, schema);
	requireMutableTable(table);
	addMissingSchemaColumns(table, schema);
	const row = table.rows.find((candidate) => candidate.cells.id === id);
	if (!row) {
		throw new Error(`Registro ${id} não encontrado.`);
	}
	const merged = { ...row.cells };
	for (const column of schema.columns) {
		merged[column] = values[column] ?? '';
	}
	table.lines[row.lineIndex] = serializeRow(table.columns, merged);
	return table.lines.join(table.newline);
}

export function deleteMarkdownRow(content: string, schema: MarkdownTableSchema, id: string): string {
	const table = parseMarkdownTable(content, schema);
	requireMutableTable(table);
	const row = table.rows.find((candidate) => candidate.cells.id === id);
	if (!row) {
		throw new Error(`Registro ${id} não encontrado.`);
	}
	table.lines.splice(row.lineIndex, 1);
	return table.lines.join(table.newline);
}
