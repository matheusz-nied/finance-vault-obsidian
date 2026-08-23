import type { Vault } from 'obsidian';
import type { InvestmentContribution } from '../types';
import { validateInvestment } from '../domain/validation';
import { INVESTMENT_SCHEMA, investmentFromCells, investmentToCells } from '../persistence/schemas';
import { MonthlyMarkdownRepository, type MoveJournal } from './MonthlyMarkdownRepository';

export class InvestmentRepository extends MonthlyMarkdownRepository<InvestmentContribution> {
	constructor(vault: Vault, getDataRoot: () => string, journal: MoveJournal) {
		super(
			vault,
			getDataRoot,
			'Investimentos',
			'investment',
			INVESTMENT_SCHEMA,
			{
				toCells: investmentToCells,
				fromCells: investmentFromCells,
				validate: validateInvestment,
			},
			journal,
		);
	}
}
