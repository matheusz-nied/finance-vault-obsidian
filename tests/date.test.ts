import { describe, expect, it } from 'vitest';
import {
	addDays,
	addMonths,
	daysInMonth,
	isLeapYear,
	monthKeysBetween,
	monthRange,
	parseLocalDate,
	yearRange,
} from '../src/domain/date';

describe('calendário local', () => {
	it('valida anos bissextos e fevereiro', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2100)).toBe(false);
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(() => parseLocalDate('2023-02-29')).toThrow();
		expect(parseLocalDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
	});

	it('atravessa meses e anos sem usar UTC', () => {
		expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
		expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
		expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
		expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
	});

	it('gera períodos de mês e ano completos', () => {
		expect(monthRange('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
		expect(yearRange('2026-08-23')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
		expect(monthKeysBetween({ start: '2026-08-10', end: '2026-09-09' })).toEqual(['2026-08', '2026-09']);
	});
});
