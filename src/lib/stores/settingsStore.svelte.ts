import { settingsGet, settingsPut } from '$lib/utils/db.js';

export type Handedness = 'left' | 'right';

function createSettingsStore() {
	let handedness = $state<Handedness>('right');
	let loaded = $state(false);

	async function hydrate() {
		if (loaded) return;
		handedness = (await settingsGet<Handedness>('handedness')) ?? 'right';
		loaded = true;
	}

	async function setHandedness(value: Handedness) {
		handedness = value;
		await settingsPut('handedness', value);
	}

	function _reset() {
		handedness = 'right';
		loaded = false;
	}

	return {
		get handedness() { return handedness; },
		get loaded() { return loaded; },
		hydrate,
		setHandedness,
		_reset
	};
}

export const settingsStore = createSettingsStore();
