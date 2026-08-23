import type { InvestmentContribution, Transaction } from '../types';
import { isLocalDate } from '../domain/date';
import { assertMoneyCents } from '../domain/money';
import type { MarkdownTableSchema } from './markdownTable';

export const TRANSACTION_SCHEMA: MarkdownTableSchema = {
	kind: 'transactions',
	title: 'Transações',
	columns: [
		'id',
		'date',
		'type',
		'accountId',
		'categoryId',
		'fixedTemplateId',
		'description',
		'amountCents',
		'createdAt',
		'updatedAt',
	],
	requiredColumns: ['id', 'date', 'type', 'description', 'amountCents', 'createdAt'],
};

export const INVESTMENT_SCHEMA: MarkdownTableSchema = {
	kind: 'investments',
	title: 'Aportes',
	columns: ['id', 'date', 'asset', 'category', 'amountCents', 'createdAt', 'updatedAt'],
	requiredColumns: ['id', 'date', 'asset', 'category', 'amountCents', 'createdAt'],
};

function parseCents(value: string): number {
	if (!/^\d+$/.test(value)) {
		throw new Error('amountCents deve conter apenas um inteiro positivo.');
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
		description: transaction.description,
		amountCents: String(transaction.amountCents),
		createdAt: transaction.createdAt,
		updatedAt: transaction.updatedAt ?? '',
	};
}

export function transactionFromCells(cells: Record<string, string>): Transaction {
	if (!cells.date || !isLocalDate(cells.date)) {
		throw new Error('Data inválida.');
	}
	if (cells.type !== 'income' && cells.type !== 'expense') {
		throw new Error('Tipo de transação inválido.');
	}
	if (!cells.id || !cells.description || !cells.createdAt) {
		throw new Error('Campos obrigatórios ausentes.');
	}
	return {
		id: cells.id,
		date: cells.date,
		type: cells.type,
		accountId: optional(cells.accountId),
		categoryId: optional(cells.categoryId),
		fixedTemplateId: optional(cells.fixedTemplateId),
		description: cells.description,
		amountCents: parseCents(cells.amountCents ?? ''),
		createdAt: cells.createdAt,
		updatedAt: optional(cells.updatedAt),
	};
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
		throw new Error('Data inválida.');
	}
	if (!cells.id || !cells.asset || !cells.createdAt) {
		throw new Error('Campos obrigatórios ausentes.');
	}
	if (
		cells.category !== 'fixed-income'
		&& cells.category !== 'stock'
		&& cells.category !== 'reit'
		&& cells.category !== 'crypto'
		&& cells.category !== 'etf'
		&& cells.category !== 'other'
	) {
		throw new Error('Categoria de investimento inválida.');
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
