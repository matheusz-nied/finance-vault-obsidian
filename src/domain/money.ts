import type { MoneyCents } from '../types';

const BRL_INPUT_PATTERN = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

export function assertMoneyCents(value: number): MoneyCents {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error('O valor deve ser um número positivo de centavos inteiros.');
	}
	return value;
}

export function parseBrlToCents(input: string): MoneyCents {
	const normalized = input.trim().replace(/^R\$\s?/, '').replace(/\s/g, '');
	const match = BRL_INPUT_PATTERN.exec(normalized);
	if (!match) {
		throw new Error('Informe o valor no formato 1234,56.');
	}
	const [integerPart = '0'] = normalized.split(',');
	const fractionalPart = match[1] ?? '';
	const reais = integerPart.replace(/\./g, '');
	const centsText = fractionalPart.padEnd(2, '0');
	const cents = Number(reais) * 100 + Number(centsText || '0');
	return assertMoneyCents(cents);
}

export function formatBrl(value: MoneyCents): string {
	if (!Number.isSafeInteger(value)) {
		throw new Error('Valor monetário inválido.');
	}
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value / 100);
}

export function formatCentsForInput(value: MoneyCents): string {
	if (!Number.isSafeInteger(value)) {
		throw new Error('Valor monetário inválido.');
	}
	const absolute = Math.abs(value);
	const reais = Math.floor(absolute / 100);
	const cents = String(absolute % 100).padStart(2, '0');
	return `${value < 0 ? '-' : ''}${reais},${cents}`;
}

export function safeSum(values: readonly MoneyCents[]): MoneyCents {
	let total = 0;
	for (const value of values) {
		if (!Number.isSafeInteger(value)) {
			throw new Error('Valor monetário inválido.');
		}
		total += value;
		if (!Number.isSafeInteger(total)) {
			throw new Error('A soma ultrapassa o limite seguro.');
		}
	}
	return total;
}
