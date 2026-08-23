import type {
	FinanceSettings,
	FixedTemplate,
	InvestmentContribution,
	InvestmentCategory,
	Transaction,
} from '../types';
import { isLocalDate } from './date';
import { MAX_INSTALLMENT_COUNT } from './installments';
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
	const installmentFields = [
		transaction.installmentPlanId,
		transaction.installmentNumber,
		transaction.installmentCount,
		transaction.installmentTotalCents,
		transaction.installmentPurchaseDate,
	];
	const hasInstallment = installmentFields.some((value) => value !== undefined);
	if (hasInstallment) {
		if (installmentFields.some((value) => value === undefined)
			|| !transaction.installmentPlanId?.trim()
			|| !Number.isInteger(transaction.installmentNumber)
			|| !Number.isInteger(transaction.installmentCount)
			|| (transaction.installmentCount ?? 0) < 2
			|| (transaction.installmentCount ?? 0) > MAX_INSTALLMENT_COUNT
			|| (transaction.installmentNumber ?? 0) < 1
			|| (transaction.installmentNumber ?? 0) > (transaction.installmentCount ?? 0)
			|| !isLocalDate(transaction.installmentPurchaseDate ?? '')) {
			throw new Error('Os dados do parcelamento são inválidos ou estão incompletos.');
		}
		assertMoneyCents(transaction.installmentTotalCents ?? 0);
		const account = settings.accounts.find((candidate) => candidate.id === transaction.accountId);
		if (transaction.type !== 'expense' || account?.kind !== 'credit-card') {
			throw new Error('Parcelamentos precisam ser despesas em um cartão de crédito.');
		}
		if (transaction.fixedTemplateId) {
			throw new Error('Um lançamento não pode ser fixo e parcelado ao mesmo tempo.');
		}
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
