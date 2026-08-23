import { App, Modal, Notice, Setting } from 'obsidian';
import { createId } from '../domain/id';
import { isLocalDate, todayLocal } from '../domain/date';
import { formatCentsForInput, parseBrlToCents } from '../domain/money';
import { validateInvestment } from '../domain/validation';
import type { InvestmentCategory, InvestmentContribution } from '../types';

const CATEGORY_LABELS: Record<InvestmentCategory, string> = {
	'fixed-income': 'Renda fixa',
	stock: 'Ação',
	reit: 'FII',
	crypto: 'Cripto',
	etf: 'ETF',
	other: 'Outro',
};

export class InvestmentModal extends Modal {
	constructor(
		app: App,
		private readonly initial: InvestmentContribution | undefined,
		private readonly onSubmit: (contribution: InvestmentContribution) => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.initial ? 'Editar aporte' : 'Novo aporte');
		this.modalEl.addClass('finance-vault-modal');
		let date = this.initial?.date ?? todayLocal();
		let asset = this.initial?.asset ?? '';
		let category: InvestmentCategory = this.initial?.category ?? 'fixed-income';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		new Setting(this.contentEl).setName('Data').addText((text) => {
			text.inputEl.type = 'date';
			return text.setValue(date).onChange((value) => {
				date = value;
			});
		});
		new Setting(this.contentEl).setName('Ativo').addText((text) => text
			.setPlaceholder('Ex.: Tesouro selic')
			.setValue(asset)
			.onChange((value) => {
				asset = value;
			}));
		new Setting(this.contentEl).setName('Categoria').addDropdown((dropdown) => dropdown
			.addOptions(CATEGORY_LABELS)
			.setValue(category)
			.onChange((value) => {
				category = value as InvestmentCategory;
			}));
		new Setting(this.contentEl).setName('Valor').setDesc('Use o formato 1234,56.').addText((text) => {
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
			});
		});
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText('Cancelar').onClick(() => this.close()))
			.addButton((button) => button.setButtonText('Salvar').setCta().onClick(async () => {
				try {
					if (!isLocalDate(date)) {
						throw new Error('Informe uma data válida.');
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
					new Notice(error instanceof Error ? error.message : 'Não foi possível salvar o aporte.');
				}
			}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
