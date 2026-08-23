import { describe, expect, it } from 'vitest';
import { fixedTemplatesForMonth } from '../src/domain/fixedTemplates';
import { normalizePluginData } from '../src/settings/settings';
import type { FixedTemplate, Transaction } from '../src/types';

const templates: FixedTemplate[] = [
	{ id: 'chatgpt', name: 'ChatGPT', type: 'expense', accountId: 'credit-card', categoryId: 'other-expense', amountCents: 10000, archived: false },
	{ id: 'salary', name: 'Salário', type: 'income', accountId: 'bank', categoryId: 'salary', amountCents: 500000, archived: false },
	{ id: 'old', name: 'Assinatura antiga', type: 'expense', accountId: 'credit-card', categoryId: 'other-expense', amountCents: 2000, archived: true },
];

const transactions: Transaction[] = [
	{ id: 'aug-chatgpt', date: '2026-08-12', type: 'expense', accountId: 'credit-card', categoryId: 'other-expense', fixedTemplateId: 'chatgpt', description: 'ChatGPT', amountCents: 10490, createdAt: '2026-08-12T10:00:00Z' },
	{ id: 'sep-chatgpt', date: '2026-09-12', type: 'expense', accountId: 'credit-card', categoryId: 'other-expense', fixedTemplateId: 'chatgpt', description: 'ChatGPT', amountCents: 10990, createdAt: '2026-09-12T10:00:00Z' },
];

describe('modelos fixos', () => {
	it('identifica lançamentos do mês sem criar status persistido', () => {
		const items = fixedTemplatesForMonth(templates, transactions, '2026-08-23');
		expect(items.map((item) => item.template.id)).toEqual(['chatgpt', 'salary']);
		expect(items[0]?.transactions.map((transaction) => transaction.id)).toEqual(['aug-chatgpt']);
		expect(items[0]?.launchedCents).toBe(10490);
		expect(items[1]?.transactions).toEqual([]);
	});

	it('migra configurações antigas e normaliza modelos válidos', () => {
		expect(normalizePluginData({ settings: {} }).settings.fixedTemplates).toEqual([]);
		const data = normalizePluginData({ settings: { fixedTemplates: templates } });
		expect(data.settings.schemaVersion).toBe(2);
		expect(data.settings.fixedTemplates).toHaveLength(3);
	});
});
