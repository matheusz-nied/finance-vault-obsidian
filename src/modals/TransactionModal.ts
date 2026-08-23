import {
	App,
	Modal,
	Notice,
	Setting,
	type DropdownComponent,
	type TextComponent,
	type ToggleComponent,
} from 'obsidian';
import { formatLocalDate, isLocalDate, todayLocal } from '../domain/date';
import { createId } from '../domain/id';
import {
	buildInstallmentTransactions,
	MAX_INSTALLMENT_COUNT,
} from '../domain/installments';
import { formatBrl, formatCentsForInput, parseBrlToCents } from '../domain/money';
import { validateTransaction } from '../domain/validation';
import type { FinanceSettings, Transaction, TransactionType } from '../types';

export interface TransactionModalOptions {
	fixedTemplateId?: string;
	date?: string;
}

export interface TransactionSubmission {
	transactions: Transaction[];
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
		const editingInstallment = Boolean(this.initial?.installmentPlanId);
		let fixedTemplateId = this.initial?.fixedTemplateId ?? this.options.fixedTemplateId ?? '';
		let updateFixedTemplate = false;
		let type: TransactionType = this.initial?.type ?? 'expense';
		let date = this.initial?.date ?? this.options.date ?? todayLocal();
		let description = this.initial?.description ?? '';
		let amount = this.initial ? formatCentsForInput(this.initial.amountCents) : '';
		let installmentMode = false;
		let installmentCount = '2';
		let firstInstallmentDate = date;
		let firstInstallmentTouched = false;
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
		let firstInstallmentInput: TextComponent;
		let paymentDropdown: DropdownComponent;
		let updateTemplateToggle: ToggleComponent;

