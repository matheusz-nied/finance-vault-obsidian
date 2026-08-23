export type LocalDate = string;
export type MoneyCents = number;

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountKind = 'cash' | 'bank' | 'credit-card';
export type CategoryKind = 'income' | 'expense';
export type ReportMode = 'month' | 'cycle' | 'year';
export type InvestmentCategory =
	| 'fixed-income'
	| 'stock'
	| 'reit'
	| 'crypto'
	| 'etf'
	| 'other';

export interface Account {
	id: string;
	name: string;
	kind: AccountKind;
	dueDay?: number;
	archived: boolean;
}

export interface TransactionCategory {
	id: string;
	name: string;
	kind: CategoryKind;
	archived: boolean;
}

export interface CycleRule {
	id: string;
	effectiveFrom: LocalDate;
	startDay: number;
}

export interface Transaction {
	id: string;
	date: LocalDate;
	type: TransactionType;
	accountId?: string;
	fromAccountId?: string;
	toAccountId?: string;
	categoryId?: string;
	description: string;
	amountCents: MoneyCents;
	createdAt: string;
	updatedAt?: string;
}

export interface InvestmentContribution {
	id: string;
	date: LocalDate;
	asset: string;
	category: InvestmentCategory;
	amountCents: MoneyCents;
	createdAt: string;
	updatedAt?: string;
}

export interface DateRange {
	start: LocalDate;
	end: LocalDate;
}

export interface PeriodReport extends DateRange {
	receivedCents: MoneyCents;
	spentCents: MoneyCents;
	contributedCents: MoneyCents;
	balanceCents: MoneyCents;
	spentByCategory: Record<string, MoneyCents>;
}

export interface StorageDiagnostic {
	path: string;
	message: string;
	line?: number;
}

export interface RepositoryQuery<T> {
	records: T[];
	diagnostics: StorageDiagnostic[];
}

export type MoveEntity = 'transaction' | 'investment';
export type MovePhase = 'prepared' | 'inserted';

export interface PendingMove {
	entity: MoveEntity;
	id: string;
	fromDate: LocalDate;
	toDate: LocalDate;
	payload: Transaction | InvestmentContribution;
	phase: MovePhase;
}

export interface FinanceSettings {
	schemaVersion: 1;
	dataRoot: string;
	accounts: Account[];
	categories: TransactionCategory[];
	cycleRules: CycleRule[];
}

export interface FinancePluginData {
	settings: FinanceSettings;
	pendingMove?: PendingMove;
}
