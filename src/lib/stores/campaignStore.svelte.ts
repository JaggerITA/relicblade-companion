import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import type { Campaign, CampaignBase, PathAlignment } from '$lib/models/Campaign.js';

function createCampaignStore() {
	let campaigns = $state<Campaign[]>([]);
	let loaded = $state(false);

	function getCampaignsById() {
		return new Map(campaigns.map((c) => [c.id, c]));
	}

	async function hydrate() {
		if (loaded) return;
		campaigns = await dbGetAll('campaigns');
		loaded = true;
	}

	function _reset() {
		campaigns = [];
		loaded = false;
	}

	function getCampaign(id: string): Campaign | undefined {
		return getCampaignsById().get(id);
	}

	async function persist(campaign: Campaign): Promise<Campaign> {
		// $state.snapshot() converts reactive Svelte proxies to plain objects —
		// campaign comes from the $state array, and IndexedDB cannot clone proxies.
		const plain = $state.snapshot(campaign) as Campaign;
		const updated = { ...plain, updatedAt: new Date().toISOString() };
		await dbPut('campaigns', updated);
		campaigns = campaigns.map((c) => (c.id === updated.id ? updated : c));
		return updated;
	}

	async function create(
		name: string,
		rosterId: string,
		pathAlignment: PathAlignment
	): Promise<Campaign> {
		const now = new Date().toISOString();
		const campaign: Campaign = {
			id: newId(),
			name,
			rosterId,
			pathAlignment,
			influence: 0,
			gold: 0,
			specialists: [],
			characterStates: [],
			matches: [],
			createdAt: now,
			updatedAt: now
		};
		await dbPut('campaigns', campaign);
		campaigns = [...campaigns, campaign];
		return campaign;
	}

	async function setPathAlignment(id: string, pathAlignment: PathAlignment): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, pathAlignment });
	}

	async function setBase(id: string, base: CampaignBase): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, base });
	}

	async function adjustInfluence(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, influence: Math.max(0, campaign.influence + delta) });
	}

	async function adjustGold(id: string, delta: number): Promise<void> {
		const campaign = getCampaign(id);
		if (!campaign) return;
		await persist({ ...campaign, gold: Math.max(0, campaign.gold + delta) });
	}

	async function deleteCampaign(id: string): Promise<void> {
		await dbDelete('campaigns', id);
		campaigns = campaigns.filter((c) => c.id !== id);
	}

	async function importCampaigns(incoming: Campaign[], mode: 'merge' | 'replace'): Promise<void> {
		if (mode === 'replace') {
			for (const c of campaigns) await dbDelete('campaigns', c.id);
			campaigns = [];
		}
		for (const c of incoming) {
			await dbPut('campaigns', c);
			if (!campaigns.find((x) => x.id === c.id)) campaigns = [...campaigns, c];
			else campaigns = campaigns.map((x) => (x.id === c.id ? c : x));
		}
	}

	return {
		get campaigns() { return campaigns; },
		get loaded() { return loaded; },
		hydrate,
		_reset,
		getCampaign,
		persist,
		create,
		setPathAlignment,
		setBase,
		adjustInfluence,
		adjustGold,
		deleteCampaign,
		importCampaigns
	};
}

export const campaignStore = createCampaignStore();
