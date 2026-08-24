import type { MoneyCents } from '../types';

export function assertMoneyCents(value: number): MoneyCents {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error('The amount must be a positive integer number of cents.');
	}
	return value;
}

export function parseBrlToCents(input: string): MoneyCents {
	const normalized = input.trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
	if (!/^\d+(?:[.,]\d+)*$/.test(normalized)) {
		throw new Error('Enter the amount in the format 1234.56 or 1234,56.');
	}
	const lastComma = normalized.lastIndexOf(',');
	const lastDot = normalized.lastIndexOf('.');
	const lastSeparator = Math.max(lastComma, lastDot);
	const digitsAfterLastSeparator = lastSeparator >= 0 ? normalized.length - lastSeparator - 1 : 0;
	const hasBothSeparators = lastComma >= 0 && lastDot >= 0;
	const separatorCount = [...normalized].filter((character) => character === ',' || character === '.').length;
	const hasDecimalSeparator = lastSeparator >= 0 && (hasBothSeparators || digitsAfterLastSeparator <= 2);
	const integerPart = hasDecimalSeparator ? normalized.slice(0, lastSeparator) : normalized;
	const decimalSeparator = hasDecimalSeparator ? normalized[lastSeparator] : undefined;
	const integerSeparators = [...integerPart].filter((character) => character === ',' || character === '.');
	if (integerSeparators.length > 0) {
		const groups = integerPart.split(/[.,]/);
		if (integerSeparators.some((separator) => separator === decimalSeparator)
			|| groups[0]?.length === 0
			|| groups.slice(1).some((group) => group.length !== 3)) {
			throw new Error('Enter the amount in the format 1234.56 or 1234,56.');
		}
	}
	if (!hasDecimalSeparator && separatorCount > 0 && integerSeparators.length !== separatorCount) {
		throw new Error('Enter the amount in the format 1234.56 or 1234,56.');
	}
	const fractionalPart = hasDecimalSeparator ? normalized.slice(lastSeparator + 1) : '';
	const wholeUnits = integerPart.replace(/[.,]/g, '');
	const centsText = fractionalPart.padEnd(2, '0');
	const cents = Number(wholeUnits) * 100 + Number(centsText || '0');
	return assertMoneyCents(cents);
}

export function formatBrl(value: MoneyCents): string {
	if (!Number.isSafeInteger(value)) {
		throw new Error('Invalid monetary amount.');
	}
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'BRL',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value / 100);
}

export function formatCentsForInput(value: MoneyCents): string {
	if (!Number.isSafeInteger(value)) {
		throw new Error('Invalid monetary amount.');
	}
	const absolute = Math.abs(value);
	const wholeUnits = Math.floor(absolute / 100);
	const cents = String(absolute % 100).padStart(2, '0');
	return `${value < 0 ? '-' : ''}${wholeUnits}.${cents}`;
}

export function safeSum(values: readonly MoneyCents[]): MoneyCents {
	let total = 0;
	for (const value of values) {
		if (!Number.isSafeInteger(value)) {
			throw new Error('Invalid monetary amount.');
		}
		total += value;
		if (!Number.isSafeInteger(total)) {
			throw new Error('The sum exceeds the safe integer limit.');
		}
	}
	return total;
}
