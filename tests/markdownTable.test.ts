import { describe, expect, it } from 'vitest';
import {
	createMarkdownDocument,
	deleteMarkdownRow,
	insertMarkdownRow,
	parseMarkdownTable,
	updateMarkdownRow,
} from '../src/persistence/markdownTable';
import { TRANSACTION_SCHEMA } from '../src/persistence/schemas';

const first = {
	id: 'tx-1',
	date: '2026-08-10',
	type: 'expense',
	accountId: 'bank',
	fromAccountId: '',
	toAccountId: '',
	categoryId: 'food',
	description: 'Mercado | feira',
	amountCents: '1050',
	createdAt: '2026-08-10T10:00:00Z',
	updatedAt: '',
};

describe('codec de tabelas Markdown', () => {
	it('cria, lê, atualiza e exclui uma linha escapando pipes', () => {
		let content = createMarkdownDocument(TRANSACTION_SCHEMA);
		content = insertMarkdownRow(content, TRANSACTION_SCHEMA, first);
		let table = parseMarkdownTable(content, TRANSACTION_SCHEMA);
		expect(table.diagnostics).toEqual([]);
		expect(table.rows[0]?.cells.description).toBe('Mercado | feira');
		content = updateMarkdownRow(content, TRANSACTION_SCHEMA, 'tx-1', { ...first, amountCents: '2099' });
		table = parseMarkdownTable(content, TRANSACTION_SCHEMA);
		expect(table.rows[0]?.cells.amountCents).toBe('2099');
		content = deleteMarkdownRow(content, TRANSACTION_SCHEMA, 'tx-1');
		expect(parseMarkdownTable(content, TRANSACTION_SCHEMA).rows).toHaveLength(0);
	});

	it('preserva prosa e colunas desconhecidas durante edição', () => {
		const base = createMarkdownDocument(TRANSACTION_SCHEMA)
			.replace('| id |', '| custom | id |')
			.replace('| --- |', '| --- | --- |')
			.replace('<!-- finance-vault:table:v1:transactions:start -->', 'Texto do usuário\n<!-- finance-vault:table:v1:transactions:start -->');
		const withRow = insertMarkdownRow(base, TRANSACTION_SCHEMA, { ...first, custom: 'preservar' });
		const updated = updateMarkdownRow(withRow, TRANSACTION_SCHEMA, 'tx-1', { ...first, amountCents: '3000' });
		expect(updated).toContain('Texto do usuário');
		expect(updated).toContain('| preservar | tx-1 |');
	});

	it('aceita tabela legada compatível e CRLF', () => {
		const legacy = [
			'# Transações',
			'',
			`| ${TRANSACTION_SCHEMA.columns.join(' | ')} |`,
			`| ${TRANSACTION_SCHEMA.columns.map(() => '---').join(' | ')} |`,
			'',
		].join('\r\n');
		const content = insertMarkdownRow(legacy, TRANSACTION_SCHEMA, first);
		expect(content).toContain('\r\n');
		expect(parseMarkdownTable(content, TRANSACTION_SCHEMA).rows).toHaveLength(1);
	});

	it('bloqueia mutação quando há ID duplicado', () => {
		let content = createMarkdownDocument(TRANSACTION_SCHEMA);
		content = insertMarkdownRow(content, TRANSACTION_SCHEMA, first);
		const duplicate = content.replace(
			'<!-- finance-vault:table:v1:transactions:end -->',
			`${parseMarkdownTable(content, TRANSACTION_SCHEMA).rows[0]?.raw ?? ''}\n<!-- finance-vault:table:v1:transactions:end -->`,
		);
		expect(parseMarkdownTable(duplicate, TRANSACTION_SCHEMA).diagnostics.some((message) => message.includes('duplicado'))).toBe(true);
		expect(() => updateMarkdownRow(duplicate, TRANSACTION_SCHEMA, 'tx-1', first)).toThrow();
	});
});
