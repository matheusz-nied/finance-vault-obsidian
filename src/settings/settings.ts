import type {
	Account,
	CycleRule,
	FinancePluginData,
	FinanceSettings,
	FixedTemplate,
	PendingMove,
	TransactionCategory,
} from '../types';
import { DEFAULT_CYCLE_RULE, validateCycleRules } from '../domain/cycle';
import { isLocalDate } from '../domain/date';

const DEFAULT_ACCOUNTS: Account[] = [
	{ id: 'cash', name: 'Cash', kind: 'cash', archived: false },
	{ id: 'bank', name: 'Bank account', kind: 'bank', archived: false },
	{ id: 'credit-card', name: 'Credit card', kind: 'credit-card', dueDay: 10, archived: false },
];

const DEFAULT_CATEGORIES: TransactionCategory[] = [
	{ id: 'salary', name: 'Salary', kind: 'income', archived: false },
	{ id: 'extra-income', name: 'Extra income', kind: 'income', archived: false },
	{ id: 'food', name: 'Food', kind: 'expense', archived: false },
	{ id: 'housing', name: 'Housing', kind: 'expense', archived: false },
	{ id: 'transport', name: 'Transportation', kind: 'expense', archived: false },
	{ id: 'health', name: 'Health', kind: 'expense', archived: false },
	{ id: 'leisure', name: 'Leisure', kind: 'expense', archived: false },
	{ id: 'other-expense', name: 'Other', kind: 'expense', archived: false },
];

const LEGACY_DEFAULT_ACCOUNT_NAMES: Record<string, string> = {
	cash: 'Dinheiro',
	bank: 'Conta bancária',
	'credit-card': 'Cartão de crédito',
};

const LEGACY_DEFAULT_CATEGORY_NAMES: Record<string, string> = {
	salary: 'Salário',
	'extra-income': 'Renda extra',
	food: 'Alimentação',
	housing: 'Moradia',
	transport: 'Transporte',
	health: 'Saúde',
	leisure: 'Lazer',
	'other-expense': 'Outros',
};

export const DEFAULT_SETTINGS: FinanceSettings = {
	schemaVersion: 3,
	dataRoot: 'Financas',
	accounts: DEFAULT_ACCOUNTS,
	categories: DEFAULT_CATEGORIES,
	fixedTemplates: [],
	cycleRules: [DEFAULT_CYCLE_RULE],
};

function normalizePendingMove(value: unknown): PendingMove | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	const move = value as Partial<PendingMove>;
	if ((move.entity !== 'transaction' && move.entity !== 'investment')
		|| (move.phase !== 'prepared' && move.phase !== 'inserted')
		|| typeof move.id !== 'string'
		|| typeof move.fromDate !== 'string'
		|| typeof move.toDate !== 'string'
		|| !isLocalDate(move.fromDate)
		|| !isLocalDate(move.toDate)
		|| !move.payload
		|| typeof move.payload !== 'object'
		|| move.payload.id !== move.id
		|| move.payload.date !== move.toDate) {
		return undefined;
	}
	return move as PendingMove;
}

function normalizeAccounts(value: unknown, translateLegacyDefaults: boolean): Account[] {
	if (!Array.isArray(value)) {
		return DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
	}
	const result = value.filter((item): item is Account => {
		if (!item || typeof item !== 'object') {
			return false;
		}
		const account = item as Partial<Account>;
		return typeof account.id === 'string'
			&& typeof account.name === 'string'
			&& (account.kind === 'cash' || account.kind === 'bank' || account.kind === 'credit-card');
	}).map((account) => ({
		...account,
		name: translateLegacyDefaults && account.name.trim() === LEGACY_DEFAULT_ACCOUNT_NAMES[account.id]
			? DEFAULT_ACCOUNTS.find((candidate) => candidate.id === account.id)?.name ?? account.name.trim()
			: account.name.trim(),
		archived: Boolean(account.archived),
		dueDay: account.kind === 'credit-card' && Number.isInteger(account.dueDay)
			? Math.min(31, Math.max(1, account.dueDay ?? 10))
			: undefined,
	}));
	return result.length > 0 ? result : DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
}

