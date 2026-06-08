import { settingsPut } from '$lib/utils/db.js';
import type { Collection } from '$lib/models/Collection.js';

export function downloadCollection(collection: Collection): void {
	const json = JSON.stringify(collection, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `relicblade-backup-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	settingsPut('lastBackupDate', new Date().toISOString());
}

export async function readCollectionFile(file: File): Promise<Collection> {
	const text = await file.text();
	const data = JSON.parse(text) as unknown;
	if (
		typeof data !== 'object' ||
		data === null ||
		!Array.isArray((data as Record<string, unknown>).characters) ||
		!Array.isArray((data as Record<string, unknown>).upgrades)
	) {
		throw new Error('Invalid backup file — missing characters or upgrades arrays.');
	}
	return data as Collection;
}

export function daysSinceBackup(isoDate: string | undefined): number | null {
	if (!isoDate) return null;
	return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}
