import { safeSum } from './money';

export interface ChartSegment {
	key: string;
	label: string;
	amountCents: number;
}

export interface DonutSlice extends ChartSegment {
	offsetPercentage: number;
	percentage: number;
}

export function prepareChartSegments(
	items: readonly ChartSegment[],
	maximumSegments = 6,
): ChartSegment[] {
	if (maximumSegments < 2) {
		throw new Error('The chart must allow at least two segments.');
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
			label: `Other (${remaining.length})`,
			amountCents: safeSum(remaining.map((item) => item.amountCents)),
		},
	];
}

export function calculateDonutSlices(
	segments: readonly ChartSegment[],
	totalCents: number,
): DonutSlice[] {
	let offsetPercentage = 0;
	return segments.map((segment, index) => {
		const percentage = totalCents > 0
			? index === segments.length - 1
				? 100 - offsetPercentage
				: segment.amountCents / totalCents * 100
			: 0;
		const slice = { ...segment, offsetPercentage, percentage };
		offsetPercentage += percentage;
		return slice;
	});
}
