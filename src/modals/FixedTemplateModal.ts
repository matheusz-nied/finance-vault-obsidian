import {
	App,
	Modal,
	Notice,
	Setting,
	type DropdownComponent,
} from 'obsidian';
import { createId } from '../domain/id';
import { formatCentsForInput, parseBrlToCents } from '../domain/money';
import { validateFixedTemplate } from '../domain/validation';
import type { FinanceSettings, FixedTemplate, TransactionType } from '../types';

export class FixedTemplateModal extends Modal {
	constructor(
		app: App,
		private readonly settings: FinanceSettings,
		private readonly initial: FixedTemplate | undefined,
		private readonly onSubmit: (template: FixedTemplate) => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.initial ? 'Edit recurring template' : 'New recurring template');
		this.modalEl.addClass('finance-vault-modal');
		let name = this.initial?.name ?? '';
		let type: TransactionType = this.initial?.type ?? 'expense';
		const accounts = this.settings.accounts.filter((account) => !account.archived
			|| account.id === this.initial?.accountId);
		let accountId = this.initial?.accountId ?? accounts[0]?.id ?? '';
		let categoryId = this.initial?.categoryId ?? '';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		let categoryDropdown: DropdownComponent;

		new Setting(this.contentEl).setName('Name').addText((text) => text
			.setPlaceholder('E.g. Monthly subscription')
			.setValue(name)
			.onChange((value) => {
				name = value;
			}));
		new Setting(this.contentEl).setName('Type').addDropdown((dropdown) => dropdown
			.addOption('expense', 'Expense')
			.addOption('income', 'Income')
			.setValue(type)
			.onChange((value) => {
				type = value as TransactionType;
				refreshCategories();
			}));
		new Setting(this.contentEl).setName('Account').addDropdown((dropdown) => {
			for (const account of accounts) {
				dropdown.addOption(account.id, account.name);
			}
			return dropdown.setValue(accountId).onChange((value) => {
				accountId = value;
			});
		});
		new Setting(this.contentEl).setName('Category').addDropdown((dropdown) => {
			categoryDropdown = dropdown;
			return dropdown.onChange((value) => {
				categoryId = value;
			});
		});
		new Setting(this.contentEl).setName('Suggested amount').setDesc('You can adjust it for each entry.').addText((text) => {
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
			});
		});

		const refreshCategories = (): void => {
			categoryDropdown.selectEl.empty();
			categoryDropdown.addOption('', type === 'income' ? 'No category' : 'Select');
			for (const category of this.settings.categories) {
				if ((!category.archived || category.id === this.initial?.categoryId) && category.kind === type) {
					categoryDropdown.addOption(category.id, category.name);
				}
			}
			const available = Array.from(categoryDropdown.selectEl.options)
				.some((option) => option.value === categoryId);
			if (!available) {
				categoryId = type === 'expense'
					? this.settings.categories.find((category) => !category.archived && category.kind === 'expense')?.id ?? ''
					: '';
			}
			categoryDropdown.setValue(categoryId);
		};
		refreshCategories();

		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((button) => button.setButtonText('Save').setCta().onClick(async () => {
				try {
					const template: FixedTemplate = {
						id: this.initial?.id ?? createId('fixed'),
						name: name.trim(),
						type,
						accountId,
						categoryId: categoryId || undefined,
						amountCents: parseBrlToCents(amount),
						archived: this.initial?.archived ?? false,
					};
					validateFixedTemplate(template, this.settings);
					await this.onSubmit(template);
					this.close();
				} catch (error) {
					new Notice(error instanceof Error ? error.message : 'Could not save the recurring template.');
				}
			}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
