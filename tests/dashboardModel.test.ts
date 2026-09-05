import { describe, expect, it } from 'vitest';
import { entryDateForPeriod, filterTransactions, periodLabel } from '../src/views/dashboardModel';
import { normalizePluginData } from '../src/settings/settings';
import type { Transaction } from '../src/types';

const settings = normalizePluginData(undefined).settings;
const entries: Transaction[] = [
	{ id: 'one', date: '2026-09-02', type: 'expense', accountId: 'cash', categoryId: 'food', description: 'Café', amountCents: 1500, createdAt: '2026-09-02T12:00:00Z' },
	{ id: 'two', date: '2026-09-03', type: 'income', accountId: 'bank', categoryId: 'salary', description: 'September pay', amountCents: 500000, createdAt: '2026-09-03T12:00:00Z' },
];

describe('dashboard navigation and filtering', () => {
	it('uses today within the viewed period, including both boundaries', () => {
		const period = { start: '2026-09-01', end: '2026-09-30' };
		for (const date of ['2026-09-01', '2026-09-05', '2026-09-30']) {
			expect(entryDateForPeriod(period, date)).toBe(date);
		}
	});

	it('keeps a new entry visible when viewing a past month, future month or cross-month cycle', () => {
		for (const period of [
			{ start: '2026-08-01', end: '2026-08-31' },
			{ start: '2026-10-01', end: '2026-10-31' },
			{ start: '2026-07-10', end: '2026-08-09' },
		]) expect(entryDateForPeriod(period, '2026-09-05')).toBe(period.start);
	});

	it('gives each period mode a recognizable title', () => {
		const period = { start: '2026-09-01', end: '2026-09-30' };
		expect(periodLabel('month', period)).toBe('September 2026');
		expect(periodLabel('year', period)).toBe('2026');
		expect(periodLabel('cycle', period)).toBe('Financial cycle');
	});

	it('searches descriptions, categories and accounts, ignoring case and accents', () => {
		for (const search of [' CAFE ', 'food', 'CASH']) {
			expect(filterTransactions(entries, { search, type: 'all', accountId: 'all' }, settings).map((item) => item.id)).toEqual(['one']);
		}
		expect(filterTransactions(entries, { search: 'salary', type: 'all', accountId: 'all' }, settings).map((item) => item.id)).toEqual(['two']);
	});

	it('combines filters and restores newest-first results when cleared without changing input', () => {
		expect(filterTransactions(entries, { search: 'cafe', type: 'income', accountId: 'all' }, settings)).toEqual([]);
		expect(filterTransactions(entries, { search: '', type: 'all', accountId: 'bank' }, settings).map((item) => item.id)).toEqual(['two']);
		expect(filterTransactions(entries, { search: '', type: 'all', accountId: 'all' }, settings).map((item) => item.id)).toEqual(['two', 'one']);
		expect(entries.map((item) => item.id)).toEqual(['one', 'two']);
	});
});
