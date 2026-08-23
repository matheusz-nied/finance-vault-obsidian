import { monthKey } from './date';
import { safeSum } from './money';
import type { FixedTemplate, Transaction } from '../types';

export interface FixedTemplateMonthItem {
	template: FixedTemplate;
	transactions: Transaction[];
	launchedCents: number;
}

export function fixedTemplatesForMonth(
	templates: readonly FixedTemplate[],
	transactions: readonly Transaction[],
	monthDate: string,
): FixedTemplateMonthItem[] {
	const key = monthKey(monthDate);
	return templates
		.filter((template) => !template.archived)
		.map((template) => {
			const occurrences = transactions
				.filter((transaction) => transaction.fixedTemplateId === template.id && monthKey(transaction.date) === key)
				.sort((left, right) => left.date.localeCompare(right.date));
			return {
				template,
				transactions: occurrences,
				launchedCents: safeSum(occurrences.map((transaction) => transaction.amountCents)),
			};
		})
		.sort((left, right) => left.template.name.localeCompare(right.template.name, 'pt-BR'));
}
