import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/db.js', () => ({
	dbGetAll: vi.fn(),
	dbPut: vi.fn(),
	dbDelete: vi.fn()
}));

vi.mock('$lib/utils/id.js', () => ({
	newId: vi.fn()
}));

import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { campaignStore } from './campaignStore.svelte.js';
import type { Campaign } from '$lib/models/Campaign.js';

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
	return {
		id: 'campaign-1',
		name: 'Test Campaign',
		rosterId: 'roster-1',
		pathAlignment: 'advocate',
		influence: 0,
		gold: 0,
		specialists: [],
		characterStates: [],
		matches: [],
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

describe('campaignStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(dbGetAll).mockResolvedValue([]);
		vi.mocked(dbPut).mockResolvedValue(undefined);
		vi.mocked(dbDelete).mockResolvedValue(undefined);
		vi.mocked(newId).mockReturnValue('campaign-1');
		campaignStore._reset();
	});

	describe('hydrate', () => {
		it('loads campaigns from the db once', async () => {
			vi.mocked(dbGetAll).mockResolvedValue([makeCampaign()]);

			await campaignStore.hydrate();

			expect(campaignStore.loaded).toBe(true);
			expect(campaignStore.campaigns).toHaveLength(1);
			expect(dbGetAll).toHaveBeenCalledWith('campaigns');

			await campaignStore.hydrate();
			expect(dbGetAll).toHaveBeenCalledTimes(1);
		});
	});

	describe('create', () => {
		it('creates a campaign linked to a roster with empty encampment state', async () => {
			const campaign = await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			expect(campaign.id).toBe('campaign-1');
			expect(campaign.rosterId).toBe('roster-1');
			expect(campaign.pathAlignment).toBe('advocate');
			expect(campaign.influence).toBe(0);
			expect(campaign.gold).toBe(0);
			expect(campaign.base).toBeUndefined();
			expect(campaign.specialists).toEqual([]);
			expect(campaign.characterStates).toEqual([]);
			expect(campaign.matches).toEqual([]);
			expect(dbPut).toHaveBeenCalledWith('campaigns', expect.objectContaining({ id: 'campaign-1' }));
			expect(campaignStore.campaigns).toContainEqual(campaign);
		});
	});

	describe('getCampaign', () => {
		it('returns the campaign by id', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			expect(campaignStore.getCampaign('campaign-1')?.name).toBe('Volgelands');
			expect(campaignStore.getCampaign('missing')).toBeUndefined();
		});
	});

	describe('persist', () => {
		it('updates a campaign and bumps updatedAt', async () => {
			const campaign = await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			const updated = await campaignStore.persist({ ...campaign, influence: 10 });

			expect(updated.influence).toBe(10);
			expect(updated.updatedAt).not.toBe(campaign.createdAt === campaign.updatedAt ? '' : campaign.updatedAt);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(10);
			expect(dbPut).toHaveBeenCalledWith('campaigns', expect.objectContaining({ influence: 10 }));
		});
	});

	describe('setPathAlignment', () => {
		it('updates the path alignment', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			await campaignStore.setPathAlignment('campaign-1', 'adversary');

			expect(campaignStore.getCampaign('campaign-1')?.pathAlignment).toBe('adversary');
		});
	});

	describe('setBase', () => {
		it('sets the campaign base', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			await campaignStore.setBase('campaign-1', {
				type: 'Arcane Tower',
				name: 'Sunspire Keep',
				notes: 'Extra Fate Weave'
			});

			expect(campaignStore.getCampaign('campaign-1')?.base).toEqual({
				type: 'Arcane Tower',
				name: 'Sunspire Keep',
				notes: 'Extra Fate Weave'
			});
		});
	});

	describe('adjustInfluence / adjustGold', () => {
		it('adjusts and clamps resources at 0', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			await campaignStore.adjustInfluence('campaign-1', 5);
			await campaignStore.adjustGold('campaign-1', 3);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(5);
			expect(campaignStore.getCampaign('campaign-1')?.gold).toBe(3);

			await campaignStore.adjustInfluence('campaign-1', -10);
			await campaignStore.adjustGold('campaign-1', -10);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(0);
			expect(campaignStore.getCampaign('campaign-1')?.gold).toBe(0);
		});
	});

	describe('deleteCampaign', () => {
		it('removes the campaign from state and db', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			await campaignStore.deleteCampaign('campaign-1');

			expect(campaignStore.campaigns).toHaveLength(0);
			expect(dbDelete).toHaveBeenCalledWith('campaigns', 'campaign-1');
		});
	});

	describe('importCampaigns', () => {
		it('merges incoming campaigns, adding new and updating existing', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			const incoming = [
				makeCampaign({ id: 'campaign-1', name: 'Volgelands Updated' }),
				makeCampaign({ id: 'campaign-2', name: 'Second Campaign' })
			];

			await campaignStore.importCampaigns(incoming, 'merge');

			expect(campaignStore.campaigns).toHaveLength(2);
			expect(campaignStore.getCampaign('campaign-1')?.name).toBe('Volgelands Updated');
			expect(campaignStore.getCampaign('campaign-2')?.name).toBe('Second Campaign');
		});

		it('replaces all campaigns when mode is replace', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			const incoming = [makeCampaign({ id: 'campaign-2', name: 'Second Campaign' })];

			await campaignStore.importCampaigns(incoming, 'replace');

			expect(campaignStore.campaigns).toHaveLength(1);
			expect(campaignStore.getCampaign('campaign-1')).toBeUndefined();
			expect(campaignStore.getCampaign('campaign-2')?.name).toBe('Second Campaign');
			expect(dbDelete).toHaveBeenCalledWith('campaigns', 'campaign-1');
		});
	});
});
