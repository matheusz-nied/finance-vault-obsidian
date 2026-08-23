import type { CycleRule, DateRange, LocalDate } from '../types';
import {
	addDays,
	addMonths,
	compareDates,
	daysInMonth,
	localDate,
	parseLocalDate,
} from './date';

export const DEFAULT_CYCLE_RULE: CycleRule = {
	id: 'cycle-rule-default',
	effectiveFrom: '0001-01-01',
	startDay: 10,
};

export function validateCycleRules(rules: readonly CycleRule[]): CycleRule[] {
	if (rules.length === 0) {
		return [{ ...DEFAULT_CYCLE_RULE }];
	}
	const sorted = rules.map((rule) => ({ ...rule })).sort((left, right) =>
		compareDates(left.effectiveFrom, right.effectiveFrom),
	);
	const ids = new Set<string>();
	const dates = new Set<string>();
	for (const rule of sorted) {
		parseLocalDate(rule.effectiveFrom);
		if (!rule.id.trim() || ids.has(rule.id)) {
			throw new Error('As regras de ciclo precisam de IDs únicos.');
		}
		if (dates.has(rule.effectiveFrom)) {
			throw new Error('Não pode haver duas regras vigentes na mesma data.');
		}
		if (!Number.isInteger(rule.startDay) || rule.startDay < 1 || rule.startDay > 31) {
			throw new Error('O início do ciclo deve estar entre 1 e 31.');
		}
		ids.add(rule.id);
		dates.add(rule.effectiveFrom);
	}
	return sorted;
}

function naturalBoundary(value: LocalDate, startDay: number): LocalDate {
	const { year, month } = parseLocalDate(value);
	return localDate(year, month, Math.min(startDay, daysInMonth(year, month)));
}

function nextNaturalBoundary(after: LocalDate, startDay: number): LocalDate {
	const current = naturalBoundary(after, startDay);
	if (compareDates(current, after) > 0) {
		return current;
	}
	return naturalBoundary(addMonths(current, 1), startDay);
}

export function cycleForDate(value: LocalDate, inputRules: readonly CycleRule[]): DateRange {
	parseLocalDate(value);
	const rules = validateCycleRules(inputRules);
	let activeIndex = 0;
	for (let index = 0; index < rules.length; index += 1) {
		const rule = rules[index];
		if (rule && compareDates(rule.effectiveFrom, value) <= 0) {
			activeIndex = index;
		}
	}
	const active = rules[activeIndex];
	if (!active) {
		throw new Error('Nenhuma regra de ciclo disponível.');
	}
	const currentNatural = naturalBoundary(value, active.startDay);
	const previousNatural = compareDates(currentNatural, value) <= 0
		? currentNatural
		: naturalBoundary(addMonths(currentNatural, -1), active.startDay);
	const start = compareDates(previousNatural, active.effectiveFrom) < 0
		? active.effectiveFrom
		: previousNatural;
	const naturalNext = nextNaturalBoundary(start, active.startDay);
	const nextRule = rules[activeIndex + 1];
	const nextBoundary = nextRule && compareDates(nextRule.effectiveFrom, naturalNext) < 0
		? nextRule.effectiveFrom
		: naturalNext;
	return { start, end: addDays(nextBoundary, -1) };
}

export function previousCycle(period: DateRange, rules: readonly CycleRule[]): DateRange {
	return cycleForDate(addDays(period.start, -1), rules);
}

export function nextCycle(period: DateRange, rules: readonly CycleRule[]): DateRange {
	return cycleForDate(addDays(period.end, 1), rules);
}
