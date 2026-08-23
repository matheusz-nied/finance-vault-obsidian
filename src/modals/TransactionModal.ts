import {
	App,
	Modal,
	Notice,
	Setting,
	type DropdownComponent,
	type TextComponent,
	type ToggleComponent,
} from 'obsidian';
import { isLocalDate, todayLocal } from '../domain/date';
import { createId } from '../domain/id';
import { formatCentsForInput, parseBrlToCents } from '../domain/money';
import { validateTransaction } from '../domain/validation';
import type { FinanceSettings, Transaction, TransactionType } from '../types';

export interface TransactionModalOptions {
	fixedTemplateId?: string;
	date?: string;
}

export interface TransactionSubmission {
	transaction: Transaction;
	updateFixedTemplate: boolean;
}

export class TransactionModal extends Modal {
	constructor(
		app: App,
		private readonly settings: FinanceSettings,
		private readonly initial: Transaction | undefined,
		private readonly onSubmit: (submission: TransactionSubmission) => Promise<void>,
		private readonly options: TransactionModalOptions = {},
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.initial ? 'Editar transação' : 'Nova transação');
		this.modalEl.addClass('finance-vault-modal');
		let fixedTemplateId = this.initial?.fixedTemplateId ?? this.options.fixedTemplateId ?? '';
		let updateFixedTemplate = false;
		let type: TransactionType = this.initial?.type ?? 'expense';
		let date = this.initial?.date ?? this.options.date ?? todayLocal();
		let description = this.initial?.description ?? '';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		const activeTemplates = this.settings.fixedTemplates.filter((template) => !template.archived
			|| template.id === fixedTemplateId);
		const templateAccountIds = new Set(activeTemplates.map((template) => template.accountId));
		const templateCategoryIds = new Set(activeTemplates.flatMap((template) => template.categoryId ? [template.categoryId] : []));
		const accounts = this.settings.accounts.filter((account) => !account.archived
			|| account.id === this.initial?.accountId
			|| templateAccountIds.has(account.id));
		let accountId = this.initial?.accountId ?? accounts[0]?.id ?? '';
		let categoryId = this.initial?.categoryId ?? '';

		let typeDropdown: DropdownComponent;
		let accountDropdown: DropdownComponent;
		let categoryDropdown: DropdownComponent;
		let descriptionInput: TextComponent;
		let amountInput: TextComponent;
		let updateTemplateToggle: ToggleComponent;

		new Setting(this.contentEl)
			.setName('Preenchimento')
			.setDesc('Um modelo apenas preenche os campos; o resultado é uma transação normal.')
			.addDropdown((dropdown) => {
				dropdown.addOption('', 'Lançamento avulso');
				for (const template of activeTemplates) {
					dropdown.addOption(template.id, template.name);
				}
				return dropdown.setValue(fixedTemplateId).onChange((value) => {
					applyTemplate(value);
				});
			});
		const typeSetting = new Setting(this.contentEl).setName('Tipo').addDropdown((dropdown) => {
			typeDropdown = dropdown;
			return dropdown
				.addOption('expense', 'Despesa')
				.addOption('income', 'Receita')
				.setValue(type)
				.onChange((value) => {
					type = value as TransactionType;
					refreshFields();
				});
		});
		typeSetting.setClass('finance-vault-field');

		new Setting(this.contentEl).setName('Data').addText((text) => {
			text.inputEl.type = 'date';
			return text.setValue(date).onChange((value) => {
				date = value;
			});
		});
		new Setting(this.contentEl).setName('Conta').addDropdown((dropdown) => {
			accountDropdown = dropdown;
			for (const account of accounts) {
				dropdown.addOption(account.id, account.name);
			}
			return dropdown.setValue(accountId).onChange((value) => {
				accountId = value;
			});
		});
		new Setting(this.contentEl).setName('Categoria').addDropdown((dropdown) => {
			categoryDropdown = dropdown;
			return dropdown.onChange((value) => {
				categoryId = value;
			});
		});
		new Setting(this.contentEl).setName('Descrição').addText((text) => {
			descriptionInput = text;
			return text
				.setPlaceholder('Ex.: Supermercado')
				.setValue(description)
				.onChange((value) => {
					description = value;
				});
		});
		new Setting(this.contentEl).setName('Valor').setDesc('Use o formato 1234,56.').addText((text) => {
			amountInput = text;
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
			});
		});
		const updateTemplateSetting = new Setting(this.contentEl)
			.setName('Atualizar modelo')
			.setDesc('Use quando a conta, categoria ou valor padrão mudou permanentemente.')
			.addToggle((toggle) => {
				updateTemplateToggle = toggle;
				return toggle.setValue(false).onChange((value) => {
					updateFixedTemplate = value;
				});
			});

		const refreshFields = (): void => {
			typeDropdown.setValue(type);
			accountDropdown.setValue(accountId);
			categoryDropdown.selectEl.empty();
			categoryDropdown.addOption('', type === 'income' ? 'Sem categoria' : 'Selecione');
			for (const category of this.settings.categories) {
				if ((!category.archived
					|| category.id === this.initial?.categoryId
					|| templateCategoryIds.has(category.id))
					&& category.kind === type) {
					categoryDropdown.addOption(category.id, category.name);
				}
			}
			const available = Array.from(categoryDropdown.selectEl.options).some((option) => option.value === categoryId);
			if (!available) {
				categoryId = type === 'expense'
					? this.settings.categories.find((category) => !category.archived && category.kind === 'expense')?.id ?? ''
					: '';
			}
			categoryDropdown.setValue(categoryId);
			updateTemplateSetting.settingEl.toggle(Boolean(fixedTemplateId));
		};

		const applyTemplate = (id: string): void => {
			fixedTemplateId = id;
			updateFixedTemplate = false;
			updateTemplateToggle.setValue(false);
			const template = this.settings.fixedTemplates.find((candidate) => candidate.id === id);
			if (template) {
				type = template.type;
				accountId = template.accountId;
				categoryId = template.categoryId ?? '';
				description = template.name;
				amount = formatCentsForInput(template.amountCents);
				descriptionInput.setValue(description);
				amountInput.setValue(amount);
			}
			refreshFields();
		};

		if (!this.initial && fixedTemplateId) {
			applyTemplate(fixedTemplateId);
		} else {
			refreshFields();
		}

		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText('Cancelar').onClick(() => this.close()))
			.addButton((button) => button.setButtonText('Salvar').setCta().onClick(async () => {
				try {
					if (!isLocalDate(date)) {
						throw new Error('Informe uma data válida.');
					}
					const now = new Date().toISOString();
					const transaction: Transaction = {
						id: this.initial?.id ?? createId('tx'),
						date,
						type,
						accountId,
						categoryId: categoryId || undefined,
						fixedTemplateId: fixedTemplateId || undefined,
						description: description.trim(),
						amountCents: parseBrlToCents(amount),
						createdAt: this.initial?.createdAt ?? now,
						updatedAt: this.initial ? now : undefined,
					};
					validateTransaction(transaction, this.settings);
					await this.onSubmit({ transaction, updateFixedTemplate });
					this.close();
				} catch (error) {
					new Notice(error instanceof Error ? error.message : 'Não foi possível salvar a transação.');
				}
			}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
