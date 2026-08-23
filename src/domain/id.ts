export function createId(prefix: string): string {
	const random = new Uint8Array(16);
	activeWindow.crypto.getRandomValues(random);
	const suffix = Array.from(random, (value) => value.toString(16).padStart(2, '0')).join('');
	return `${prefix}-${suffix}`;
}
