import type {
	Account,
	CycleRule,
	FinancePluginData,
	FinanceSettings,
	PendingMove,
	TransactionCategory,
} from '../types';
import { DEFAULT_CYCLE_RULE, validateCycleRules } from '../domain/cycle';
import { isLocalDate } from '../domain/date';

const DEFAULT_ACCOUNTS: Account[] = [
	{ id: 'cash', name: 'Dinheiro', kind: 'cash', archived: false },
	{ id: 'bank', name: 'Conta bancária', kind: 'bank', archived: false },
	{ id: 'credit-card', name: 'Cartão de crédito', kind: 'credit-card', dueDay: 10, archived: false },
];

const DEFAULT_CATEGORIES: TransactionCategory[] = [
	{ id: 'salary', name: 'Salário', kind: 'income', archived: false },
	{ id: 'extra-income', name: 'Renda extra', kind: 'income', archived: false },
	{ id: 'food', name: 'Alimentação', kind: 'expense', archived: false },
	{ id: 'housing', name: 'Moradia', kind: 'expense', archived: false },
	{ id: 'transport', name: 'Transporte', kind: 'expense', archived: false },
	{ id: 'health', name: 'Saúde', kind: 'expense', archived: false },
	{ id: 'leisure', name: 'Lazer', kind: 'expense', archived: false },
	{ id: 'other-expense', name: 'Outros', kind: 'expense', archived: false },
];

export const DEFAULT_SETTINGS: FinanceSettings = {
	schemaVersion: 1,
	dataRoot: 'Financas',
	accounts: DEFAULT_ACCOUNTS,
	categories: DEFAULT_CATEGORIES,
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

function normalizeAccounts(value: unknown): Account[] {
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
		name: account.name.trim(),
		archived: Boolean(account.archived),
		dueDay: account.kind === 'credit-card' && Number.isInteger(account.dueDay)
			? Math.min(31, Math.max(1, account.dueDay ?? 10))
			: undefined,
	}));
	return result.length > 0 ? result : DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
}

function normalizeCategories(value: unknown): TransactionCategory[] {
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
	}).map((category) => ({ ...category, name: category.name.trim(), archived: Boolean(category.archived) }));
	return result.length > 0 ? result : DEFAULT_CATEGORIES.map((category) => ({ ...category }));
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
	return {
		settings: {
			schemaVersion: 1,
			dataRoot: typeof rawSettings.dataRoot === 'string' && rawSettings.dataRoot.trim()
				? rawSettings.dataRoot.trim()
				: DEFAULT_SETTINGS.dataRoot,
			accounts: normalizeAccounts(rawSettings.accounts),
			categories: normalizeCategories(rawSettings.categories),
			cycleRules: normalizeCycleRules(rawSettings.cycleRules),
		},
		pendingMove: normalizePendingMove(data.pendingMove),
	};
}
