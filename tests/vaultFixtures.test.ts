import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateInvestment, validateTransaction } from '../src/domain/validation';
import { parseMarkdownTable } from '../src/persistence/markdownTable';
import {
	INVESTMENT_SCHEMA,
	TRANSACTION_SCHEMA,
	investmentFromCells,
	transactionFromCells,
} from '../src/persistence/schemas';
import { DEFAULT_SETTINGS } from '../src/settings/settings';

function fixture(path: string): string {
	return readFileSync(new URL(`../test-vault/${path}`, import.meta.url), 'utf8');
}

describe('vault local de testes', () => {
	it('aceita dados manuais que respeitam o formato canônico', () => {
		const transactionTables = [
			parseMarkdownTable(fixture('Financas/Transacoes/2026-08.md'), TRANSACTION_SCHEMA),
			parseMarkdownTable(fixture('Financas/Transacoes/2026-09.md'), TRANSACTION_SCHEMA),
		];
		const investmentTables = [
			parseMarkdownTable(fixture('Financas/Investimentos/2026-08.md'), INVESTMENT_SCHEMA),
			parseMarkdownTable(fixture('Financas/Investimentos/2026-09.md'), INVESTMENT_SCHEMA),
		];
		expect(transactionTables.flatMap((table) => table.diagnostics)).toEqual([]);
		expect(investmentTables.flatMap((table) => table.diagnostics)).toEqual([]);
		const transactions = transactionTables
			.flatMap((table) => table.rows)
			.map((row) => validateTransaction(transactionFromCells(row.cells), DEFAULT_SETTINGS));
		const investments = investmentTables
			.flatMap((table) => table.rows)
			.map((row) => validateInvestment(investmentFromCells(row.cells)));
		expect([...transactions, ...investments].every((record) => Number.isSafeInteger(record.amountCents))).toBe(true);
		expect([...transactions, ...investments].every((record) => record.amountCents > 0)).toBe(true);
	});
});
