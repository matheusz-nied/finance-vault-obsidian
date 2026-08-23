export class TFile {
	path = '';
}

export class TFolder {
	path = '';
}

export class Vault {}

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
}
