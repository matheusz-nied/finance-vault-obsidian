import { describe, expect, it } from 'vitest';
import {
	buildInstallmentTransactions,
	splitInstallmentAmounts,
	summarizeActiveInstallmentPlans,
} from '../src/domain/installments';
import { validateTransaction } from '../src/domain/validation';
import { DEFAULT_SETTINGS } from '../src/settings/settings';

describe('compras parceladas', () => {
	it('divide centavos exatamente e preserva o total', () => {
		expect(splitInstallmentAmounts(100000, 3)).toEqual([33334, 33333, 33333]);
		expect(() => splitInstallmentAmounts(1, 2)).toThrow();
	});

	it('mantém o dia âncora após ajustar meses curtos', () => {
		const transactions = buildInstallmentTransactions({
			planId: 'plan-notebook',
			purchaseDate: '2026-01-31',
			firstInstallmentDate: '2026-01-31',
			description: 'Notebook',
			accountId: 'credit-card',
			categoryId: 'other-expense',
			totalCents: 100000,
			installmentCount: 4,
			createdAt: '2026-01-31T10:00:00Z',
		}, (number) => `tx-${number}`);
		expect(transactions.map((transaction) => transaction.date)).toEqual([
			'2026-01-31',
			'2026-02-28',
			'2026-03-31',
			'2026-04-30',
		]);
		for (const transaction of transactions) {
			expect(() => validateTransaction(transaction, DEFAULT_SETTINGS)).not.toThrow();
		}
	});

	it('permite que a primeira parcela comece em outro mês', () => {
		const transactions = buildInstallmentTransactions({
			planId: 'plan-course',
			purchaseDate: '2026-09-25',
			firstInstallmentDate: '2026-10-25',
			description: 'Curso',
			accountId: 'credit-card',
			categoryId: 'other-expense',
			totalCents: 30000,
			installmentCount: 3,
			createdAt: '2026-09-25T10:00:00Z',
		}, (number) => `tx-${number}`);
		expect(transactions.map((transaction) => transaction.date)).toEqual([
			'2026-10-25',
			'2026-11-25',
			'2026-12-25',
		]);
	});

	it('resume somente compromissos que ainda não chegaram', () => {
		const transactions = buildInstallmentTransactions({
			planId: 'plan-phone',
			purchaseDate: '2026-08-10',
			firstInstallmentDate: '2026-08-10',
			description: 'Celular',
			accountId: 'credit-card',
			categoryId: 'other-expense',
			totalCents: 40000,
			installmentCount: 4,
			createdAt: '2026-08-10T10:00:00Z',
		}, (number) => `tx-${number}`);
		const summaries = summarizeActiveInstallmentPlans(transactions, '2026-09-01');
		expect(summaries[0]?.completedCount).toBe(1);
		expect(summaries[0]?.remainingCents).toBe(30000);
		expect(summaries[0]?.next.installmentNumber).toBe(2);
	});
});
