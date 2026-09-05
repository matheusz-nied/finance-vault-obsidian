import { App, Modal, Setting } from 'obsidian';
import { createId } from '../domain/id';
import { isLocalDate, todayLocal } from '../domain/date';
import { formatCentsForInput, parseBrlToCents } from '../domain/money';
import { validateInvestment } from '../domain/validation';
import type { InvestmentCategory, InvestmentContribution } from '../types';

const CATEGORY_LABELS: Record<InvestmentCategory, string> = {
	'fixed-income': 'Fixed income',
	stock: 'Stock',
	reit: 'FII',
	crypto: 'Crypto',
	etf: 'ETF',
	other: 'Other',
};

export class InvestmentModal extends Modal {
	constructor(
		app: App,
		private readonly initial: InvestmentContribution | undefined,
		private readonly onSubmit: (contribution: InvestmentContribution) => Promise<void>,
		private readonly defaultDate = todayLocal(),
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.initial ? 'Edit investment contribution' : 'New investment contribution');
		this.modalEl.addClass('finance-vault-modal');
		this.contentEl.createEl('p', { cls: 'finance-vault-period', text: 'Record money added to an investment, not its current market value. This amount is deducted from the remaining amount for the period.' });
		let date = this.initial?.date ?? this.defaultDate;
		let asset = this.initial?.asset ?? '';
		let category: InvestmentCategory = this.initial?.category ?? 'fixed-income';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		new Setting(this.contentEl).setName('Date').addText((text) => {
			text.inputEl.type = 'date';
			return text.setValue(date).onChange((value) => {
				date = value;
			});
		});
		new Setting(this.contentEl).setName('Asset').addText((text) => text
			.setPlaceholder('E.g. Treasury bond')
			.setValue(asset)
			.onChange((value) => {
				asset = value;
			}));
		new Setting(this.contentEl).setName('Category').addDropdown((dropdown) => dropdown
			.addOptions(CATEGORY_LABELS)
			.setValue(category)
			.onChange((value) => {
				category = value as InvestmentCategory;
			}));
		new Setting(this.contentEl).setName('Contribution amount').setDesc('Amount added in reais, e.g. 500,00.').addText((text) => {
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
			});
		});
		const errorEl = this.contentEl.createDiv({ cls: 'finance-vault-error', attr: { role: 'alert' } });
		errorEl.hide();
		let saving = false;
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((button) => button.setButtonText(this.initial ? 'Save changes' : 'Save contribution').setCta().onClick(async () => {
				if (saving) return;
				saving = true;
				button.setDisabled(true).setButtonText('Saving…');
				errorEl.hide();
				try {
					if (!isLocalDate(date)) {
						throw new Error('Enter a valid date.');
					}
					const now = new Date().toISOString();
					const contribution: InvestmentContribution = {
						id: this.initial?.id ?? createId('inv'),
						date,
						asset: asset.trim(),
						category,
						amountCents: parseBrlToCents(amount),
						createdAt: this.initial?.createdAt ?? now,
						updatedAt: this.initial ? now : undefined,
					};
					validateInvestment(contribution);
					await this.onSubmit(contribution);
					this.close();
				} catch (error) {
					errorEl.setText(error instanceof Error ? error.message : 'Could not save the investment contribution.');
					errorEl.show();
				} finally {
					saving = false;
					button.setDisabled(false).setButtonText(this.initial ? 'Save changes' : 'Save contribution');
				}
			}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
