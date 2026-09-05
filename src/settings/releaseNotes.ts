import type { FinancePluginData } from '../types';

export function shouldShowReleaseNotes(data: FinancePluginData, version: string, existingInstall: boolean): boolean {
	return existingInstall && data.showReleaseNotes !== false && data.lastSeenReleaseVersion !== version;
}
