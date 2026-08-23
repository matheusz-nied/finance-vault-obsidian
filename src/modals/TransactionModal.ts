import { App, Modal, Notice, Setting, type DropdownComponent } from 'obsidian';
import { createId } from '../domain/id';
import { formatCentsForInput, parseBrlToCents } from '../domain/money';
import { isLocalDate, todayLocal } from '../domain/date';
import { validateTransaction } from '../domain/validation';
import type { FinanceSettings, Transaction, TransactionType } from '../types';

export class TransactionModal extends Modal {
	constructor(
		app: App,
		private readonly settings: FinanceSettings,
		private readonly initial: Transaction | undefined,
		private readonly onSubmit: (transaction: Transaction) => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.initial ? 'Editar transação' : 'Nova transação');
		this.modalEl.addClass('finance-vault-modal');
		let type: TransactionType = this.initial?.type ?? 'expense';
		let date = this.initial?.date ?? todayLocal();
		let description = this.initial?.description ?? '';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		const accounts = this.settings.accounts.filter((account) => !account.archived
			|| account.id === this.initial?.accountId);
		let accountId = this.initial?.accountId ?? accounts[0]?.id ?? '';
		let categoryId = this.initial?.categoryId ?? '';

		let accountDropdown: DropdownComponent;
		let categoryDropdown: DropdownComponent;
		const typeSetting = new Setting(this.contentEl).setName('Tipo').addDropdown((dropdown) => dropdown
			.addOption('expense', 'Despesa')
			.addOption('income', 'Receita')
			.setValue(type)
			.onChange((value) => {
				type = value as TransactionType;
				refreshFields();
			}));
		typeSetting.setClass('finance-vault-field');

		new Setting(this.contentEl).setName('Data').addText((text) => {
			text.inputEl.type = 'date';
			return text.setValue(date).onChange((value) => {
				date = value;
			});
		});
		const accountSetting = new Setting(this.contentEl).setName('Conta').addDropdown((dropdown) => {
			accountDropdown = dropdown;
			for (const account of accounts) {
				dropdown.addOption(account.id, account.name);
			}
			return dropdown.setValue(accountId).onChange((value) => {
				accountId = value;
			});
		});
		const categorySetting = new Setting(this.contentEl).setName('Categoria').addDropdown((dropdown) => {
			categoryDropdown = dropdown;
			return dropdown.onChange((value) => {
				categoryId = value;
			});
		});
		new Setting(this.contentEl).setName('Descrição').addText((text) => text
			.setPlaceholder('Ex.: Supermercado')
			.setValue(description)
			.onChange((value) => {
				description = value;
			}));
		new Setting(this.contentEl).setName('Valor').setDesc('Use o formato 1234,56.').addText((text) => {
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
			});
		});

		const refreshFields = (): void => {
			accountDropdown.setValue(accountId);
			categoryDropdown.selectEl.empty();
			categoryDropdown.addOption('', type === 'income' ? 'Sem categoria' : 'Selecione');
			for (const category of this.settings.categories) {
				if ((!category.archived || category.id === this.initial?.categoryId) && category.kind === type) {
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
		};
		refreshFields();

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
						description: description.trim(),
						amountCents: parseBrlToCents(amount),
						createdAt: this.initial?.createdAt ?? now,
						updatedAt: this.initial ? now : undefined,
					};
					validateTransaction(transaction, this.settings);
					await this.onSubmit(transaction);
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
