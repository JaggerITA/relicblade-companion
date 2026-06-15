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

	describe('recruitAdventurer / removeAdventurer', () => {
		it('adds a character state and deducts influence', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.adjustInfluence('campaign-1', 50);

			await campaignStore.recruitAdventurer('campaign-1', 'char-1', 10, 15);

			const campaign = campaignStore.getCampaign('campaign-1');
			expect(campaign?.influence).toBe(35);
			expect(campaign?.characterStates).toEqual([
				{
					characterId: 'char-1',
					heroicTraits: [],
					woundTraits: [],
					criticalWounds: 0,
					currentHealth: 10,
					relics: [],
					gold: 0,
					valor: 0
				}
			]);

			await campaignStore.removeAdventurer('campaign-1', 'char-1');
			expect(campaignStore.getCampaign('campaign-1')?.characterStates).toEqual([]);
		});

		it('clamps influence at 0 when the cost exceeds the pool', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');

			await campaignStore.recruitAdventurer('campaign-1', 'char-1', 10, 15);

			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(0);
		});
	});

	describe('recruitSpecialist / advanceSpecialist / removeSpecialist', () => {
		it('recruits a specialist at novice level and deducts influence', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.adjustInfluence('campaign-1', 50);

			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);

			const campaign = campaignStore.getCampaign('campaign-1');
			expect(campaign?.influence).toBe(40);
			expect(campaign?.specialists).toEqual([{ type: 'smith', level: 'novice', influencePaid: 10 }]);
		});

		it('does not recruit a second specialist of the same type', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);

			await campaignStore.recruitSpecialist('campaign-1', 'smith', 20);

			expect(campaignStore.getCampaign('campaign-1')?.specialists).toHaveLength(1);
		});

		it('advances a specialist through levels and tracks influence paid', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.adjustInfluence('campaign-1', 50);
			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);

			await campaignStore.advanceSpecialist('campaign-1', 'smith', 15);

			let specialist = campaignStore.getCampaign('campaign-1')?.specialists[0];
			expect(specialist?.level).toBe('journeyman');
			expect(specialist?.influencePaid).toBe(25);

			await campaignStore.advanceSpecialist('campaign-1', 'smith', 20);
			specialist = campaignStore.getCampaign('campaign-1')?.specialists[0];
			expect(specialist?.level).toBe('master');
			expect(specialist?.influencePaid).toBe(45);

			// Already at master — no further advancement
			await campaignStore.advanceSpecialist('campaign-1', 'smith', 5);
			specialist = campaignStore.getCampaign('campaign-1')?.specialists[0];
			expect(specialist?.level).toBe('master');
			expect(specialist?.influencePaid).toBe(45);
		});

		it('removes a specialist', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);

			await campaignStore.removeSpecialist('campaign-1', 'smith');

			expect(campaignStore.getCampaign('campaign-1')?.specialists).toEqual([]);
		});
	});

	describe('character progression', () => {
		beforeEach(async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			await campaignStore.adjustInfluence('campaign-1', 50);
			await campaignStore.recruitAdventurer('campaign-1', 'char-1', 10, 15);
		});

		it('adds and removes heroic traits', async () => {
			await campaignStore.addHeroicTrait('campaign-1', 'char-1', 'Iron Will');
			await campaignStore.addHeroicTrait('campaign-1', 'char-1', 'Quick Reflexes');

			let state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.heroicTraits).toEqual(['Iron Will', 'Quick Reflexes']);

			await campaignStore.removeHeroicTrait('campaign-1', 'char-1', 0);
			state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.heroicTraits).toEqual(['Quick Reflexes']);
		});

		it('adds and removes wound traits', async () => {
			await campaignStore.addWoundTrait('campaign-1', 'char-1', 'Limp');

			let state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.woundTraits).toEqual(['Limp']);

			await campaignStore.removeWoundTrait('campaign-1', 'char-1', 0);
			state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.woundTraits).toEqual([]);
		});

		it('adds and removes relics', async () => {
			await campaignStore.addRelic('campaign-1', 'char-1', 'Ring of the Fox');

			let state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.relics).toEqual(['Ring of the Fox']);

			await campaignStore.removeRelic('campaign-1', 'char-1', 0);
			state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.relics).toEqual([]);
		});

		it('adjusts critical wounds and clamps at 0', async () => {
			await campaignStore.adjustCriticalWounds('campaign-1', 'char-1', 1);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.criticalWounds).toBe(1);

			await campaignStore.adjustCriticalWounds('campaign-1', 'char-1', -5);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.criticalWounds).toBe(0);
		});

		it('adjusts valor and clamps at 0', async () => {
			await campaignStore.adjustValor('campaign-1', 'char-1', 3);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.valor).toBe(3);

			await campaignStore.adjustValor('campaign-1', 'char-1', -5);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.valor).toBe(0);
		});

		it('sets current health and clamps at 0', async () => {
			await campaignStore.setCurrentHealth('campaign-1', 'char-1', 7);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.currentHealth).toBe(7);

			await campaignStore.setCurrentHealth('campaign-1', 'char-1', -3);
			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.currentHealth).toBe(0);
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
