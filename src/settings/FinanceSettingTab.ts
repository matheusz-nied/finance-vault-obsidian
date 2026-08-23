import {
	App,
	Notice,
	PluginSettingTab,
	type SettingDefinitionItem,
} from 'obsidian';
import { addDays, compareDates, isLocalDate, todayLocal } from '../domain/date';
import { createId } from '../domain/id';
import type { AccountKind, CategoryKind } from '../types';
import type FinanceVaultPlugin from '../main';

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
	cash: 'Dinheiro',
	bank: 'Conta bancária',
	'credit-card': 'Cartão de crédito',
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
				heading: 'Dados',
				items: [{
					name: 'Pasta de dados',
					desc: 'Pasta da vault onde ficam as transações e os aportes mensais.',
					render: (setting) => {
						setting
							.addText((text) => text
								.setValue(dataRootDraft)
								.setPlaceholder('Financas')
								.onChange((value) => {
									dataRootDraft = value;
								}))
							.addButton((button) => button
								.setButtonText('Aplicar')
								.onClick(async () => {
									try {
										await this.financePlugin.changeDataRoot(dataRootDraft);
										new Notice('Pasta financeira atualizada.');
									} catch (error) {
										new Notice(error instanceof Error ? error.message : 'Não foi possível alterar a pasta.');
									}
								}));
					},
				}],
			},
			{
				type: 'list',
				heading: 'Contas',
				emptyState: 'Nenhuma conta configurada.',
				addItem: {
					name: 'Adicionar conta',
					action: () => {
						void this.addAccount();
					},
				},
				items: this.financePlugin.settings.accounts.map((account) => ({
					name: account.name,
					desc: account.archived ? 'Arquivada; preservada para o histórico.' : 'Disponível em novos lançamentos.',
					aliases: ['conta', 'cartão', 'banco', 'dinheiro'],
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
								.setButtonText(account.archived ? 'Restaurar' : 'Arquivar')
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
									.setPlaceholder('Vencimento')
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
				heading: 'Categorias',
				emptyState: 'Nenhuma categoria configurada.',
				addItem: {
					name: 'Adicionar categoria',
					action: () => {
						void this.addCategory('expense');
					},
				},
				items: this.financePlugin.settings.categories.map((category) => ({
					name: category.name,
					desc: category.archived ? 'Arquivada; preservada para o histórico.' : category.kind === 'income' ? 'Receita' : 'Despesa',
					aliases: ['categoria', 'receita', 'despesa'],
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
								.addOption('income', 'Receita')
								.addOption('expense', 'Despesa')
								.setValue(category.kind)
								.onChange(async (value) => {
									category.kind = value as CategoryKind;
									await this.financePlugin.saveSettings();
								}))
							.addButton((button) => button
								.setButtonText(category.archived ? 'Restaurar' : 'Arquivar')
								.onClick(async () => {
									category.archived = !category.archived;
									await this.financePlugin.saveSettings();
									this.update();
								}));
					},
				})),
			},
			{
				type: 'group',
				heading: 'Ciclo financeiro',
				items: [
					...this.financePlugin.settings.cycleRules.map((rule) => ({
						name: `Início no dia ${rule.startDay}`,
						desc: rule.effectiveFrom === '0001-01-01' ? 'Regra inicial' : `Vigente a partir de ${rule.effectiveFrom}`,
					})),
					{
						name: 'Nova regra futura',
						desc: 'A vigência cria uma fronteira contínua; o primeiro ciclo pode ser mais curto ou longo.',
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
									return text.setPlaceholder('Dia').setValue(startDay).onChange((value) => {
										startDay = value;
									});
								})
								.addButton((button) => button.setButtonText('Adicionar').setCta().onClick(async () => {
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
			name: 'Nova conta',
			kind: 'bank',
			archived: false,
		});
		await this.financePlugin.saveSettings();
		this.update();
	}

	private async addCategory(kind: CategoryKind): Promise<void> {
		this.financePlugin.settings.categories.push({
			id: createId('category'),
			name: kind === 'income' ? 'Nova receita' : 'Nova despesa',
			kind,
			archived: false,
		});
		await this.financePlugin.saveSettings();
		this.update();
	}

	private async addCycleRule(effectiveFrom: string, startDay: string): Promise<void> {
		try {
			const day = Number(startDay);
			const rules = this.financePlugin.settings.cycleRules;
			const last = rules[rules.length - 1];
			if (!isLocalDate(effectiveFrom) || compareDates(effectiveFrom, todayLocal()) <= 0) {
				throw new Error('A vigência precisa ser uma data futura.');
			}
			if (last && compareDates(effectiveFrom, last.effectiveFrom) <= 0) {
				throw new Error('A vigência precisa ser posterior à última regra.');
			}
			if (!Number.isInteger(day) || day < 1 || day > 31) {
				throw new Error('O dia inicial precisa estar entre 1 e 31.');
			}
			rules.push({ id: createId('cycle-rule'), effectiveFrom, startDay: day });
			await this.financePlugin.saveSettings();
			this.update();
		} catch (error) {
			new Notice(error instanceof Error ? error.message : 'Não foi possível adicionar a regra.');
		}
	}
}