		const fillSetting = new Setting(this.contentEl)
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
				.setDisabled(editingInstallment)
				.onChange((value) => {
					type = value as TransactionType;
					refreshFields();
				});
		});
		typeSetting.setClass('finance-vault-field');

		const dateSetting = new Setting(this.contentEl).setName('Data').addText((text) => {
			text.inputEl.type = 'date';
			return text.setValue(date).onChange((value) => {
				const previous = date;
				date = value;
				if (!firstInstallmentTouched || firstInstallmentDate === previous) {
					firstInstallmentDate = value;
					firstInstallmentInput.setValue(value);
				}
				renderPreview();
			});
		});
		new Setting(this.contentEl).setName('Conta').addDropdown((dropdown) => {
			accountDropdown = dropdown;
			for (const account of accounts) {
				dropdown.addOption(account.id, account.name);
			}
			return dropdown.setValue(accountId).onChange((value) => {
				accountId = value;
				refreshFields();
			});
		});
		new Setting(this.contentEl).setName('Categoria').addDropdown((dropdown) => {
			categoryDropdown = dropdown;
			return dropdown.onChange((value) => {
				categoryId = value;
				renderPreview();
			});
		});
		new Setting(this.contentEl).setName('Descrição').addText((text) => {
			descriptionInput = text;
			return text
				.setPlaceholder('Ex.: Supermercado')
				.setValue(description)
				.onChange((value) => {
					description = value;
					renderPreview();
				});
		});
		const amountSetting = new Setting(this.contentEl).setName('Valor').setDesc('Use o formato 1234,56.').addText((text) => {
			amountInput = text;
			text.inputEl.inputMode = 'decimal';
			return text.setPlaceholder('0,00').setValue(amount).onChange((value) => {
				amount = value;
				renderPreview();
			});
		});
		const installmentInfoSetting = new Setting(this.contentEl)
			.setName('Parcela')
			.setDesc(editingInstallment
				? `${this.initial?.installmentNumber}/${this.initial?.installmentCount} · Compra em ${formatLocalDate(this.initial?.installmentPurchaseDate ?? this.initial?.date ?? date)} · Total ${formatBrl(this.initial?.installmentTotalCents ?? this.initial?.amountCents ?? 0)}`
				: '');
		const paymentSetting = new Setting(this.contentEl)
			.setName('Pagamento')
			.setDesc('Parcelamentos criam uma despesa em cada mês.')
			.addDropdown((dropdown) => {
				paymentDropdown = dropdown;
				return dropdown
					.addOption('single', 'À vista')
					.addOption('installment', 'Parcelada')
					.setValue('single')
					.onChange((value) => {
						installmentMode = value === 'installment';
						if (installmentMode && !firstInstallmentTouched) {
							firstInstallmentDate = date;
							firstInstallmentInput.setValue(date);
						}
						refreshFields();
					});
			});
		const installmentCountSetting = new Setting(this.contentEl)
			.setName('Quantidade de parcelas')
			.setDesc(`Entre 2 e ${MAX_INSTALLMENT_COUNT}.`)
			.addText((text) => {
				text.inputEl.type = 'number';
				text.inputEl.min = '2';
				text.inputEl.max = String(MAX_INSTALLMENT_COUNT);
				return text.setValue(installmentCount).onChange((value) => {
					installmentCount = value;
					renderPreview();
				});
			});
		const firstInstallmentSetting = new Setting(this.contentEl)
			.setName('Primeira parcela')
			.setDesc('Use outro mês se a compra entrar somente na fatura seguinte.')
			.addText((text) => {
				firstInstallmentInput = text;
				text.inputEl.type = 'date';
				return text.setValue(firstInstallmentDate).onChange((value) => {
					firstInstallmentTouched = true;
					firstInstallmentDate = value;
					renderPreview();
				});
			});
		const previewSetting = new Setting(this.contentEl).setName('Prévia das parcelas');
		const preview = previewSetting.controlEl.createDiv({ cls: 'finance-vault-installment-preview' });
		const updateTemplateSetting = new Setting(this.contentEl)
			.setName('Atualizar modelo')
			.setDesc('Use quando a conta, categoria ou valor padrão mudou permanentemente.')
			.addToggle((toggle) => {
				updateTemplateToggle = toggle;
				return toggle.setValue(false).onChange((value) => {
					updateFixedTemplate = value;
				});
			});

		const canInstallment = (): boolean => !this.initial
			&& !fixedTemplateId
			&& type === 'expense'
			&& this.settings.accounts.find((account) => account.id === accountId)?.kind === 'credit-card';

		const renderPreview = (): void => {
			preview.empty();
			if (!installmentMode || !canInstallment()) {
				return;
			}
			try {
				const installments = buildInstallmentTransactions({
					planId: 'preview',
					purchaseDate: date,
					firstInstallmentDate,
					description: description || 'Compra parcelada',
					accountId,
					categoryId,
					totalCents: parseBrlToCents(amount),
					installmentCount: Number(installmentCount),
					createdAt: new Date().toISOString(),
				}, (number) => `preview-${number}`);
				const visible = installments.length <= 7
					? installments
					: [...installments.slice(0, 4), ...installments.slice(-2)];
				const list = preview.createEl('ul');
				for (const installment of visible) {
					if (installments.length > 7 && installment === visible[4]) {
						list.createEl('li', { text: '…' });
					}
					list.createEl('li', {
						text: `${installment.installmentNumber}/${installment.installmentCount} · ${formatLocalDate(installment.date)} · ${formatBrl(installment.amountCents)}`,
					});
				}
			} catch (error) {
				preview.createSpan({
					cls: 'finance-vault-period',
					text: error instanceof Error ? error.message : 'Preencha os dados para visualizar as parcelas.',
				});
			}
		};

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
			if (!canInstallment()) {
				installmentMode = false;
				paymentDropdown.setValue('single');
			}
			fillSetting.settingEl.toggle(!editingInstallment);
			installmentInfoSetting.settingEl.toggle(editingInstallment);
			paymentSetting.settingEl.toggle(canInstallment());
			installmentCountSetting.settingEl.toggle(installmentMode && canInstallment());
			firstInstallmentSetting.settingEl.toggle(installmentMode && canInstallment());
			previewSetting.settingEl.toggle(installmentMode && canInstallment());
			updateTemplateSetting.settingEl.toggle(Boolean(fixedTemplateId) && !installmentMode);
			dateSetting.setName(editingInstallment ? 'Data da parcela' : installmentMode ? 'Data da compra' : 'Data');
			amountSetting.setName(editingInstallment ? 'Valor da parcela' : installmentMode ? 'Valor total' : 'Valor');
			renderPreview();
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
					if (installmentMode && canInstallment()) {
						const transactions = buildInstallmentTransactions({
							planId: createId('installment'),
							purchaseDate: date,
							firstInstallmentDate,
							description: description.trim(),
							accountId,
							categoryId,
							totalCents: parseBrlToCents(amount),
							installmentCount: Number(installmentCount),
							createdAt: now,
						}, () => createId('tx'));
						for (const transaction of transactions) {
							validateTransaction(transaction, this.settings);
						}
						await this.onSubmit({ transactions, updateFixedTemplate: false });
						new Notice(`${transactions.length} parcelas foram criadas.`);
						this.close();
						return;
					}
					const transaction: Transaction = {
						id: this.initial?.id ?? createId('tx'),
						date,
						type,
						accountId,
						categoryId: categoryId || undefined,
						fixedTemplateId: fixedTemplateId || undefined,
						installmentPlanId: this.initial?.installmentPlanId,
						installmentNumber: this.initial?.installmentNumber,
						installmentCount: this.initial?.installmentCount,
						installmentTotalCents: this.initial?.installmentTotalCents,
						installmentPurchaseDate: this.initial?.installmentPurchaseDate,
						description: description.trim(),
						amountCents: parseBrlToCents(amount),
						createdAt: this.initial?.createdAt ?? now,
						updatedAt: this.initial ? now : undefined,
					};
					validateTransaction(transaction, this.settings);
					await this.onSubmit({ transactions: [transaction], updateFixedTemplate });
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
