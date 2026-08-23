import { safeSum } from './money';

export interface ChartSegment {
	key: string;
	label: string;
	amountCents: number;
}

export function prepareChartSegments(
	items: readonly ChartSegment[],
	maximumSegments = 6,
): ChartSegment[] {
	if (maximumSegments < 2) {
		throw new Error('O gráfico precisa permitir pelo menos dois segmentos.');
	}
	const sorted = items
		.filter((item) => item.amountCents > 0)
		.sort((left, right) => right.amountCents - left.amountCents);
	if (sorted.length <= maximumSegments) {
		return sorted;
	}
	const visible = sorted.slice(0, maximumSegments - 1);
	const remaining = sorted.slice(maximumSegments - 1);
	return [
		...visible,
		{
			key: '__other__',
			label: `Outros (${remaining.length})`,
			amountCents: safeSum(remaining.map((item) => item.amountCents)),
		},
	];
}
