import {
	App,
	Notice,
	PluginSettingTab,
	type SettingDefinitionItem,
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
		let effectiveFrom = addDays(todayLocal(), 1);
		let startDay = '10';
		return [
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
					...this.financePlugin.settings.cycleRules.map((rule) => ({
						name: `Starts on day ${rule.startDay}`,
						desc: rule.effectiveFrom === '0001-01-01' ? 'Initial rule' : `Effective from ${rule.effectiveFrom}`,
					})),
					{
						name: 'New future rule',
						desc: 'The effective date creates a continuous boundary; the first cycle may be shorter or longer.',
						render: (setting) => {
							setting
								.addText((text) => {
									text.inputEl.type = 'date';
									return text.setValue(effectiveFrom).onChange((value) => {
										effectiveFrom = value;
									});
								})
								.addText((text) => {
									text.inputEl.type = 'number';
									text.inputEl.min = '1';
									text.inputEl.max = '31';
									return text.setPlaceholder('Day').setValue(startDay).onChange((value) => {
										startDay = value;
									});
								})
								.addButton((button) => button.setButtonText('Add').setCta().onClick(async () => {
									await this.addCycleRule(effectiveFrom, startDay);
								}));
						},
					},
				],
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
