import { describe, expect, it } from 'vitest';
import { addDays, compareDates } from '../src/domain/date';
import { cycleForDate, nextCycle, previousCycle } from '../src/domain/cycle';
import type { CycleRule } from '../src/types';

const RULE_10: CycleRule[] = [{ id: 'default', effectiveFrom: '0001-01-01', startDay: 10 }];

describe('ciclos financeiros', () => {
	it('separa corretamente os limites do ciclo 10–9', () => {
		expect(cycleForDate('2026-08-09', RULE_10)).toEqual({ start: '2026-07-10', end: '2026-08-09' });
		expect(cycleForDate('2026-08-10', RULE_10)).toEqual({ start: '2026-08-10', end: '2026-09-09' });
		expect(cycleForDate('2026-09-09', RULE_10)).toEqual({ start: '2026-08-10', end: '2026-09-09' });
		expect(cycleForDate('2026-09-10', RULE_10)).toEqual({ start: '2026-09-10', end: '2026-10-09' });
	});

	it('atravessa dezembro, janeiro e fevereiro bissexto', () => {
		expect(cycleForDate('2026-01-03', RULE_10)).toEqual({ start: '2025-12-10', end: '2026-01-09' });
		expect(cycleForDate('2024-02-29', RULE_10)).toEqual({ start: '2024-02-10', end: '2024-03-09' });
	});

	it('ajusta dias 29–31 ao último dia de meses curtos', () => {
		const rules: CycleRule[] = [{ id: 'day-31', effectiveFrom: '0001-01-01', startDay: 31 }];
		expect(cycleForDate('2024-02-29', rules)).toEqual({ start: '2024-02-29', end: '2024-03-30' });
		expect(cycleForDate('2023-02-28', rules)).toEqual({ start: '2023-02-28', end: '2023-03-30' });
	});

	it('preserva continuidade ao mudar historicamente do dia 10 para o dia 5', () => {
		const rules: CycleRule[] = [
			{ id: 'old', effectiveFrom: '0001-01-01', startDay: 10 },
			{ id: 'new', effectiveFrom: '2028-10-05', startDay: 5 },
		];
		expect(cycleForDate('2028-10-04', rules)).toEqual({ start: '2028-09-10', end: '2028-10-04' });
		expect(cycleForDate('2028-10-05', rules)).toEqual({ start: '2028-10-05', end: '2028-11-04' });
	});

	it('cria ciclo de transição quando a vigência não coincide com o novo dia', () => {
		const rules: CycleRule[] = [
			{ id: 'old', effectiveFrom: '0001-01-01', startDay: 10 },
			{ id: 'new', effectiveFrom: '2028-10-20', startDay: 5 },
		];
		expect(cycleForDate('2028-10-19', rules)).toEqual({ start: '2028-10-10', end: '2028-10-19' });
		expect(cycleForDate('2028-10-20', rules)).toEqual({ start: '2028-10-20', end: '2028-11-04' });
	});

	it('atribui cada dia a exatamente um período e mantém navegação adjacente', () => {
		const rules: CycleRule[] = [
			{ id: 'old', effectiveFrom: '0001-01-01', startDay: 10 },
			{ id: 'new', effectiveFrom: '2027-06-30', startDay: 31 },
		];
		let date = '2026-01-01';
		while (compareDates(date, '2028-12-31') <= 0) {
			const cycle = cycleForDate(date, rules);
			expect(compareDates(cycle.start, date)).toBeLessThanOrEqual(0);
			expect(compareDates(cycle.end, date)).toBeGreaterThanOrEqual(0);
			expect(nextCycle(cycle, rules).start).toBe(addDays(cycle.end, 1));
			expect(previousCycle(cycle, rules).end).toBe(addDays(cycle.start, -1));
			date = addDays(date, 1);
		}
	});
});
