import {
	Notice,
	Plugin,
	TFile,
	TFolder,
	normalizePath,
} from 'obsidian';
import { ReleaseNotesModal } from './modals/ReleaseNotesModal';
import { shouldShowReleaseNotes } from './settings/releaseNotes';
import { InvestmentModal } from './modals/InvestmentModal';
import { TransactionModal } from './modals/TransactionModal';
import { InvestmentRepository } from './repositories/InvestmentRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { FinanceSettingTab } from './settings/FinanceSettingTab';
import { normalizePluginData } from './settings/settings';
import type {
	FinancePluginData,
	FinanceSettings,
	PendingMove,
	Transaction,
} from './types';
import { DashboardView, FINANCE_VAULT_VIEW } from './views/DashboardView';

export default class FinanceVaultPlugin extends Plugin {
	data!: FinancePluginData;
	settings!: FinanceSettings;
	transactions!: TransactionRepository;
	investments!: InvestmentRepository;

	async onload(): Promise<void> {
		const storedData: unknown = await this.loadData();
		const storedSchemaVersion = storedData && typeof storedData === 'object'
			&& 'settings' in storedData && storedData.settings && typeof storedData.settings === 'object'
			&& 'schemaVersion' in storedData.settings
			? storedData.settings.schemaVersion
			: undefined;
		this.data = normalizePluginData(storedData);
		this.settings = this.data.settings;
		if (storedSchemaVersion !== this.settings.schemaVersion) {
			await this.savePluginData();
		}
		const journal = {
			setPendingMove: async (move: PendingMove | undefined): Promise<void> => {
				this.data.pendingMove = move;
				await this.savePluginData();
			},
		};
		this.transactions = new TransactionRepository(
			this.app.vault,
			() => this.settings.dataRoot,
			() => this.settings,
			journal,
		);
		this.investments = new InvestmentRepository(
			this.app.vault,
			() => this.settings.dataRoot,
			journal,
		);

		await this.recoverPendingMove();
		this.registerView(FINANCE_VAULT_VIEW, (leaf) => new DashboardView(leaf, this));
		this.addRibbonIcon('wallet-cards', 'Open finance vault', () => {
			void this.activateView();
		});
		this.addCommand({
			id: 'open-dashboard',
			name: 'Open dashboard',
			callback: () => {
				void this.activateView();
			},
		});
		this.addCommand({
			id: 'add-transaction',
			name: 'Add transaction',
			callback: () => {
				new TransactionModal(this.app, this.settings, undefined, async ({ transactions, updateFixedTemplate }) => {
					await this.transactions.createMany(transactions);
					const transaction = transactions[0];
					if (updateFixedTemplate && transaction) {
						await this.updateFixedTemplateFromTransaction(transaction);
					}
					await this.refreshViews();
				}).open();
			},
		});
		this.addCommand({
			id: 'add-contribution',
			name: 'Add investment contribution',
			callback: () => {
				new InvestmentModal(this.app, undefined, async (contribution) => {
					await this.investments.create(contribution);
					await this.refreshViews();
				}).open();
			},
		});
		this.addSettingTab(new FinanceSettingTab(this.app, this));
		this.addCommand({ id: 'open-release-notes', name: 'Open release notes', callback: () => this.openReleaseNotes() });
		const showNotes = shouldShowReleaseNotes(this.data, this.manifest.version, storedData != null);
		if (!showNotes && this.data.lastSeenReleaseVersion !== this.manifest.version) {
			this.data.lastSeenReleaseVersion = this.manifest.version;
			await this.savePluginData();
		}

		this.app.workspace.onLayoutReady(() => {
			if (showNotes) this.openReleaseNotes();
			this.registerEvent(this.app.vault.on('create', (file) => this.handleVaultChange(file.path)));
			this.registerEvent(this.app.vault.on('modify', (file) => this.handleVaultChange(file.path)));
			this.registerEvent(this.app.vault.on('delete', (file) => this.handleVaultChange(file.path)));
			this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
				this.handleVaultChange(oldPath);
				this.handleVaultChange(file.path);
			}));
		});
	}

	openReleaseNotes(): void {
		new ReleaseNotesModal(this.app, () => {
			this.data.lastSeenReleaseVersion = this.manifest.version;
			void this.savePluginData();
		}).open();
	}

	async activateView(): Promise<void> {
		let leaf = this.app.workspace.getLeavesOfType(FINANCE_VAULT_VIEW)[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({ type: FINANCE_VAULT_VIEW, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	async refreshViews(): Promise<void> {
		for (const leaf of this.app.workspace.getLeavesOfType(FINANCE_VAULT_VIEW)) {
			if (leaf.view instanceof DashboardView) {
				await leaf.view.refresh();
			}
		}
	}

	async saveSettings(): Promise<void> {
		this.data.settings = this.settings;
		await this.savePluginData();
		await this.refreshViews();
	}

	async updateFixedTemplateFromTransaction(transaction: Transaction): Promise<void> {
		const template = this.settings.fixedTemplates.find((candidate) => candidate.id === transaction.fixedTemplateId);
		if (!template) {
			return;
		}
		template.type = transaction.type;
		template.accountId = transaction.accountId ?? template.accountId;
		template.categoryId = transaction.categoryId;
		template.amountCents = transaction.amountCents;
		await this.saveSettings();
	}

	async changeDataRoot(rawPath: string): Promise<void> {
		const trimmed = rawPath.trim();
		if (!trimmed || trimmed.startsWith('/') || trimmed.split('/').includes('..')) {
			throw new Error('Enter a valid relative folder path inside the vault.');
		}
		const target = normalizePath(trimmed);
		const configDir = normalizePath(this.app.vault.configDir);
		if (target === configDir || target.startsWith(`${configDir}/`)) {
			throw new Error('The Obsidian configuration folder cannot store financial data.');
		}
		if (target === this.settings.dataRoot) {
			return;
		}
		const oldPath = normalizePath(this.settings.dataRoot);
		const source = this.app.vault.getAbstractFileByPath(oldPath);
		const destination = this.app.vault.getAbstractFileByPath(target);
		if (destination) {
			throw new Error('The destination folder already exists; no files were changed.');
		}
		if (source instanceof TFile) {
			throw new Error('The current folder path is occupied by a file.');
		}
		if (source instanceof TFolder) {
			await this.app.vault.rename(source, target);
		}
		this.settings.dataRoot = target;
		await this.saveSettings();
	}

	private async savePluginData(): Promise<void> {
		await this.saveData(this.data);
	}

	private async recoverPendingMove(): Promise<void> {
		const move = this.data.pendingMove;
		if (!move) {
			return;
		}
		try {
			if (move.entity === 'transaction') {
				await this.transactions.recoverMove(move);
			} else {
				await this.investments.recoverMove(move);
			}
			new Notice('An interrupted financial record move was recovered.');
		} catch (error) {
			new Notice(error instanceof Error
				? `Finance Vault: ${error.message}`
				: 'Finance Vault could not recover a pending record move.');
		}
	}

	private handleVaultChange(path: string): void {
		const root = normalizePath(this.settings.dataRoot);
		if (path === root || path.startsWith(`${root}/`)) {
			void this.refreshViews();
		}
	}
}
