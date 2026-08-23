import { describe, expect, it } from 'vitest';
import { prepareChartSegments } from '../src/domain/chart';

describe('segmentos dos gráficos', () => {
	it('ordena os valores do maior para o menor e ignora zeros', () => {
		const result = prepareChartSegments([
			{ key: 'small', label: 'Pequeno', amountCents: 1000 },
			{ key: 'zero', label: 'Zero', amountCents: 0 },
			{ key: 'large', label: 'Grande', amountCents: 5000 },
		]);

		expect(result.map((item) => item.key)).toEqual(['large', 'small']);
	});

	it('agrupa os menores valores para manter a leitura simples', () => {
		const result = prepareChartSegments([
			{ key: 'a', label: 'A', amountCents: 6000 },
			{ key: 'b', label: 'B', amountCents: 5000 },
			{ key: 'c', label: 'C', amountCents: 4000 },
			{ key: 'd', label: 'D', amountCents: 3000 },
			{ key: 'e', label: 'E', amountCents: 2000 },
			{ key: 'f', label: 'F', amountCents: 1000 },
			{ key: 'g', label: 'G', amountCents: 500 },
		], 6);

		expect(result).toHaveLength(6);
		expect(result[5]).toEqual({
			key: '__other__',
			label: 'Outros (2)',
			amountCents: 1500,
		});
	});
});
