import { describe, expect, it } from 'vitest';
import { formatBrl, formatCentsForInput, parseBrlToCents, safeSum } from '../src/domain/money';

describe('dinheiro em centavos', () => {
	it('converte entrada brasileira sem armazenar ponto flutuante', () => {
		expect(parseBrlToCents('10,50')).toBe(1050);
		expect(parseBrlToCents('R$ 1.234,56')).toBe(123456);
		expect(parseBrlToCents('1,234.56')).toBe(123456);
		expect(parseBrlToCents('10.50')).toBe(1050);
		expect(parseBrlToCents('10')).toBe(1000);
		expect(formatCentsForInput(1050)).toBe('10.50');
	});

	it('formata BRL somente na apresentação', () => {
		expect(formatBrl(1050)).toMatch(/R\$\s?10\.50/);
	});

	it('rejeita frações, zero, negativos e overflow', () => {
		expect(() => parseBrlToCents('10.5000')).toThrow();
		expect(() => parseBrlToCents('1.2.3')).toThrow();
		expect(() => parseBrlToCents('0')).toThrow();
		expect(() => parseBrlToCents('-1,00')).toThrow();
		expect(() => safeSum([Number.MAX_SAFE_INTEGER, 1])).toThrow();
	});
});
