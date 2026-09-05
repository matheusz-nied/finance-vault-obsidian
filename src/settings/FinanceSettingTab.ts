import {
	App,
	Notice,
	PluginSettingTab,
	type SettingDefinitionItem,
	type Setting,
} from 'obsidian';
import { addDays, compareDates, isLocalDate, todayLocal } from '../domain/date';
import { createId } from '../domain/id';
import { formatBrl } from '../domain/money';
import { FixedTemplateModal } from '../modals/FixedTemplateModal';
import type { FixedTemplate } from '../types';
import type { AccountKind, CategoryKind } from '../types';
import type FinanceVaultPlugin from '../main';

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	cash: 'Cash',
	bank: 'Bank account',
	'credit-card': 'Credit card',
};

export class FinanceSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly financePlugin: FinanceVaultPlugin) {
		super(app, financePlugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		let dataRootDraft = this.financePlugin.settings.dataRoot;
		const lastRule = this.financePlugin.settings.cycleRules.at(-1);
		let effectiveFrom = addDays(lastRule && compareDates(lastRule.effectiveFrom, todayLocal()) > 0
			? lastRule.effectiveFrom : todayLocal(), 1);
		let startDay = '10';
		return [
			{
				type: 'group',
				heading: 'Getting started',
				items: [{
					name: 'Make these accounts yours',
					desc: 'Rename the default accounts below, choose their types, then review your categories. You can start recording entries immediately.',
				}, {
					name: 'Open your dashboard',
					desc: 'Use the wallet icon in the sidebar. Choose a month, then add an expense, income or contribution. Recurring templates and financial cycles are optional.',
				}],
			},
			{
				type: 'list',
				heading: 'Accounts',
				emptyState: 'No accounts configured.',
				addItem: {
					name: 'Add account',
					action: () => {
						void this.addAccount();
					},
				},
				items: this.financePlugin.settings.accounts.map((account) => ({
					name: account.name,
					desc: account.archived ? 'Archived; preserved for historical records.' : 'Available for new entries.',
					aliases: ['account', 'card', 'bank', 'cash'],
					render: (setting) => {
						setting
							.addText((text) => text.setValue(account.name).onChange(async (value) => {
								const name = value.trim();
								if (name) {
									account.name = name;
									await this.financePlugin.saveSettings();
								}
							}))
							.addDropdown((dropdown) => dropdown
								.addOptions(ACCOUNT_KIND_LABELS)
								.setValue(account.kind)
								.onChange(async (value) => {
									account.kind = value as AccountKind;
									if (account.kind === 'credit-card' && !account.dueDay) {
										account.dueDay = 10;
									}
									await this.financePlugin.saveSettings();
									this.update();
								}))
							.addButton((button) => button
								.setButtonText(account.archived ? 'Restore' : 'Archive')
								.onClick(async () => {
									account.archived = !account.archived;
									await this.financePlugin.saveSettings();
									this.update();
								}));
						if (account.kind === 'credit-card') {
							setting.addText((text) => {
								text.inputEl.type = 'number';
								text.inputEl.min = '1';
								text.inputEl.max = '31';
								return text
									.setPlaceholder('Due day')
									.setValue(String(account.dueDay ?? 10))
									.onChange(async (value) => {
										const day = Number(value);
										if (Number.isInteger(day) && day >= 1 && day <= 31) {
											account.dueDay = day;
											await this.financePlugin.saveSettings();
										}
									});
							});
						}
					},
				})),
			},
			{
				type: 'list',
				heading: 'Categories',
				emptyState: 'No categories configured.',
				addItem: {
					name: 'Add category',
					action: () => {
						void this.addCategory('expense');
					},
				},
				items: this.financePlugin.settings.categories.map((category) => ({
					name: category.name,
					desc: category.archived ? 'Archived; preserved for historical records.' : category.kind === 'income' ? 'Income' : 'Expense',
					aliases: ['category', 'income', 'expense'],
					render: (setting) => {
						setting
							.addText((text) => text.setValue(category.name).onChange(async (value) => {
								const name = value.trim();
								if (name) {
									category.name = name;
									await this.financePlugin.saveSettings();
								}
							}))
							.addDropdown((dropdown) => dropdown
								.addOption('income', 'Income')
								.addOption('expense', 'Expense')
								.setValue(category.kind)
								.onChange(async (value) => {
									category.kind = value as CategoryKind;
									await this.financePlugin.saveSettings();
								}))
							.addButton((button) => button
								.setButtonText(category.archived ? 'Restore' : 'Archive')
								.onClick(async () => {
									category.archived = !category.archived;
									await this.financePlugin.saveSettings();
									this.update();
								}));
					},
				})),
			},
			{
				type: 'list',
				heading: 'Recurring templates',
				emptyState: 'No recurring templates configured.',
				addItem: {
					name: 'Add recurring template',
					action: () => {
						this.openFixedTemplate();
					},
				},
				items: this.financePlugin.settings.fixedTemplates.map((template) => ({
					name: template.name,
					desc: this.fixedTemplateDescription(template),
					aliases: ['recurring', 'template', 'subscription'],
					render: (setting) => {
						setting
							.addButton((button) => button
								.setButtonText('Edit')
								.onClick(() => this.openFixedTemplate(template)))
							.addButton((button) => button
								.setButtonText(template.archived ? 'Restore' : 'Archive')
								.onClick(async () => {
									template.archived = !template.archived;
									await this.financePlugin.saveSettings();
									this.update();
								}));
					},
				})),
			},
			{
				type: 'group',
				heading: 'Financial cycle',
				items: [
					{
						name: 'How financial cycles work',
						desc: 'Choose the day of the month your financial period starts, for example your payday. Day 10 means September 10 through October 9. This changes the cycle view, not the dates of your transactions.',
					},
					...this.financePlugin.settings.cycleRules.map((rule) => ({
						name: `Cycle starts on day ${rule.startDay} of each month`,
						desc: rule.effectiveFrom === '0001-01-01'
							? 'Initial rule. Kept to preserve past cycles.'
							: compareDates(rule.effectiveFrom, todayLocal()) > 0
								? `Scheduled for ${rule.effectiveFrom}. You can delete this rule before it takes effect.`
								: `Effective from ${rule.effectiveFrom}. Kept to preserve past cycles.`,
						render: (setting: Setting) => {
							if (compareDates(rule.effectiveFrom, todayLocal()) > 0) {
								setting.addButton((button) => button
									.setButtonText('Delete rule')
									.onClick(async () => this.deleteCycleRule(rule.id)));
							}
						},
					})),
					{
						name: 'New rule takes effect on',
						desc: 'Choose a future date after all scheduled rules. A new cycle begins on this date, so the transition cycle may be shorter or longer.',
						render: (setting) => {
							setting.addText((text) => {
								text.inputEl.type = 'date';
								text.inputEl.setAttribute('aria-label', 'New rule takes effect on');
								return text.setValue(effectiveFrom).onChange((value) => {
									effectiveFrom = value;
								});
							});
						},
					},
					{
						name: 'Day of the month the cycle starts',
						desc: 'Enter 1–31. For example, 10 starts each cycle on the 10th and ends it on the 9th of the next month. In shorter months, days 29–31 use the last available day.',
						render: (setting) => {
							setting.addText((text) => {
								text.inputEl.type = 'number';
								text.inputEl.min = '1';
								text.inputEl.max = '31';
								text.inputEl.step = '1';
								text.inputEl.setAttribute('aria-label', 'Day of the month the cycle starts');
								return text.setPlaceholder('Day').setValue(startDay).onChange((value) => {
									startDay = value;
								});
							}).addButton((button) => button.setButtonText('Schedule rule').setCta().onClick(async () => {
								await this.addCycleRule(effectiveFrom, startDay);
							}));
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Updates',
				items: [{
					name: 'Show release notes after updates',
					desc: 'Automatically show what changed when a new version is installed.',
					render: (setting) => {
						setting.addToggle((toggle) => toggle.setValue(this.financePlugin.data.showReleaseNotes !== false).onChange(async (value) => {
							this.financePlugin.data.showReleaseNotes = value;
							await this.financePlugin.saveSettings();
						}));
					},
				}, {
					name: 'Release history',
					render: (setting) => {
						setting.addButton((button) => button.setButtonText('Open release notes').onClick(() => this.financePlugin.openReleaseNotes()));
					},
				}],
			},
			{
				type: 'group',
				heading: 'Data',
				items: [{
					name: 'Data folder',
					desc: 'Vault folder that stores monthly transactions and investment contributions.',
					render: (setting) => {
						setting
							.addText((text) => text
								.setValue(dataRootDraft)
								.setPlaceholder('Financas')
								.onChange((value) => {
									dataRootDraft = value;
								}))
							.addButton((button) => button
								.setButtonText('Apply')
								.onClick(async () => {
									try {
										await this.financePlugin.changeDataRoot(dataRootDraft);
										new Notice('Finance data folder updated.');
									} catch (error) {
										new Notice(error instanceof Error ? error.message : 'Could not change the data folder.');
									}
								}));
					},
				}],
			},
		];
	}

	private async addAccount(): Promise<void> {
		this.financePlugin.settings.accounts.push({
			id: createId('account'),
			name: 'New account',
			kind: 'bank',
			archived: false,
		});
		await this.financePlugin.saveSettings();
		this.update();
	}

	private async addCategory(kind: CategoryKind): Promise<void> {
		this.financePlugin.settings.categories.push({
			id: createId('category'),
			name: kind === 'income' ? 'New income' : 'New expense',
			kind,
			archived: false,
		});
		await this.financePlugin.saveSettings();
		this.update();
	}

	private openFixedTemplate(initial?: FixedTemplate): void {
		new FixedTemplateModal(this.app, this.financePlugin.settings, initial, async (template) => {
			const index = this.financePlugin.settings.fixedTemplates.findIndex((candidate) => candidate.id === template.id);
			if (index >= 0) {
				this.financePlugin.settings.fixedTemplates[index] = template;
			} else {
				this.financePlugin.settings.fixedTemplates.push(template);
			}
			await this.financePlugin.saveSettings();
			this.update();
		}).open();
	}

	private fixedTemplateDescription(template: FixedTemplate): string {
		const account = this.financePlugin.settings.accounts.find((candidate) => candidate.id === template.accountId);
		const kind = template.type === 'income' ? 'Income' : 'Expense';
		const archived = template.archived ? ' · Archived' : '';
		return `${kind} · ${account?.name ?? template.accountId} · ${formatBrl(template.amountCents)}${archived}`;
	}

	private async deleteCycleRule(id: string): Promise<void> {
		const rules = this.financePlugin.settings.cycleRules;
		const rule = rules.find((candidate) => candidate.id === id);
		if (!rule || compareDates(rule.effectiveFrom, todayLocal()) <= 0) {
			new Notice('Only future cycle rules can be deleted. Past and active rules preserve your cycle history.');
			return;
		}
		this.financePlugin.settings.cycleRules = rules.filter((candidate) => candidate.id !== id);
		await this.financePlugin.saveSettings();
		this.update();
	}

	private async addCycleRule(effectiveFrom: string, startDay: string): Promise<void> {
		try {
			const day = Number(startDay);
			const rules = this.financePlugin.settings.cycleRules;
			const last = rules[rules.length - 1];
			if (!isLocalDate(effectiveFrom) || compareDates(effectiveFrom, todayLocal()) <= 0) {
				throw new Error('The effective date must be in the future.');
			}
			if (last && compareDates(effectiveFrom, last.effectiveFrom) <= 0) {
				throw new Error('The effective date must be later than the previous rule.');
			}
			if (!Number.isInteger(day) || day < 1 || day > 31) {
				throw new Error('The start day must be between 1 and 31.');
			}
			rules.push({ id: createId('cycle-rule'), effectiveFrom, startDay: day });
			await this.financePlugin.saveSettings();
			this.update();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Could not add the rule.');
		}
	}
}
