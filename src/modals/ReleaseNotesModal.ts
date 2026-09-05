import { App, Modal } from 'obsidian';

export const PROJECT_URL = 'https://github.com/matheusz-nied/finance-vault-obsidian';

export class ReleaseNotesModal extends Modal {
	constructor(app: App, private readonly markSeen: () => void) {
		super(app);
	}

	onOpen(): void {
		this.setTitle('Finance Vault 0.2.1');
		this.contentEl.createEl('p', { text: 'Thanks for using the plugin. These notes appear after updates; you can turn this off in settings.' });
		this.contentEl.createEl('h3', { text: 'New' });
		const added = this.contentEl.createEl('ul');
		added.createEl('li', { text: 'Delete a scheduled financial cycle rule in the financial cycle settings before it takes effect. Active and past rules are kept to preserve cycle history.' });
		added.createEl('li', { text: 'Reopen these notes from the command palette, or disable automatic release notes in settings.' });
		this.contentEl.createEl('h3', { text: 'Improved' });
		this.contentEl.createEl('p', { text: 'Financial cycle settings separate the effective date from the monthly start day, with labels and a concrete example.' });
		this.contentEl.createEl('h3', { text: 'Fixed' });
		this.contentEl.createEl('p', { text: 'The suggested effective date follows the last scheduled rule, avoiding an invalid default when a future rule already exists.' });
		const history = this.contentEl.createEl('details');
		history.createEl('summary', { text: 'Previous releases' });
		history.createEl('a', { text: 'Read the changelog on GitHub ↗', href: `${PROJECT_URL}/blob/main/CHANGELOG.md`, attr: { target: '_blank', rel: 'noopener noreferrer' } });
		this.contentEl.createEl('hr');
		this.contentEl.createEl('p', { text: 'If this plugin helps you, a star on GitHub supports the project.' });
		this.contentEl.createEl('a', { text: 'Star on GitHub ↗', href: PROJECT_URL, attr: { target: '_blank', rel: 'noopener noreferrer' } });
	}

	onClose(): void {
		this.contentEl.empty();
		this.markSeen();
	}
}
