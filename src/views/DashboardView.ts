import { ItemView, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import { addMonths, formatLocalDate, localDate, monthKey, monthRange, parseLocalDate, todayLocal, yearRange } from '../domain/date';
import { cycleForDate, nextCycle, previousCycle } from '../domain/cycle';
import { fixedTemplatesForMonth } from '../domain/fixedTemplates';
import { formatBrl } from '../domain/money';
import { calculateReport } from '../domain/reports';
import { ConfirmModal } from '../modals/ConfirmModal';
import { InvestmentModal } from '../modals/InvestmentModal';
import { TransactionModal, type TransactionModalOptions } from '../modals/TransactionModal';
import type {
	DateRange,
	InvestmentCategory,
	InvestmentContribution,
	PeriodReport,
	ReportMode,
	StorageDiagnostic,
	Transaction,
} from '../types';
import type FinanceVaultPlugin from '../main';

export const FINANCE_VAULT_VIEW = 'finance-vault-dashboard';

const INVESTMENT_LABELS: Record<InvestmentCategory, string> = {
	'fixed-income': 'Renda fixa',
	stock: 'Ação',
	reit: 'FII',
	crypto: 'Cripto',
	etf: 'ETF',
	other: 'Outro',
};

export class DashboardView extends ItemView {
	private mode: ReportMode = 'cycle';
	private anchor = todayLocal();
	private transactionTypeFilter = 'all';
	private search = '';
	private renderVersion = 0;

	constructor(leaf: WorkspaceLeaf, private readonly financePlugin: FinanceVaultPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return FINANCE_VAULT_VIEW;
	}

	getDisplayText(): string {
		return 'Finance vault';
	}

	getIcon(): string {
		return 'wallet-cards';
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass('finance-vault-view');
		await this.refresh();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	async refresh(): Promise<void> {
		const version = ++this.renderVersion;
		const container = this.contentEl;
		container.empty();
		container.createDiv({ cls: 'finance-vault-loading', text: 'Carregando dados financeiros…' });
		const period = this.currentPeriod();
		const fixedPeriod = monthRange(this.anchor);
		try {
			const transactionRequest = this.financePlugin.transactions.listRange(period);
			const fixedTransactionRequest = period.start === fixedPeriod.start && period.end === fixedPeriod.end
				? transactionRequest
				: this.financePlugin.transactions.listRange(fixedPeriod);
			const [transactionQuery, investmentQuery, fixedTransactionQuery] = await Promise.all([
				transactionRequest,
				this.financePlugin.investments.listRange(period),
				fixedTransactionRequest,
			]);
			if (version !== this.renderVersion) {
				return;
			}
			const report = calculateReport(period, transactionQuery.records, investmentQuery.records);
			container.empty();
			this.renderHeader(container, period);
			const fixedDiagnostics = fixedTransactionQuery === transactionQuery ? [] : fixedTransactionQuery.diagnostics;
			this.renderDiagnostics(container, [
				...transactionQuery.diagnostics,
				...investmentQuery.diagnostics,
				...fixedDiagnostics,
			]);
			this.renderSummary(container, report);
			this.renderFixedTemplates(container, fixedTransactionQuery.records);
			if (this.mode === 'year') {
				this.renderYearSummary(container, transactionQuery.records, investmentQuery.records);
			}
			this.renderTransactions(container, transactionQuery.records);
			this.renderInvestments(container, investmentQuery.records);
		} catch (error) {
			container.empty();
			container.createEl('h2', { text: 'Finance vault' });
			container.createDiv({
				cls: 'finance-vault-error',
				text: error instanceof Error ? error.message : 'Não foi possível carregar os dados.',
			});
		}
	}

	private currentPeriod(): DateRange {
		if (this.mode === 'month') {
			return monthRange(this.anchor);
		}
		if (this.mode === 'year') {
			return yearRange(this.anchor);
		}
		return cycleForDate(this.anchor, this.financePlugin.settings.cycleRules);
	}

	private renderHeader(container: HTMLElement, period: DateRange): void {
		const header = container.createDiv({ cls: 'finance-vault-header' });
		const title = header.createDiv();
		title.createEl('h2', { text: 'Finance vault' });
		title.createEl('p', {
			text: `${formatLocalDate(period.start)} — ${formatLocalDate(period.end)}`,
			cls: 'finance-vault-period',
		});
		const actions = header.createDiv({ cls: 'finance-vault-actions' });
		this.createActionButton(actions, 'plus-circle', 'Nova transação', () => this.openTransaction());
		this.createActionButton(actions, 'landmark', 'Novo aporte', () => this.openInvestment());

		const modeBar = container.createDiv({ cls: 'finance-vault-mode-bar' });
		for (const [mode, label] of [['month', 'Mês'], ['cycle', 'Ciclo'], ['year', 'Ano']] as const) {
			const button = modeBar.createEl('button', { text: label, cls: 'finance-vault-mode-button' });
			button.toggleClass('is-active', this.mode === mode);
			button.setAttr('aria-pressed', String(this.mode === mode));
			button.addEventListener('click', () => {
				this.mode = mode;
				void this.refresh();
			});
		}
		const navigation = modeBar.createDiv({ cls: 'finance-vault-navigation' });
		this.createIconButton(navigation, 'chevron-left', 'Período anterior', () => this.movePeriod(-1));
		const todayButton = navigation.createEl('button', { text: 'Hoje' });
		todayButton.addEventListener('click', () => {
			this.anchor = todayLocal();
			void this.refresh();
		});
		this.createIconButton(navigation, 'chevron-right', 'Próximo período', () => this.movePeriod(1));
	}

	private movePeriod(direction: -1 | 1): void {
		if (this.mode === 'month') {
			this.anchor = addMonths(this.anchor, direction);
		} else if (this.mode === 'year') {
			this.anchor = addMonths(this.anchor, direction * 12);
		} else {
			const current = this.currentPeriod();
			const target = direction < 0
				? previousCycle(current, this.financePlugin.settings.cycleRules)
				: nextCycle(current, this.financePlugin.settings.cycleRules);
			this.anchor = target.start;
		}
		void this.refresh();
	}

	private renderDiagnostics(container: HTMLElement, diagnostics: readonly StorageDiagnostic[]): void {
		if (diagnostics.length === 0) {
			return;
		}
		const details = container.createEl('details', { cls: 'finance-vault-diagnostics' });
		details.createEl('summary', { text: `${diagnostics.length} aviso(s) nos arquivos Markdown` });
		const list = details.createEl('ul');
		for (const diagnostic of diagnostics) {
			list.createEl('li', {
				text: `${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`,
			});
		}
	}

	private renderSummary(container: HTMLElement, report: PeriodReport): void {
		const cards = container.createDiv({ cls: 'finance-vault-summary' });
		this.renderMetric(cards, 'Recebido', report.receivedCents, 'is-positive');
		this.renderMetric(cards, 'Gasto', report.spentCents, 'is-negative');
		this.renderMetric(cards, 'Aportado', report.contributedCents, 'is-investment');
		this.renderMetric(cards, 'Saldo', report.balanceCents, report.balanceCents >= 0 ? 'is-positive' : 'is-negative');

		const categories = Object.entries(report.spentByCategory).sort((left, right) => right[1] - left[1]);
		if (categories.length > 0) {
			const section = container.createEl('section', { cls: 'finance-vault-section' });
			section.createEl('h3', { text: 'Gastos por categoria' });
			const list = section.createDiv({ cls: 'finance-vault-category-list' });
			for (const [categoryId, amount] of categories) {
				const item = list.createDiv({ cls: 'finance-vault-category-item' });
				item.createSpan({ text: this.categoryName(categoryId) });
				item.createEl('strong', { text: formatBrl(amount) });
			}
		}

		const creditCards = this.financePlugin.settings.accounts.filter((account) => account.kind === 'credit-card'
			&& (!account.archived || Boolean(report.spentByAccount[account.id])));
		if (creditCards.length > 0) {
			const section = container.createEl('section', { cls: 'finance-vault-section' });
			section.createEl('h3', { text: 'Gastos por cartão' });
			const list = section.createDiv({ cls: 'finance-vault-category-list' });
			for (const account of creditCards) {
				const item = list.createDiv({ cls: 'finance-vault-category-item' });
				item.createSpan({ text: account.name });
				item.createEl('strong', { text: formatBrl(report.spentByAccount[account.id] ?? 0) });
			}
		}
	}

	private renderFixedTemplates(container: HTMLElement, transactions: readonly Transaction[]): void {
		const items = fixedTemplatesForMonth(this.financePlugin.settings.fixedTemplates, transactions, this.anchor);
		if (items.length === 0) {
			return;
		}
		const { year, month } = parseLocalDate(this.anchor);
		const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
			.format(new Date(year, month - 1, 1));
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: `Fixos de ${monthLabel}` });
		const launched = items.filter((item) => item.transactions.length > 0).length;
		section.createEl('p', {
			cls: 'finance-vault-period',
			text: `${launched} de ${items.length} modelo(s) lançado(s) neste mês.`,
		});
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		for (const item of items) {
			const row = list.createDiv({ cls: 'finance-vault-record' });
			const indicator = row.createSpan({ cls: 'finance-vault-fixed-indicator' });
			setIcon(indicator, item.transactions.length > 0 ? 'circle-check' : 'circle');
			const body = row.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: item.template.name });
			const amount = item.transactions.length > 0 ? item.launchedCents : item.template.amountCents;
			const account = this.accountName(item.template.accountId);
			body.createSpan({
				text: `${item.transactions.length > 0 ? 'Lançado' : 'Não lançado'} · ${account} · ${formatBrl(amount)}`,
			});
			if (item.transactions.length > 0) {
				this.createIconButton(row, 'pencil', `Editar ${item.template.name}`, () => {
					this.openTransaction(item.transactions[0]);
				});
			} else {
				this.createActionButton(row, 'plus-circle', 'Lançar', () => {
					this.openTransaction(undefined, {
						fixedTemplateId: item.template.id,
						date: `${monthKey(this.anchor)}-01`,
					});
				});
			}
		}
	}

	private renderMetric(container: HTMLElement, label: string, value: number, className: string): void {
		const card = container.createDiv({ cls: `finance-vault-metric ${className}` });
		card.createSpan({ text: label });
		card.createEl('strong', { text: formatBrl(value) });
	}

	private renderYearSummary(
		container: HTMLElement,
		transactions: readonly Transaction[],
		contributions: readonly InvestmentContribution[],
	): void {
		const { year } = parseLocalDate(this.anchor);
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Resumo mensal' });
		const list = section.createDiv({ cls: 'finance-vault-month-grid' });
		for (let month = 1; month <= 12; month += 1) {
			const period = monthRange(localDate(year, month, 1));
			const report = calculateReport(period, transactions, contributions);
			const card = list.createDiv({ cls: 'finance-vault-month-card' });
			card.createEl('strong', { text: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(year, month - 1, 1)) });
			card.createSpan({ text: `Recebido: ${formatBrl(report.receivedCents)}` });
			card.createSpan({ text: `Gasto: ${formatBrl(report.spentCents)}` });
			card.createSpan({ text: `Aportado: ${formatBrl(report.contributedCents)}` });
			card.createSpan({ text: `Saldo: ${formatBrl(report.balanceCents)}` });
		}
	}

	private renderTransactions(container: HTMLElement, transactions: readonly Transaction[]): void {
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Transações' });
		const filters = section.createDiv({ cls: 'finance-vault-filters' });
		const search = filters.createEl('input', { type: 'search', placeholder: 'Filtrar descrição…' });
		search.value = this.search;
		search.setAttr('aria-label', 'Filtrar transações por descrição');
		search.addEventListener('change', () => {
			this.search = search.value;
			void this.refresh();
		});
		const type = filters.createEl('select');
		type.setAttr('aria-label', 'Filtrar transações por tipo');
		for (const [value, label] of [['all', 'Todos os tipos'], ['income', 'Receitas'], ['expense', 'Despesas']]) {
			type.createEl('option', { value, text: label });
		}
		type.value = this.transactionTypeFilter;
		type.addEventListener('change', () => {
			this.transactionTypeFilter = type.value;
			void this.refresh();
		});
		const query = this.search.trim().toLocaleLowerCase('pt-BR');
		const filtered = transactions
			.filter((item) => this.transactionTypeFilter === 'all' || item.type === this.transactionTypeFilter)
			.filter((item) => !query || item.description.toLocaleLowerCase('pt-BR').includes(query))
			.sort((left, right) => right.date.localeCompare(left.date));
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		if (filtered.length === 0) {
			list.createDiv({ cls: 'finance-vault-empty', text: 'Nenhuma transação neste período.' });
			return;
		}
		for (const transaction of filtered) {
			const item = list.createDiv({ cls: 'finance-vault-record' });
			const body = item.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: transaction.description });
			const typeLabel = transaction.type === 'income' ? 'Receita' : 'Despesa';
			const accountLabel = this.accountName(transaction.accountId);
			body.createSpan({ text: `${formatLocalDate(transaction.date)} · ${typeLabel} · ${accountLabel}` });
			const amount = item.createEl('strong', {
				text: formatBrl(transaction.amountCents),
				cls: transaction.type === 'income' ? 'is-positive' : 'is-negative',
			});
			amount.setAttr('aria-label', `Valor ${formatBrl(transaction.amountCents)}`);
			const actions = item.createDiv({ cls: 'finance-vault-record-actions' });
			this.createIconButton(actions, 'pencil', 'Editar transação', () => this.openTransaction(transaction));
			this.createIconButton(actions, 'trash-2', 'Excluir transação', () => {
				new ConfirmModal(this.app, `Excluir “${transaction.description}”?`, async () => {
					try {
						await this.financePlugin.transactions.delete(transaction.id, transaction.date);
						await this.refresh();
					} catch (error) {
						new Notice(error instanceof Error ? error.message : 'Não foi possível excluir.');
					}
				}).open();
			});
		}
	}

	private renderInvestments(container: HTMLElement, contributions: readonly InvestmentContribution[]): void {
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Aportes' });
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		if (contributions.length === 0) {
			list.createDiv({ cls: 'finance-vault-empty', text: 'Nenhum aporte neste período.' });
			return;
		}
		for (const contribution of [...contributions].sort((left, right) => right.date.localeCompare(left.date))) {
			const item = list.createDiv({ cls: 'finance-vault-record' });
			const body = item.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: contribution.asset });
			body.createSpan({ text: `${formatLocalDate(contribution.date)} · ${INVESTMENT_LABELS[contribution.category]}` });
			item.createEl('strong', { text: formatBrl(contribution.amountCents), cls: 'is-investment' });
			const actions = item.createDiv({ cls: 'finance-vault-record-actions' });
			this.createIconButton(actions, 'pencil', 'Editar aporte', () => this.openInvestment(contribution));
			this.createIconButton(actions, 'trash-2', 'Excluir aporte', () => {
				new ConfirmModal(this.app, `Excluir o aporte em “${contribution.asset}”?`, async () => {
					try {
						await this.financePlugin.investments.delete(contribution.id, contribution.date);
						await this.refresh();
					} catch (error) {
						new Notice(error instanceof Error ? error.message : 'Não foi possível excluir.');
					}
				}).open();
			});
		}
	}

	private openTransaction(initial?: Transaction, options: TransactionModalOptions = {}): void {
		new TransactionModal(this.app, this.financePlugin.settings, initial, async ({ transaction, updateFixedTemplate }) => {
			if (initial) {
				await this.financePlugin.transactions.update(initial.id, initial.date, transaction);
			} else {
				await this.financePlugin.transactions.create(transaction);
			}
			if (updateFixedTemplate) {
				await this.financePlugin.updateFixedTemplateFromTransaction(transaction);
			}
			await this.refresh();
		}, options).open();
	}

	private openInvestment(initial?: InvestmentContribution): void {
		new InvestmentModal(this.app, initial, async (contribution) => {
			if (initial) {
				await this.financePlugin.investments.update(initial.id, initial.date, contribution);
			} else {
				await this.financePlugin.investments.create(contribution);
			}
			await this.refresh();
		}).open();
	}

	private accountName(id: string | undefined): string {
		return this.financePlugin.settings.accounts.find((account) => account.id === id)?.name ?? id ?? 'Sem conta';
	}

	private categoryName(id: string): string {
		return this.financePlugin.settings.categories.find((category) => category.id === id)?.name
			?? (id === 'uncategorized' ? 'Sem categoria' : id);
	}

	private createActionButton(container: HTMLElement, icon: string, label: string, callback: () => void): void {
		const button = container.createEl('button', { cls: 'mod-cta finance-vault-action-button' });
		const iconEl = button.createSpan();
		setIcon(iconEl, icon);
		button.createSpan({ text: label });
		button.addEventListener('click', callback);
	}

	private createIconButton(container: HTMLElement, icon: string, label: string, callback: () => void): void {
		const button = container.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': label } });
		setIcon(button, icon);
		button.addEventListener('click', callback);
	}
}
