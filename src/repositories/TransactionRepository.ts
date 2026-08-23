import type { Vault } from 'obsidian';
import type { FinanceSettings, Transaction } from '../types';
import { validateTransaction } from '../domain/validation';
import { TRANSACTION_SCHEMA, transactionFromCells, transactionToCells } from '../persistence/schemas';
import { MonthlyMarkdownRepository, type MoveJournal } from './MonthlyMarkdownRepository';

export class TransactionRepository extends MonthlyMarkdownRepository<Transaction> {
	constructor(
		vault: Vault,
		getDataRoot: () => string,
		getSettings: () => FinanceSettings,
		journal: MoveJournal,
	) {
		super(
			vault,
			getDataRoot,
			'Transacoes',
			'transaction',
			TRANSACTION_SCHEMA,
			{
				toCells: transactionToCells,
				fromCells: transactionFromCells,
				validate: (record) => validateTransaction(record, getSettings()),
			},
			journal,
		);
	}
}
