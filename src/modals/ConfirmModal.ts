import { App, Modal, Setting } from 'obsidian';

export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly message: string,
		private readonly onConfirm: () => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Confirmar exclusão');
		this.contentEl.createEl('p', { text: this.message });
		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText('Cancelar').onClick(() => this.close()))
			.addButton((button) => button
				.setButtonText('Excluir')
				.setDestructive()
				.setCta()
				.onClick(async () => {
					await this.onConfirm();
					this.close();
				}));
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
