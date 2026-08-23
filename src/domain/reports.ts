import type {
	DateRange,
	InvestmentContribution,
	PeriodReport,
	Transaction,
} from '../types';
import { isWithinRange, monthKey, monthRange } from './date';
import { safeSum } from './money';

export function calculateReport(
	period: DateRange,
	transactions: readonly Transaction[],
	contributions: readonly InvestmentContribution[],
): PeriodReport {
	const relevantTransactions = transactions.filter((transaction) => isWithinRange(transaction.date, period));
	const relevantContributions = contributions.filter((contribution) => isWithinRange(contribution.date, period));
	const receivedCents = safeSum(
		relevantTransactions.filter((item) => item.type === 'income').map((item) => item.amountCents),
	);
	const spentCents = safeSum(
		relevantTransactions.filter((item) => item.type === 'expense').map((item) => item.amountCents),
	);
	const contributedCents = safeSum(relevantContributions.map((item) => item.amountCents));
	const spentByCategory: Record<string, number> = {};
	const spentByAccount: Record<string, number> = {};
	for (const transaction of relevantTransactions) {
		if (transaction.type !== 'expense') {
			continue;
		}
		const categoryId = transaction.categoryId ?? 'uncategorized';
		spentByCategory[categoryId] = safeSum([
			spentByCategory[categoryId] ?? 0,
			transaction.amountCents,
		]);
		const accountId = transaction.accountId ?? 'unassigned';
		spentByAccount[accountId] = safeSum([
			spentByAccount[accountId] ?? 0,
			transaction.amountCents,
		]);
	}
	return {
		...period,
		receivedCents,
		spentCents,
		contributedCents,
		balanceCents: receivedCents - spentCents - contributedCents,
		spentByCategory,
		spentByAccount,
	};
}

export function reportsByMonth(
	period: DateRange,
	transactions: readonly Transaction[],
	contributions: readonly InvestmentContribution[],
): Record<string, PeriodReport> {
	const keys = new Set<string>();
	for (const item of [...transactions, ...contributions]) {
		if (isWithinRange(item.date, period)) {
			keys.add(monthKey(item.date));
		}
	}
	const result: Record<string, PeriodReport> = {};
	for (const key of [...keys].sort()) {
		const monthStart = `${key}-01`;
		result[key] = calculateReport(
			monthRange(monthStart),
			transactions,
			contributions,
		);
	}
	return result;
}
