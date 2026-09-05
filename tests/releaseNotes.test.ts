import { describe, expect, it } from 'vitest';
import { normalizePluginData } from '../src/settings/settings';
import { shouldShowReleaseNotes } from '../src/settings/releaseNotes';

describe('release notes visibility', () => {
	it('does not treat a new install as an update', () => {
		expect(shouldShowReleaseNotes(normalizePluginData(null), '0.2.1', false)).toBe(false);
	});
	it('shows an unseen update, including installs predating release notes', () => {
		expect(shouldShowReleaseNotes(normalizePluginData({}), '0.2.1', true)).toBe(true);
		expect(shouldShowReleaseNotes(normalizePluginData({ lastSeenReleaseVersion: '0.1.0' }), '0.2.1', true)).toBe(true);
	});
	it('preserves the seen version and disabled preference on reload', () => {
		expect(shouldShowReleaseNotes(normalizePluginData({ lastSeenReleaseVersion: '0.2.1' }), '0.2.1', true)).toBe(false);
		expect(shouldShowReleaseNotes(normalizePluginData({ showReleaseNotes: false }), '0.2.1', true)).toBe(false);
	});
});
