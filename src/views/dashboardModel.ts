import { isWithinRange, parseLocalDate } from '../domain/date';
import type { DateRange, FinanceSettings, ReportMode, Transaction } from '../types';

export function periodLabel(mode: ReportMode, period: DateRange): string {
	const { year, month } = parseLocalDate(period.start);
	if (mode === 'year') return String(year);
	if (mode === 'cycle') return 'Financial cycle';
	const date = new Date(2000, month - 1, 1);
	date.setFullYear(year);
	return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

export function entryDateForPeriod(period: DateRange, today: string): string {
	return isWithinRange(today, period) ? today : period.start;
}

export function filterTransactions(
	transactions: readonly Transaction[],
	filters: { search: string; type: string; accountId: string },
	settings: FinanceSettings,
): Transaction[] {
	const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US');
	const query = normalize(filters.search.trim());
	return transactions.filter((item) => {
		if (filters.type !== 'all' && item.type !== filters.type) return false;
		if (filters.accountId !== 'all' && item.accountId !== filters.accountId) return false;
		const account = settings.accounts.find((account) => account.id === item.accountId)?.name ?? '';
		const category = settings.categories.find((category) => category.id === item.categoryId)?.name ?? '';
		return !query || normalize(`${item.description} ${account} ${category}`).includes(query);
	}).sort((left, right) => right.date.localeCompare(left.date));
}
