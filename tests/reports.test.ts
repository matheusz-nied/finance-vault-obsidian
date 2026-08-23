import { describe, expect, it } from 'vitest';
import { calculateReport } from '../src/domain/reports';
import type { InvestmentContribution, Transaction } from '../src/types';

const transactions: Transaction[] = [
	{ id: 'before', date: '2026-08-09', type: 'expense', accountId: 'bank', categoryId: 'food', description: 'Antes', amountCents: 2500, createdAt: '2026-08-09T10:00:00Z' },
	{ id: 'salary', date: '2026-08-10', type: 'income', accountId: 'bank', categoryId: 'salary', description: 'Salário', amountCents: 500000, createdAt: '2026-08-10T10:00:00Z' },
	{ id: 'card-purchase', date: '2026-08-15', type: 'expense', accountId: 'credit-card', categoryId: 'food', description: 'Cartão', amountCents: 12345, createdAt: '2026-08-15T10:00:00Z' },
	{ id: 'transport', date: '2026-08-31', type: 'expense', accountId: 'cash', categoryId: 'transport', description: 'Transporte', amountCents: 4500, createdAt: '2026-08-31T10:00:00Z' },
	{ id: 'housing', date: '2026-09-09', type: 'expense', accountId: 'bank', categoryId: 'housing', description: 'Moradia', amountCents: 80000, createdAt: '2026-09-09T10:00:00Z' },
	{ id: 'next', date: '2026-09-10', type: 'income', accountId: 'bank', categoryId: 'extra-income', description: 'Próximo', amountCents: 120000, createdAt: '2026-09-10T10:00:00Z' },
];

const contributions: InvestmentContribution[] = [
	{ id: 'inv-aug', date: '2026-08-25', asset: 'Tesouro', category: 'fixed-income', amountCents: 50000, createdAt: '2026-08-25T10:00:00Z' },
	{ id: 'inv-sep', date: '2026-09-09', asset: 'IVVB11', category: 'etf', amountCents: 30000, createdAt: '2026-09-09T10:00:00Z' },
	{ id: 'inv-next', date: '2026-09-10', asset: 'Bitcoin', category: 'crypto', amountCents: 10000, createdAt: '2026-09-10T10:00:00Z' },
];

describe('relatórios', () => {
	it('calcula mês de calendário', () => {
		const report = calculateReport({ start: '2026-08-01', end: '2026-08-31' }, transactions, contributions);
		expect(report.receivedCents).toBe(500000);
		expect(report.spentCents).toBe(19345);
		expect(report.contributedCents).toBe(50000);
		expect(report.balanceCents).toBe(430655);
	});

	it('calcula ciclo que atravessa dois arquivos mensais', () => {
		const report = calculateReport({ start: '2026-08-10', end: '2026-09-09' }, transactions, contributions);
		expect(report.receivedCents).toBe(500000);
		expect(report.spentCents).toBe(96845);
		expect(report.contributedCents).toBe(80000);
		expect(report.balanceCents).toBe(323155);
	});

	it('separa despesas de aportes no relatório anual', () => {
		const report = calculateReport({ start: '2026-01-01', end: '2026-12-31' }, transactions, contributions);
		expect(report.receivedCents).toBe(620000);
		expect(report.spentCents).toBe(99345);
		expect(report.contributedCents).toBe(90000);
		expect(report.spentByCategory.food).toBe(14845);
		expect(report.spentByAccount['credit-card']).toBe(12345);
		expect(report.spentByAccount.bank).toBe(82500);
		expect(report.contributedByCategory['fixed-income']).toBe(50000);
		expect(report.contributedByCategory.etf).toBe(30000);
		expect(report.contributedByCategory.crypto).toBe(10000);
		expect(report.contributedByAsset.Tesouro).toBe(50000);
		expect(report.contributedByAsset.IVVB11).toBe(30000);
		expect(report.contributedByAsset.Bitcoin).toBe(10000);
	});

	it('soma múltiplos aportes do mesmo tipo e ativo', () => {
		const repeatedContribution: InvestmentContribution = {
			...contributions[0],
			id: 'inv-aug-extra',
			amountCents: 25000,
		};
		const report = calculateReport(
			{ start: '2026-08-01', end: '2026-08-31' },
			transactions,
			[...contributions, repeatedContribution],
		);

		expect(report.contributedByCategory['fixed-income']).toBe(75000);
		expect(report.contributedByAsset.Tesouro).toBe(75000);
	});
});
