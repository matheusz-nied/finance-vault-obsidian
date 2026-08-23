import type {
	FinanceSettings,
	FixedTemplate,
	InvestmentContribution,
	InvestmentCategory,
	Transaction,
} from '../types';
import { isLocalDate } from './date';
import { assertMoneyCents } from './money';

const INVESTMENT_CATEGORIES = new Set<InvestmentCategory>([
	'fixed-income',
	'stock',
	'reit',
	'crypto',
	'etf',
	'other',
]);

function requireTimestamp(value: string, field: string): void {
	if (!value || Number.isNaN(Date.parse(value))) {
		throw new Error(`${field} inválido.`);
	}
}

export function validateTransaction(transaction: Transaction, settings: FinanceSettings): Transaction {
	if (!transaction.id.trim()) {
		throw new Error('A transação precisa de um ID.');
	}
	if (!isLocalDate(transaction.date)) {
		throw new Error('A data da transação é inválida.');
	}
	if (!transaction.description.trim()) {
		throw new Error('Informe uma descrição.');
	}
	assertMoneyCents(transaction.amountCents);
	requireTimestamp(transaction.createdAt, 'Data de criação');
	if (transaction.updatedAt) {
		requireTimestamp(transaction.updatedAt, 'Data de atualização');
	}
	const accountIds = new Set(settings.accounts.map((account) => account.id));
	const categories = new Map(settings.categories.map((category) => [category.id, category]));
	if (!transaction.accountId || !accountIds.has(transaction.accountId)) {
		throw new Error('Selecione uma conta válida.');
	}
	if (transaction.type === 'expense') {
		const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined;
		if (!category || category.kind !== 'expense') {
			throw new Error('Selecione uma categoria de despesa válida.');
		}
	}
	if (transaction.categoryId) {
		const category = categories.get(transaction.categoryId);
		if (!category || category.kind !== transaction.type) {
			throw new Error('A categoria não corresponde ao tipo da transação.');
		}
	}
	if (transaction.fixedTemplateId !== undefined && !transaction.fixedTemplateId.trim()) {
		throw new Error('O identificador do modelo fixo é inválido.');
	}
	return transaction;
}

export function validateFixedTemplate(template: FixedTemplate, settings: FinanceSettings): FixedTemplate {
	if (!template.id.trim()) {
		throw new Error('O modelo fixo precisa de um ID.');
	}
	if (!template.name.trim()) {
		throw new Error('Informe um nome para o modelo fixo.');
	}
	assertMoneyCents(template.amountCents);
	if (!settings.accounts.some((account) => account.id === template.accountId)) {
		throw new Error('Selecione uma conta válida para o modelo fixo.');
	}
	const category = template.categoryId
		? settings.categories.find((candidate) => candidate.id === template.categoryId)
		: undefined;
	if (template.type === 'expense' && (!category || category.kind !== 'expense')) {
		throw new Error('Selecione uma categoria de despesa válida para o modelo fixo.');
	}
	if (category && category.kind !== template.type) {
		throw new Error('A categoria do modelo não corresponde ao tipo do lançamento.');
	}
	return template;
}

export function validateInvestment(contribution: InvestmentContribution): InvestmentContribution {
	if (!contribution.id.trim()) {
		throw new Error('O aporte precisa de um ID.');
	}
	if (!isLocalDate(contribution.date)) {
		throw new Error('A data do aporte é inválida.');
	}
	if (!contribution.asset.trim()) {
		throw new Error('Informe o ativo.');
	}
	if (!INVESTMENT_CATEGORIES.has(contribution.category)) {
		throw new Error('Categoria de investimento inválida.');
	}
	assertMoneyCents(contribution.amountCents);
	requireTimestamp(contribution.createdAt, 'Data de criação');
	if (contribution.updatedAt) {
		requireTimestamp(contribution.updatedAt, 'Data de atualização');
	}
	return contribution;
}
