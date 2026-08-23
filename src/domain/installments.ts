import { addMonths, compareDates, isLocalDate } from './date';
import { assertMoneyCents, safeSum } from './money';
import type { LocalDate, Transaction } from '../types';

export const MAX_INSTALLMENT_COUNT = 120;

export interface InstallmentPurchaseInput {
	planId: string;
	purchaseDate: LocalDate;
	firstInstallmentDate: LocalDate;
	description: string;
	accountId: string;
	categoryId: string;
	totalCents: number;
	installmentCount: number;
	createdAt: string;
}

export interface InstallmentPlanSummary {
	planId: string;
	description: string;
	accountId: string;
	installmentCount: number;
	totalCents: number;
	completedCount: number;
	remainingCents: number;
	next: Transaction;
	remaining: Transaction[];
}

export function splitInstallmentAmounts(totalCents: number, installmentCount: number): number[] {
	assertMoneyCents(totalCents);
	if (!Number.isInteger(installmentCount) || installmentCount < 2 || installmentCount > MAX_INSTALLMENT_COUNT) {
		throw new Error(`A quantidade de parcelas precisa estar entre 2 e ${MAX_INSTALLMENT_COUNT}.`);
	}
	if (totalCents < installmentCount) {
		throw new Error('O valor total é pequeno demais para que todas as parcelas tenham ao menos um centavo.');
	}
	const base = Math.floor(totalCents / installmentCount);
	const remainder = totalCents % installmentCount;
	return Array.from({ length: installmentCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function buildInstallmentTransactions(
	input: InstallmentPurchaseInput,
	createTransactionId: (installmentNumber: number) => string,
): Transaction[] {
	if (!input.planId.trim()) {
		throw new Error('O parcelamento precisa de um ID.');
	}
	if (!isLocalDate(input.purchaseDate) || !isLocalDate(input.firstInstallmentDate)) {
		throw new Error('Informe datas válidas para a compra e a primeira parcela.');
	}
	if (compareDates(input.firstInstallmentDate, input.purchaseDate) < 0) {
		throw new Error('A primeira parcela não pode ser anterior à data da compra.');
	}
	const amounts = splitInstallmentAmounts(input.totalCents, input.installmentCount);
	return amounts.map((amountCents, index) => ({
		id: createTransactionId(index + 1),
		date: addMonths(input.firstInstallmentDate, index),
		type: 'expense',
		accountId: input.accountId,
		categoryId: input.categoryId,
		installmentPlanId: input.planId,
		installmentNumber: index + 1,
		installmentCount: input.installmentCount,
		installmentTotalCents: input.totalCents,
		installmentPurchaseDate: input.purchaseDate,
		description: input.description.trim(),
		amountCents,
		createdAt: input.createdAt,
	}));
}

export function summarizeActiveInstallmentPlans(
	transactions: readonly Transaction[],
	asOf: LocalDate,
): InstallmentPlanSummary[] {
	const groups = new Map<string, Transaction[]>();
	for (const transaction of transactions) {
		if (!transaction.installmentPlanId || compareDates(transaction.date, asOf) < 0) {
			continue;
		}
		const group = groups.get(transaction.installmentPlanId) ?? [];
		group.push(transaction);
		groups.set(transaction.installmentPlanId, group);
	}
	const summaries: InstallmentPlanSummary[] = [];
	for (const [planId, installments] of groups) {
		installments.sort((left, right) => left.date.localeCompare(right.date)
			|| (left.installmentNumber ?? 0) - (right.installmentNumber ?? 0));
		const next = installments[0];
		if (!next || !next.installmentCount || !next.installmentTotalCents) {
			continue;
		}
		summaries.push({
			planId,
			description: next.description,
			accountId: next.accountId ?? '',
			installmentCount: next.installmentCount,
			totalCents: next.installmentTotalCents,
			completedCount: Math.max(0, (next.installmentNumber ?? 1) - 1),
			remainingCents: safeSum(installments.map((installment) => installment.amountCents)),
			next,
			remaining: installments,
		});
	}
	return summaries.sort((left, right) => left.next.date.localeCompare(right.next.date)
		|| left.description.localeCompare(right.description, 'pt-BR'));
}
