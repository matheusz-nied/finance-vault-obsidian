import type { DateRange, LocalDate } from '../types';

interface DateParts {
	year: number;
	month: number;
	day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
	if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
		throw new Error('Invalid year or month.');
	}
	const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return lengths[month - 1] ?? 0;
}

export function parseLocalDate(value: string): DateParts {
	const match = DATE_PATTERN.exec(value);
	if (!match) {
		throw new Error(`Invalid date: ${value}`);
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
		throw new Error(`Invalid date: ${value}`);
	}
	return { year, month, day };
}

export function isLocalDate(value: string): value is LocalDate {
	try {
		parseLocalDate(value);
		return true;
	} catch {
		return false;
	}
}

export function localDate(year: number, month: number, day: number): LocalDate {
	if (day < 1 || day > daysInMonth(year, month)) {
		throw new Error('Invalid day.');
	}
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function compareDates(left: LocalDate, right: LocalDate): number {
	parseLocalDate(left);
	parseLocalDate(right);
	return left < right ? -1 : left > right ? 1 : 0;
}

export function addDays(value: LocalDate, delta: number): LocalDate {
	if (!Number.isInteger(delta)) {
		throw new Error('The number of days must be an integer.');
	}
	let { year, month, day } = parseLocalDate(value);
	let remaining = delta;
	while (remaining > 0) {
		const monthLength = daysInMonth(year, month);
		if (day < monthLength) {
			day += 1;
		} else {
			day = 1;
			if (month === 12) {
				year += 1;
				month = 1;
			} else {
				month += 1;
			}
		}
		remaining -= 1;
	}
	while (remaining < 0) {
		if (day > 1) {
			day -= 1;
		} else {
			if (month === 1) {
				year -= 1;
				month = 12;
			} else {
				month -= 1;
			}
			if (year < 1) {
				throw new Error('The resulting date is earlier than the supported calendar.');
			}
			day = daysInMonth(year, month);
		}
		remaining += 1;
	}
	return localDate(year, month, day);
}

export function addMonths(value: LocalDate, delta: number): LocalDate {
	if (!Number.isInteger(delta)) {
		throw new Error('The number of months must be an integer.');
	}
	const { year, month, day } = parseLocalDate(value);
	const absoluteMonth = year * 12 + (month - 1) + delta;
	const targetYear = Math.floor(absoluteMonth / 12);
	const targetMonth = ((absoluteMonth % 12) + 12) % 12 + 1;
	if (targetYear < 1) {
		throw new Error('The resulting date is earlier than the supported calendar.');
	}
	return localDate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

export function monthKey(value: LocalDate): string {
	parseLocalDate(value);
	return value.slice(0, 7);
}

export function monthRange(value: LocalDate): DateRange {
	const { year, month } = parseLocalDate(value);
	return {
		start: localDate(year, month, 1),
		end: localDate(year, month, daysInMonth(year, month)),
	};
}

export function yearRange(value: LocalDate): DateRange {
	const { year } = parseLocalDate(value);
	return { start: localDate(year, 1, 1), end: localDate(year, 12, 31) };
}

export function monthKeysBetween(range: DateRange): string[] {
	if (compareDates(range.start, range.end) > 0) {
		throw new Error('The period start date must be earlier than its end date.');
	}
	const keys: string[] = [];
	let cursor = monthRange(range.start).start;
	const finalKey = monthKey(range.end);
	while (true) {
		keys.push(monthKey(cursor));
		if (monthKey(cursor) === finalKey) {
			break;
		}
		cursor = addMonths(cursor, 1);
	}
	return keys;
}

export function todayLocal(now = new Date()): LocalDate {
	return localDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function formatLocalDate(value: LocalDate): string {
	const { year, month, day } = parseLocalDate(value);
	return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function isWithinRange(value: LocalDate, range: DateRange): boolean {
	return compareDates(value, range.start) >= 0 && compareDates(value, range.end) <= 0;
}
