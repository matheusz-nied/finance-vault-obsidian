import { ItemView, Modal, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import {
	calculateDonutSlices,
	prepareChartSegments,
	type ChartSegment,
} from '../domain/chart';
import { addMonths, formatLocalDate, isWithinRange, localDate, monthRange, parseLocalDate, todayLocal, yearRange } from '../domain/date';
import { cycleForDate, nextCycle, previousCycle } from '../domain/cycle';
import { fixedTemplatesForMonth } from '../domain/fixedTemplates';
import {
	MAX_INSTALLMENT_COUNT,
	summarizeActiveInstallmentPlans,
} from '../domain/installments';
import { formatBrl } from '../domain/money';
import { calculateReport } from '../domain/reports';
import { entryDateForPeriod, filterTransactions, periodLabel } from './dashboardModel';
import { FixedTemplateModal } from '../modals/FixedTemplateModal';
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

type InvestmentChartGroup = 'category' | 'asset';

const INVESTMENT_LABELS: Record<InvestmentCategory, string> = {
	'fixed-income': 'Fixed income',
	stock: 'Stock',
	reit: 'FII',
	crypto: 'Crypto',
	etf: 'ETF',
	other: 'Other',
};

export class DashboardView extends ItemView {
	private mode: ReportMode = 'month';
	private page: 'overview' | 'transactions' | 'planning' | 'investments' = 'overview';
	private accountFilter = 'all';
	private anchor = todayLocal();
	private transactionTypeFilter = 'all';
	private investmentChartGroup: InvestmentChartGroup = 'category';
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
		container.createDiv({ cls: 'finance-vault-loading', text: 'Loading financial data…' });
		const period = this.currentPeriod();
		const fixedPeriod = monthRange(this.anchor);
		const installmentAnchor = todayLocal();
		const installmentPeriod: DateRange = {
			start: installmentAnchor,
			end: addMonths(installmentAnchor, MAX_INSTALLMENT_COUNT),
		};
		try {
			const transactionRequest = this.financePlugin.transactions.listRange(period);
			const fixedTransactionRequest = period.start === fixedPeriod.start && period.end === fixedPeriod.end
				? transactionRequest
				: this.financePlugin.transactions.listRange(fixedPeriod);
			const [transactionQuery, investmentQuery, fixedTransactionQuery, installmentTransactionQuery] = await Promise.all([
				transactionRequest,
				this.financePlugin.investments.listRange(period),
				fixedTransactionRequest,
				this.financePlugin.transactions.listRange(installmentPeriod),
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
				...installmentTransactionQuery.diagnostics,
			]);
			this.renderSummary(container, report);
			this.renderPageNavigation(container);
			if (this.page === 'overview') {
				if (transactionQuery.records.length === 0 && investmentQuery.records.length === 0) {
					this.renderEmptyState(container, 'Start with one entry',
						'No entries in this period. Add an expense or income above, or use the arrows to explore another period. You can rename the default accounts in Settings → Finance Vault.');
				}
				this.renderBreakdown(container, report);
				if (this.mode === 'year') {
					this.renderYearSummary(container, transactionQuery.records, investmentQuery.records);
				}
			} else if (this.page === 'transactions') {
				this.renderTransactions(container, transactionQuery.records);
			} else if (this.page === 'planning') {
				this.renderFixedTemplates(container, fixedTransactionQuery.records, period);
				this.renderInstallmentPlans(container, installmentTransactionQuery.records, installmentAnchor);
			} else {
				if (report.contributedCents > 0) this.renderInvestmentChart(container, report);
				this.renderInvestments(container, investmentQuery.records);
			}
		} catch (error) {
			if (version !== this.renderVersion) return;
			container.empty();
			container.createEl('h2', { text: 'Finance vault' });
			container.createDiv({
				cls: 'finance-vault-error',
				text: error instanceof Error ? error.message : 'Could not load the data.',
			});
		}
	}

	private renderInstallmentPlans(
		container: HTMLElement,
		transactions: readonly Transaction[],
		asOf: string,
	): void {
		const plans = summarizeActiveInstallmentPlans(transactions, asOf);
		if (plans.length === 0) {
			this.renderEmptyState(container, 'No upcoming installments', 'To split a purchase, add an expense, choose a credit card account, then select Installments under Payment.');
			return;
		}
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Upcoming installments' });
		section.createEl('p', { cls: 'finance-vault-period', text: `From ${formatLocalDate(asOf)} onward, regardless of the selected report period.` });
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		for (const plan of plans) {
			const row = list.createDiv({ cls: 'finance-vault-record' });
			const body = row.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: plan.description });
			body.createSpan({
				text: `${this.accountName(plan.accountId)} · Next ${plan.next.installmentNumber}/${plan.installmentCount} on ${formatLocalDate(plan.next.date)}`,
			});
			body.createSpan({
				text: `Total ${formatBrl(plan.totalCents)} · Remaining ${formatBrl(plan.remainingCents)}`,
			});
			const actions = row.createDiv({ cls: 'finance-vault-record-actions' });
			this.createIconButton(actions, 'pencil', 'Edit next installment', () => {
				this.openTransaction(plan.next);
			});
			this.createIconButton(actions, 'calendar-x-2', 'Cancel remaining installments', () => {
				new ConfirmModal(
					this.app,
					`Delete the ${plan.remaining.length} remaining installment(s) for “${plan.description}”?`,
					async () => {
						try {
							await this.financePlugin.transactions.deleteMany(plan.remaining);
							await this.refresh();
						} catch (error) {
							new Notice(error instanceof Error ? error.message : 'Could not cancel the installments.');
						}
					},
				).open();
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
		title.createEl('h2', { text: periodLabel(this.mode, period) });
		title.createEl('p', {
			text: `${formatLocalDate(period.start)} — ${formatLocalDate(period.end)}`,
			cls: 'finance-vault-period',
		});
		const actions = header.createDiv({ cls: 'finance-vault-actions' });
		this.createActionButton(actions, 'minus', 'Add expense', () => this.openTransaction(undefined, { type: 'expense' }));
		this.createActionButton(actions, 'plus', 'Add income', () => this.openTransaction(undefined, { type: 'income' }), false);
		this.createActionButton(actions, 'landmark', 'Add contribution', () => this.openInvestment(), false);
		this.createIconButton(actions, 'circle-help', 'Getting started', () => this.openGuide());

		const modeBar = container.createDiv({ cls: 'finance-vault-mode-bar' });
		const modes = modeBar.createDiv({ cls: 'finance-vault-period-modes', attr: { role: 'group', 'aria-label': 'Report period' } });
		for (const [mode, label] of [['month', 'Month'], ['cycle', 'Cycle'], ['year', 'Year']] as const) {
			const button = modes.createEl('button', { text: label, cls: 'finance-vault-mode-button' });
			button.toggleClass('is-active', this.mode === mode);
			button.setAttr('aria-pressed', String(this.mode === mode));
			button.addEventListener('click', () => {
				this.mode = mode;
				void this.refresh();
			});
		}
		const navigation = modeBar.createDiv({ cls: 'finance-vault-navigation' });
		this.createIconButton(navigation, 'chevron-left', 'Previous period', () => this.movePeriod(-1));
		const todayButton = navigation.createEl('button', { text: this.mode === 'month' ? 'This month' : this.mode === 'year' ? 'This year' : 'Current cycle' });
		todayButton.addEventListener('click', () => {
			this.anchor = todayLocal();
			void this.refresh();
		});
		this.createIconButton(navigation, 'chevron-right', 'Next period', () => this.movePeriod(1));
		container.createEl('p', {
			cls: 'finance-vault-period-hint',
			text: this.mode === 'cycle'
				? 'A cycle can span two months and includes future entries dated in the period. Set its start day in Settings → Finance Vault → Financial cycle.'
				: 'Totals include all entries dated in this period, including future dates.',
		});
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
		const unique = [...new Map(diagnostics.map((diagnostic) => [
			`${diagnostic.path}:${diagnostic.line ?? ''}:${diagnostic.message}`,
			diagnostic,
		])).values()];
		if (unique.length === 0) {
			return;
		}
		const details = container.createEl('details', { cls: 'finance-vault-diagnostics' });
		details.createEl('summary', { text: `${unique.length} warning(s) in Markdown files` });
		const list = details.createEl('ul');
		for (const diagnostic of unique) {
			list.createEl('li', {
				text: `${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}` : ''} — ${diagnostic.message}`,
			});
		}
	}

	private renderSummary(container: HTMLElement, report: PeriodReport): void {
		const cards = container.createDiv({ cls: 'finance-vault-summary' });
		this.renderMetric(cards, 'Income', report.receivedCents, 'is-positive', 'Money received in the period');
		this.renderMetric(cards, 'Expenses', report.spentCents, 'is-negative', 'Includes dated card installments');
		this.renderMetric(cards, 'Contributions', report.contributedCents, 'is-investment', 'Money added to investments');
		this.renderMetric(cards, 'Remaining', report.balanceCents, report.balanceCents >= 0 ? 'is-positive' : 'is-negative', 'Income − expenses − contributions');
		container.createEl('p', { cls: 'finance-vault-period-hint', text: 'Remaining is the result for this period, not your bank account balance.' });
	}

	private renderBreakdown(container: HTMLElement, report: PeriodReport): void {
		const categories = Object.entries(report.spentByCategory).sort((left, right) => right[1] - left[1]);
		if (categories.length > 0 || report.contributedCents > 0) {
			const charts = container.createDiv({ cls: 'finance-vault-chart-grid' });
			if (categories.length > 0) {
				const card = charts.createEl('section', { cls: 'finance-vault-chart-card' });
				card.createEl('h3', { text: 'Expenses by category' });
				card.createEl('p', {
					cls: 'finance-vault-chart-description',
					text: 'Expense distribution for the selected period.',
				});
				const segments = prepareChartSegments(categories.map(([categoryId, amountCents]) => ({
					key: categoryId,
					label: this.categoryName(categoryId),
					amountCents,
				})));
				this.renderDonutChart(card, segments, report.spentCents, 'Total expenses');
			}
			if (report.contributedCents > 0) {
				this.renderInvestmentChart(charts, report);
			}
		}

		const creditCards = this.financePlugin.settings.accounts.filter((account) => account.kind === 'credit-card'
			&& (!account.archived || Boolean(report.spentByAccount[account.id])));
		if (creditCards.some((account) => report.spentByAccount[account.id])) {
			const section = container.createEl('section', { cls: 'finance-vault-section' });
			section.createEl('h3', { text: 'Expenses by credit card' });
			section.createEl('p', { cls: 'finance-vault-period', text: 'Entries dated in this period; these totals are not a credit card statement.' });
			const list = section.createDiv({ cls: 'finance-vault-category-list' });
			for (const account of creditCards) {
				const item = list.createDiv({ cls: 'finance-vault-category-item' });
				item.createSpan({ text: account.name });
				item.createEl('strong', { text: formatBrl(report.spentByAccount[account.id] ?? 0) });
			}
		}
	}

	private renderInvestmentChart(container: HTMLElement, report: PeriodReport): void {
		const card = container.createEl('section', { cls: 'finance-vault-chart-card' });
		const header = card.createDiv({ cls: 'finance-vault-chart-header' });
		header.createEl('h3', { text: 'Investments' });
		const toggle = header.createDiv({
			cls: 'finance-vault-chart-toggle',
			attr: { role: 'group', 'aria-label': 'Group investments' },
		});
		for (const [group, label] of [['category', 'By type'], ['asset', 'By asset']] as const) {
			const button = toggle.createEl('button', { text: label });
			button.setAttr('type', 'button');
			button.toggleClass('is-active', this.investmentChartGroup === group);
			button.setAttr('aria-pressed', String(this.investmentChartGroup === group));
			button.addEventListener('click', () => {
				this.investmentChartGroup = group;
				void this.refresh();
			});
		}
		card.createEl('p', {
			cls: 'finance-vault-chart-description',
			text: 'Amount contributed during the period — not the current market value.',
		});
		const amounts = this.investmentChartGroup === 'category'
			? report.contributedByCategory
			: report.contributedByAsset;
		const segments = prepareChartSegments(Object.entries(amounts).map(([key, amountCents]) => ({
			key,
			label: this.investmentChartGroup === 'category'
				? INVESTMENT_LABELS[key as InvestmentCategory] ?? key
				: key,
			amountCents,
		})));
		this.renderDonutChart(card, segments, report.contributedCents, 'Total contributed');
	}

	private renderDonutChart(
		container: HTMLElement,
		segments: readonly ChartSegment[],
		totalCents: number,
		totalLabel: string,
	): void {
		const content = container.createDiv({ cls: 'finance-vault-donut-layout' });
		const visual = content.createDiv({ cls: 'finance-vault-donut', attr: { 'aria-hidden': 'true' } });
		const svgNamespace = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNamespace, 'svg');
		svg.setAttribute('class', 'finance-vault-donut-svg');
		svg.setAttribute('viewBox', '0 0 42 42');
		visual.appendChild(svg);
		for (const [index, slice] of calculateDonutSlices(segments, totalCents).entries()) {
			const circle = document.createElementNS(svgNamespace, 'circle');
			circle.setAttribute('class', `finance-vault-donut-segment finance-vault-donut-segment-${index}`);
			circle.setAttribute('cx', '21');
			circle.setAttribute('cy', '21');
			circle.setAttribute('r', '15.9155');
			circle.setAttribute('pathLength', '100');
			circle.setAttribute('stroke-dasharray', `${slice.percentage} ${100 - slice.percentage}`);
			circle.setAttribute('stroke-dashoffset', String(-slice.offsetPercentage));
			circle.setAttribute('transform', 'rotate(-90 21 21)');
			svg.appendChild(circle);
		}
		const center = visual.createDiv({ cls: 'finance-vault-donut-center' });
		center.createSpan({ text: totalLabel });
		center.createEl('strong', { text: formatBrl(totalCents) });

		const legend = content.createEl('ul', { cls: 'finance-vault-chart-legend' });
		for (const [index, segment] of segments.entries()) {
			const item = legend.createEl('li');
			item.createSpan({
				cls: `finance-vault-chart-swatch finance-vault-chart-swatch-${index}`,
				attr: { 'aria-hidden': 'true' },
			});
			const name = item.createDiv({ cls: 'finance-vault-chart-legend-name' });
			name.createSpan({ text: segment.label });
			name.createEl('small', { text: this.formatPercentage(segment.amountCents, totalCents) });
			item.createEl('strong', { text: formatBrl(segment.amountCents) });
		}
	}

	private formatPercentage(amountCents: number, totalCents: number): string {
		const ratio = totalCents > 0 ? amountCents / totalCents : 0;
		if (ratio > 0 && ratio < 0.001) {
			return '< 0.1%';
		}
		return new Intl.NumberFormat('en-US', {
			style: 'percent',
			maximumFractionDigits: 1,
		}).format(ratio);
	}

	private renderFixedTemplates(
		container: HTMLElement,
		transactions: readonly Transaction[],
		displayedPeriod: DateRange,
	): void {
		const items = fixedTemplatesForMonth(this.financePlugin.settings.fixedTemplates, transactions, this.anchor);
		const { year, month } = parseLocalDate(this.anchor);
		const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
			.format(new Date(year, month - 1, 1));
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		const heading = section.createDiv({ cls: 'finance-vault-chart-header' });
		heading.createEl('h3', { text: `Recurring items for ${monthLabel}` });
		this.createActionButton(heading, 'plus', 'Create recurring template', () => {
			new FixedTemplateModal(this.app, this.financePlugin.settings, undefined, async (template) => {
				this.financePlugin.settings.fixedTemplates.push(template);
				await this.financePlugin.saveSettings();
			}).open();
		}, false);
		section.createEl('p', { cls: 'finance-vault-period', text: 'Templates are reminders. Only entries you record count in the totals. This checklist always covers the month named above.' });
		if (items.length === 0) {
			this.renderEmptyState(section, 'Make next month easier', 'Create a template for salary, rent or subscriptions. Review the amount and date each month before recording it.');
			return;
		}
		const launched = items.filter((item) => item.transactions.length > 0).length;
		section.createEl('p', {
			cls: 'finance-vault-period',
			text: `${launched} of ${items.length} template(s) posted this month.`,
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
			const displayedOccurrences = item.transactions
				.filter((transaction) => isWithinRange(transaction.date, displayedPeriod));
			const launchLabel = item.transactions.length === 0
				? 'Pending'
				: displayedOccurrences.length === 0
					? 'Posted this month, outside the displayed period'
					: displayedOccurrences.length < item.transactions.length
						? 'Posted this month, partially outside the displayed period'
						: 'Posted';
			body.createSpan({
				text: `${launchLabel} · ${account} · ${formatBrl(amount)}`,
			});
			if (item.transactions.length > 0) {
				this.createIconButton(row, 'pencil', `Edit ${item.template.name}`, () => {
					this.openTransaction(item.transactions[0]);
				});
			} else {
				this.createActionButton(row, 'plus-circle', 'Record entry', () => {
					this.openTransaction(undefined, {
						fixedTemplateId: item.template.id,
						date: this.anchor,
					});
				});
			}
		}
	}

	private renderMetric(container: HTMLElement, label: string, value: number, className: string, description: string): void {
		const card = container.createDiv({ cls: `finance-vault-metric ${className}` });
		card.createSpan({ text: label });
		card.createEl('strong', { text: formatBrl(value) });
		card.createEl('small', { text: description });
	}

	private renderYearSummary(
		container: HTMLElement,
		transactions: readonly Transaction[],
		contributions: readonly InvestmentContribution[],
	): void {
		const { year } = parseLocalDate(this.anchor);
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Monthly summary' });
		const list = section.createDiv({ cls: 'finance-vault-month-grid' });
		for (let month = 1; month <= 12; month += 1) {
			const period = monthRange(localDate(year, month, 1));
			const report = calculateReport(period, transactions, contributions);
			const card = list.createDiv({ cls: 'finance-vault-month-card' });
			card.createEl('strong', { text: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month - 1, 1)) });
			card.createSpan({ text: `Income: ${formatBrl(report.receivedCents)}` });
			card.createSpan({ text: `Expenses: ${formatBrl(report.spentCents)}` });
			card.createSpan({ text: `Contributions: ${formatBrl(report.contributedCents)}` });
			card.createSpan({ text: `Remaining: ${formatBrl(report.balanceCents)}` });
		}
	}

	private renderTransactions(container: HTMLElement, transactions: readonly Transaction[]): void {
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Transactions' });
		const filters = section.createDiv({ cls: 'finance-vault-filters' });
		const search = filters.createEl('input', { type: 'search', placeholder: 'Search description, category or account…' });
		search.value = this.search;
		search.setAttr('aria-label', 'Search transactions');
		const type = filters.createEl('select');
		type.setAttr('aria-label', 'Filter transactions by type');
		for (const [value, label] of [['all', 'All types'], ['income', 'Income'], ['expense', 'Expenses']]) {
			type.createEl('option', { value, text: label });
		}
		type.value = this.transactionTypeFilter;
		const account = filters.createEl('select', { attr: { 'aria-label': 'Filter transactions by account' } });
		account.createEl('option', { value: 'all', text: 'All accounts' });
		for (const item of this.financePlugin.settings.accounts) {
			if (!item.archived || item.id === this.accountFilter || transactions.some((transaction) => transaction.accountId === item.id)) {
				account.createEl('option', { value: item.id, text: item.name });
			}
		}
		account.value = this.accountFilter;
		const clear = filters.createEl('button', { text: 'Clear filters' });
		const count = section.createEl('p', { cls: 'finance-vault-period', attr: { role: 'status' } });
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		const renderList = (): void => {
			const filtered = filterTransactions(transactions, {
				search: this.search, type: this.transactionTypeFilter, accountId: this.accountFilter,
			}, this.financePlugin.settings);
			count.setText(`${filtered.length} of ${transactions.length} entries · Filters affect this list only.`);
			clear.disabled = !this.search && this.transactionTypeFilter === 'all' && this.accountFilter === 'all';
			list.empty();
			if (filtered.length === 0) {
				this.renderEmptyState(list, transactions.length ? 'No matching entries' : 'No transactions in this period',
					transactions.length ? 'Try another search or clear the filters to see all entries.' : 'Use Add expense or Add income to record an entry for this period.');
				return;
			}
			this.renderTransactionRows(list, filtered);
		};
		search.addEventListener('input', () => { this.search = search.value; renderList(); });
		type.addEventListener('change', () => { this.transactionTypeFilter = type.value; renderList(); });
		account.addEventListener('change', () => { this.accountFilter = account.value; renderList(); });
		clear.addEventListener('click', () => {
			this.search = search.value = '';
			this.transactionTypeFilter = type.value = 'all';
			this.accountFilter = account.value = 'all';
			renderList();
			search.focus();
		});
		renderList();
	}

	private renderTransactionRows(list: HTMLElement, filtered: readonly Transaction[]): void {
		for (const transaction of filtered) {
			const item = list.createDiv({ cls: 'finance-vault-record' });
			const body = item.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: transaction.description });
			const typeLabel = transaction.type === 'income' ? 'Income' : 'Expense';
			const accountLabel = this.accountName(transaction.accountId);
			const installmentLabel = transaction.installmentNumber && transaction.installmentCount
				? ` · Installment ${transaction.installmentNumber}/${transaction.installmentCount}`
				: '';
			body.createSpan({ text: `${formatLocalDate(transaction.date)} · ${typeLabel} · ${accountLabel} · ${this.categoryName(transaction.categoryId ?? 'uncategorized')}${installmentLabel}` });
			const amount = item.createEl('strong', {
				text: formatBrl(transaction.amountCents),
				cls: transaction.type === 'income' ? 'is-positive' : 'is-negative',
			});
			amount.setAttr('aria-label', `Amount ${formatBrl(transaction.amountCents)}`);
			const actions = item.createDiv({ cls: 'finance-vault-record-actions' });
			this.createIconButton(actions, 'pencil', 'Edit transaction', () => this.openTransaction(transaction));
			this.createIconButton(actions, 'trash-2', 'Delete transaction', () => {
				new ConfirmModal(this.app, `Delete “${transaction.description}”?`, async () => {
					try {
						await this.financePlugin.transactions.delete(transaction.id, transaction.date);
						await this.refresh();
					} catch (error) {
						new Notice(error instanceof Error ? error.message : 'Could not delete the transaction.');
					}
				}).open();
			});
		}
	}

	private renderInvestments(container: HTMLElement, contributions: readonly InvestmentContribution[]): void {
		const section = container.createEl('section', { cls: 'finance-vault-section' });
		section.createEl('h3', { text: 'Investment contributions' });
		const list = section.createDiv({ cls: 'finance-vault-record-list' });
		if (contributions.length === 0) {
			this.renderEmptyState(list, 'Track what you invest', 'Use Add contribution to record money added to an asset. Contributions reduce the period’s remaining amount and are kept separate from expenses.');
			return;
		}
		for (const contribution of [...contributions].sort((left, right) => right.date.localeCompare(left.date))) {
			const item = list.createDiv({ cls: 'finance-vault-record' });
			const body = item.createDiv({ cls: 'finance-vault-record-body' });
			body.createEl('strong', { text: contribution.asset });
			body.createSpan({ text: `${formatLocalDate(contribution.date)} · ${INVESTMENT_LABELS[contribution.category]}` });
			item.createEl('strong', { text: formatBrl(contribution.amountCents), cls: 'is-investment' });
			const actions = item.createDiv({ cls: 'finance-vault-record-actions' });
			this.createIconButton(actions, 'pencil', 'Edit investment contribution', () => this.openInvestment(contribution));
			this.createIconButton(actions, 'trash-2', 'Delete investment contribution', () => {
				new ConfirmModal(this.app, `Delete the contribution to “${contribution.asset}”?`, async () => {
					try {
						await this.financePlugin.investments.delete(contribution.id, contribution.date);
						await this.refresh();
					} catch (error) {
						new Notice(error instanceof Error ? error.message : 'Could not delete the investment contribution.');
					}
				}).open();
			});
		}
	}

	private openTransaction(initial?: Transaction, options: TransactionModalOptions = {}): void {
		new TransactionModal(this.app, this.financePlugin.settings, initial, async ({ transactions, updateFixedTemplate }) => {
			if (initial) {
				const transaction = transactions[0];
				if (!transaction) {
					throw new Error('No transaction was provided for editing.');
				}
				await this.financePlugin.transactions.update(initial.id, initial.date, transaction);
			} else {
				await this.financePlugin.transactions.createMany(transactions);
			}
			const transaction = transactions[0];
			if (updateFixedTemplate && transaction) {
				await this.financePlugin.updateFixedTemplateFromTransaction(transaction);
			}
			await this.refresh();
		}, { date: entryDateForPeriod(this.currentPeriod(), todayLocal()), ...options }).open();
	}

	private openInvestment(initial?: InvestmentContribution): void {
		new InvestmentModal(this.app, initial, async (contribution) => {
			if (initial) {
				await this.financePlugin.investments.update(initial.id, initial.date, contribution);
			} else {
				await this.financePlugin.investments.create(contribution);
			}
			await this.refresh();
		}, entryDateForPeriod(this.currentPeriod(), todayLocal())).open();
	}

	private renderPageNavigation(container: HTMLElement): void {
		const navigation = container.createEl('nav', { cls: 'finance-vault-pages', attr: { 'aria-label': 'Dashboard sections' } });
		for (const [page, label] of [['overview', 'Overview'], ['transactions', 'Transactions'], ['planning', 'Recurring & installments'], ['investments', 'Investments']] as const) {
			const button = navigation.createEl('button', { text: label });
			button.toggleClass('is-active', this.page === page);
			button.setAttr('aria-pressed', String(this.page === page));
			button.addEventListener('click', () => { this.page = page; void this.refresh(); });
		}
	}

	private renderEmptyState(container: HTMLElement, title: string, description: string): void {
		const state = container.createDiv({ cls: 'finance-vault-empty' });
		state.createEl('h3', { text: title });
		state.createEl('p', { text: description });
	}

	private openGuide(): void {
		const modal = new Modal(this.app);
		modal.setTitle('Getting started');
		const steps = modal.contentEl.createEl('ol', { cls: 'finance-vault-guide' });
		for (const text of [
			'Personalize your accounts and categories in Settings → Finance Vault. Default accounts are ready to use.',
			'Choose a month, then use Add expense or Add income. Check the date, account and amount before saving.',
			'Open Transactions to search, filter, edit or delete your entries.',
			'Use Recurring & installments for monthly reminders. For a purchase in installments, add an expense and select a credit card account.',
			'Use Add contribution for investments. Remaining subtracts both expenses and contributions from income.',
			'Use Cycle if your financial month starts on a different day. Month follows the calendar; Year shows the full year.',
		]) steps.createEl('li', { text });
		modal.contentEl.createEl('button', { text: 'Got it', cls: 'mod-cta' }).addEventListener('click', () => modal.close());
		modal.open();
	}

	private accountName(id: string | undefined): string {
		return this.financePlugin.settings.accounts.find((account) => account.id === id)?.name ?? id ?? 'No account';
	}

	private categoryName(id: string): string {
		return this.financePlugin.settings.categories.find((category) => category.id === id)?.name
			?? (id === 'uncategorized' ? 'Uncategorized' : id);
	}

	private createActionButton(container: HTMLElement, icon: string, label: string, callback: () => void, primary = true): void {
		const button = container.createEl('button', { cls: `finance-vault-action-button${primary ? ' mod-cta' : ''}` });
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
