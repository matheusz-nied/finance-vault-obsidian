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
		throw new Error(`Invalid ${field}.`);
	}
}

export function validateTransaction(transaction: Transaction, settings: FinanceSettings): Transaction {
	if (!transaction.id.trim()) {
		throw new Error('The transaction must have an ID.');
	}
	if (!isLocalDate(transaction.date)) {
		throw new Error('The transaction date is invalid.');
	}
	if (!transaction.description.trim()) {
		throw new Error('Enter a description.');
	}
	assertMoneyCents(transaction.amountCents);
	requireTimestamp(transaction.createdAt, 'creation date');
	if (transaction.updatedAt) {
		requireTimestamp(transaction.updatedAt, 'update date');
	}
	const accountIds = new Set(settings.accounts.map((account) => account.id));
	const categories = new Map(settings.categories.map((category) => [category.id, category]));
	if (!transaction.accountId || !accountIds.has(transaction.accountId)) {
		throw new Error('Select a valid account.');
	}
	if (transaction.type === 'expense') {
		const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined;
		if (!category || category.kind !== 'expense') {
			throw new Error('Select a valid expense category.');
		}
	}
	if (transaction.categoryId) {
		const category = categories.get(transaction.categoryId);
		if (!category || category.kind !== transaction.type) {
			throw new Error('The category does not match the transaction type.');
		}
	}
	if (transaction.fixedTemplateId !== undefined && !transaction.fixedTemplateId.trim()) {
		throw new Error('The recurring template ID is invalid.');
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
			throw new Error('The installment data is invalid or incomplete.');
		}
		assertMoneyCents(transaction.installmentTotalCents ?? 0);
		const account = settings.accounts.find((candidate) => candidate.id === transaction.accountId);
		if (transaction.type !== 'expense' || account?.kind !== 'credit-card') {
			throw new Error('Installment plans must be expenses on a credit card.');
		}
		if (transaction.fixedTemplateId) {
			throw new Error('An entry cannot be both recurring and an installment.');
		}
	}
	return transaction;
}

export function validateFixedTemplate(template: FixedTemplate, settings: FinanceSettings): FixedTemplate {
	if (!template.id.trim()) {
		throw new Error('The recurring template must have an ID.');
	}
	if (!template.name.trim()) {
		throw new Error('Enter a name for the recurring template.');
	}
	assertMoneyCents(template.amountCents);
	if (!settings.accounts.some((account) => account.id === template.accountId)) {
		throw new Error('Select a valid account for the recurring template.');
	}
	const category = template.categoryId
		? settings.categories.find((candidate) => candidate.id === template.categoryId)
		: undefined;
	if (template.type === 'expense' && (!category || category.kind !== 'expense')) {
		throw new Error('Select a valid expense category for the recurring template.');
	}
	if (category && category.kind !== template.type) {
		throw new Error('The template category does not match the entry type.');
	}
	return template;
}

export function validateInvestment(contribution: InvestmentContribution): InvestmentContribution {
	if (!contribution.id.trim()) {
		throw new Error('The investment contribution must have an ID.');
	}
	if (!isLocalDate(contribution.date)) {
		throw new Error('The investment contribution date is invalid.');
	}
	if (!contribution.asset.trim()) {
		throw new Error('Enter an asset.');
	}
	if (!INVESTMENT_CATEGORIES.has(contribution.category)) {
		throw new Error('Invalid investment category.');
	}
	assertMoneyCents(contribution.amountCents);
	requireTimestamp(contribution.createdAt, 'creation date');
	if (contribution.updatedAt) {
		requireTimestamp(contribution.updatedAt, 'update date');
	}
	return contribution;
}
