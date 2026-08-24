import type { InvestmentContribution, Transaction } from '../types';
import { isLocalDate } from '../domain/date';
import { assertMoneyCents } from '../domain/money';
import type { MarkdownTableSchema } from './markdownTable';

export const TRANSACTION_SCHEMA: MarkdownTableSchema = {
	kind: 'transactions',
	title: 'Transactions',
	columns: [
		'id',
		'date',
		'type',
		'accountId',
		'categoryId',
		'fixedTemplateId',
		'installmentPlanId',
		'installmentNumber',
		'installmentCount',
		'installmentTotalCents',
		'installmentPurchaseDate',
		'description',
		'amountCents',
		'createdAt',
		'updatedAt',
	],
	requiredColumns: ['id', 'date', 'type', 'description', 'amountCents', 'createdAt'],
};

export const INVESTMENT_SCHEMA: MarkdownTableSchema = {
	kind: 'investments',
	title: 'Investment contributions',
	columns: ['id', 'date', 'asset', 'category', 'amountCents', 'createdAt', 'updatedAt'],
	requiredColumns: ['id', 'date', 'asset', 'category', 'amountCents', 'createdAt'],
};

function parseCents(value: string): number {
	if (!/^\d+$/.test(value)) {
		throw new Error('amountCents must contain a positive integer.');
	}
	return assertMoneyCents(Number(value));
}

function optional(value: string | undefined): string | undefined {
	return value?.trim() || undefined;
}

export function transactionToCells(transaction: Transaction): Record<string, string> {
	return {
		id: transaction.id,
		date: transaction.date,
		type: transaction.type,
		accountId: transaction.accountId ?? '',
		categoryId: transaction.categoryId ?? '',
		fixedTemplateId: transaction.fixedTemplateId ?? '',
		installmentPlanId: transaction.installmentPlanId ?? '',
		installmentNumber: transaction.installmentNumber ? String(transaction.installmentNumber) : '',
		installmentCount: transaction.installmentCount ? String(transaction.installmentCount) : '',
		installmentTotalCents: transaction.installmentTotalCents ? String(transaction.installmentTotalCents) : '',
		installmentPurchaseDate: transaction.installmentPurchaseDate ?? '',
		description: transaction.description,
		amountCents: String(transaction.amountCents),
		createdAt: transaction.createdAt,
		updatedAt: transaction.updatedAt ?? '',
	};
}

export function transactionFromCells(cells: Record<string, string>): Transaction {
	if (!cells.date || !isLocalDate(cells.date)) {
		throw new Error('Invalid date.');
	}
	if (cells.type !== 'income' && cells.type !== 'expense') {
		throw new Error('Invalid transaction type.');
	}
	if (!cells.id || !cells.description || !cells.createdAt) {
		throw new Error('Required fields are missing.');
	}
	return {
		id: cells.id,
		date: cells.date,
		type: cells.type,
		accountId: optional(cells.accountId),
		categoryId: optional(cells.categoryId),
		fixedTemplateId: optional(cells.fixedTemplateId),
		installmentPlanId: optional(cells.installmentPlanId),
		installmentNumber: optionalPositiveInteger(cells.installmentNumber, 'installmentNumber'),
		installmentCount: optionalPositiveInteger(cells.installmentCount, 'installmentCount'),
		installmentTotalCents: optionalPositiveInteger(cells.installmentTotalCents, 'installmentTotalCents'),
		installmentPurchaseDate: optional(cells.installmentPurchaseDate),
		description: cells.description,
		amountCents: parseCents(cells.amountCents ?? ''),
		createdAt: cells.createdAt,
		updatedAt: optional(cells.updatedAt),
	};
}

function optionalPositiveInteger(value: string | undefined, field: string): number | undefined {
	const normalized = optional(value);
	if (normalized === undefined) {
		return undefined;
	}
	if (!/^\d+$/.test(normalized)) {
		throw new Error(`${field} must be a positive integer.`);
	}
	const parsed = Number(normalized);
	if (!Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error(`${field} must be a positive integer.`);
	}
	return parsed;
}

export function investmentToCells(contribution: InvestmentContribution): Record<string, string> {
	return {
		id: contribution.id,
		date: contribution.date,
		asset: contribution.asset,
		category: contribution.category,
		amountCents: String(contribution.amountCents),
		createdAt: contribution.createdAt,
		updatedAt: contribution.updatedAt ?? '',
	};
}

export function investmentFromCells(cells: Record<string, string>): InvestmentContribution {
	if (!cells.date || !isLocalDate(cells.date)) {
		throw new Error('Invalid date.');
	}
	if (!cells.id || !cells.asset || !cells.createdAt) {
		throw new Error('Required fields are missing.');
	}
	if (
		cells.category !== 'fixed-income'
		&& cells.category !== 'stock'
		&& cells.category !== 'reit'
		&& cells.category !== 'crypto'
		&& cells.category !== 'etf'
		&& cells.category !== 'other'
	) {
		throw new Error('Invalid investment category.');
	}
	return {
		id: cells.id,
		date: cells.date,
		asset: cells.asset,
		category: cells.category,
		amountCents: parseCents(cells.amountCents ?? ''),
		createdAt: cells.createdAt,
		updatedAt: optional(cells.updatedAt),
	};
}