function normalizeCategories(value: unknown, translateLegacyDefaults: boolean): TransactionCategory[] {
	if (!Array.isArray(value)) {
		return DEFAULT_CATEGORIES.map((category) => ({ ...category }));
	}
	const result = value.filter((item): item is TransactionCategory => {
		if (!item || typeof item !== 'object') {
			return false;
		}
		const category = item as Partial<TransactionCategory>;
		return typeof category.id === 'string'
			&& typeof category.name === 'string'
			&& (category.kind === 'income' || category.kind === 'expense');
	}).map((category) => ({
		...category,
		name: translateLegacyDefaults && category.name.trim() === LEGACY_DEFAULT_CATEGORY_NAMES[category.id]
			? DEFAULT_CATEGORIES.find((candidate) => candidate.id === category.id)?.name ?? category.name.trim()
			: category.name.trim(),
		archived: Boolean(category.archived),
	}));
	return result.length > 0 ? result : DEFAULT_CATEGORIES.map((category) => ({ ...category }));
}

function normalizeFixedTemplates(value: unknown): FixedTemplate[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const ids = new Set<string>();
	return value.filter((item): item is FixedTemplate => {
		if (!item || typeof item !== 'object') {
			return false;
		}
		const template = item as Partial<FixedTemplate>;
		if (typeof template.id !== 'string'
			|| !template.id.trim()
			|| ids.has(template.id)
			|| typeof template.name !== 'string'
			|| !template.name.trim()
			|| (template.type !== 'income' && template.type !== 'expense')
			|| typeof template.accountId !== 'string'
			|| !template.accountId
			|| !Number.isSafeInteger(template.amountCents)
			|| (template.amountCents ?? 0) <= 0) {
			return false;
		}
		ids.add(template.id);
		return true;
	}).map((template) => ({
		...template,
		name: template.name.trim(),
		categoryId: template.categoryId?.trim() || undefined,
		archived: Boolean(template.archived),
	}));
}

function normalizeCycleRules(value: unknown): CycleRule[] {
	if (!Array.isArray(value)) {
		return [{ ...DEFAULT_CYCLE_RULE }];
	}
	try {
		const candidate = value.filter((item): item is CycleRule => {
			if (!item || typeof item !== 'object') {
				return false;
			}
			const rule = item as Partial<CycleRule>;
			return typeof rule.id === 'string'
				&& typeof rule.effectiveFrom === 'string'
				&& typeof rule.startDay === 'number';
		});
		const withBaseline = candidate.some((rule) => rule.effectiveFrom === DEFAULT_CYCLE_RULE.effectiveFrom)
			? candidate
			: [DEFAULT_CYCLE_RULE, ...candidate];
		return validateCycleRules(withBaseline);
	} catch {
		return [{ ...DEFAULT_CYCLE_RULE }];
	}
}

export function normalizePluginData(value: unknown): FinancePluginData {
	const data = value && typeof value === 'object' ? value as Partial<FinancePluginData> : {};
	const rawSettings = data.settings && typeof data.settings === 'object'
		? data.settings as Partial<FinanceSettings>
		: {};
	const translateLegacyDefaults = typeof rawSettings.schemaVersion !== 'number' || rawSettings.schemaVersion < 3;
	return {
		settings: {
			schemaVersion: 3,
			dataRoot: typeof rawSettings.dataRoot === 'string' && rawSettings.dataRoot.trim()
				? rawSettings.dataRoot.trim()
				: DEFAULT_SETTINGS.dataRoot,
			accounts: normalizeAccounts(rawSettings.accounts, translateLegacyDefaults),
			categories: normalizeCategories(rawSettings.categories, translateLegacyDefaults),
			fixedTemplates: normalizeFixedTemplates(rawSettings.fixedTemplates),
			cycleRules: normalizeCycleRules(rawSettings.cycleRules),
		},
		pendingMove: normalizePendingMove(data.pendingMove),
	};
}
