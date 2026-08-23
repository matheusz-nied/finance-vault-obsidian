import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateReport } from '../src/domain/reports';
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
	it('começa vazia e usa o formato canônico', () => {
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
		const report = calculateReport({ start: '2026-08-10', end: '2026-09-09' }, transactions, investments);
		expect(transactions).toEqual([]);
		expect(investments).toEqual([]);
		expect(report.receivedCents).toBe(0);
		expect(report.spentCents).toBe(0);
		expect(report.contributedCents).toBe(0);
		expect(report.balanceCents).toBe(0);
	});
});
