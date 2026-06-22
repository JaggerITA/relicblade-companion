import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/db.js', () => ({
	dbGetAll: vi.fn(),
	dbPut: vi.fn(),
	dbDelete: vi.fn()
}));

vi.mock('$lib/utils/id.js', () => ({
	newId: vi.fn()
}));

vi.mock('./collectionStore.svelte.js', () => ({
	collectionStore: { getCharacter: vi.fn() }
}));

vi.mock('./rosterStore.svelte.js', () => ({
	rosterStore: {
		getRoster: vi.fn(),
		configureForCampaign: vi.fn(),
		setMaxInfluence: vi.fn(),
		removeEntry: vi.fn()
	}
}));

import { dbDelete, dbGetAll, dbPut } from '$lib/utils/db.js';
import { newId } from '$lib/utils/id.js';
import { collectionStore } from './collectionStore.svelte.js';
import { rosterStore } from './rosterStore.svelte.js';
import { campaignStore } from './campaignStore.svelte.js';
import type { Campaign } from '$lib/models/Campaign.js';
import type { Character } from '$lib/models/Character.js';
import type { Roster } from '$lib/models/Roster.js';

function makeCharacter(overrides: Partial<Character> = {}): Character {
	return {
		id: 'knight',
		name: 'Test Knight',
		faction: '',
		path: 'advocate',
		cost: 20,
		stats: { actionDice: 4, speed: 5, armor: 3, health: 6 },
		keywords: [],
		actions: [],
		upgradeSlots: [],
		notes: '',
		source: 'manual',
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

function makeRoster(entries: { entryId: string; characterId: string }[]): Roster {
	return {
		id: 'roster-1',
		name: 'Test Roster',
		faction: '',
		limitMode: 'threat',
		maxInfluence: 50,
		entries: entries.map((e) => ({ ...e, equippedUpgradeIds: [], entryInfluence: 20 })),
		totalInfluence: entries.length * 20,
		createdAt: '',
		updatedAt: ''
	};
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
	return {
		id: 'campaign-1',
		name: 'Test Campaign',
		rosterId: 'roster-1',
		pathAlignment: 'advocate',
		influence: 0,
		gold: 0,
		valor: 0,
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
		vi.mocked(collectionStore.getCharacter).mockImplementation((id: string) =>
			id === 'knight' ? makeCharacter() : undefined
		);
		vi.mocked(rosterStore.getRoster).mockReturnValue(makeRoster([{ entryId: 'entry-a', characterId: 'knight' }]));
		vi.mocked(rosterStore.configureForCampaign).mockResolvedValue(undefined);
		vi.mocked(rosterStore.setMaxInfluence).mockResolvedValue(undefined);
		vi.mocked(rosterStore.removeEntry).mockResolvedValue(undefined);
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
		it('creates a campaign with an influence budget and configures + syncs the linked roster', async () => {
			const campaign = await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);

			expect(campaign.id).toBe('campaign-1');
			expect(campaign.rosterId).toBe('roster-1');
			expect(campaign.influence).toBe(50);
			expect(rosterStore.configureForCampaign).toHaveBeenCalledWith('roster-1', 50, 'campaign-1');
			// syncWarband seeds one state per roster entry, at full health
			expect(campaign.characterStates).toEqual([
				expect.objectContaining({ entryId: 'entry-a', characterId: 'knight', status: 'active', currentHealth: 6 })
			]);
		});

		it('defaults the starting influence to 50', async () => {
			const campaign = await campaignStore.create('Volgelands', 'roster-1', 'advocate');
			expect(campaign.influence).toBe(50);
		});
	});

	describe('syncWarband', () => {
		it('adds states for new entries, keeps duplicates independent, and drops removed ones', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);

			// roster now has two copies of the same archetype
			vi.mocked(rosterStore.getRoster).mockReturnValue(
				makeRoster([
					{ entryId: 'entry-a', characterId: 'knight' },
					{ entryId: 'entry-b', characterId: 'knight' }
				])
			);
			await campaignStore.syncWarband('campaign-1');
			let states = campaignStore.getCampaign('campaign-1')?.characterStates ?? [];
			expect(states.map((s) => s.entryId)).toEqual(['entry-a', 'entry-b']);

			// remove the first copy from the roster
			vi.mocked(rosterStore.getRoster).mockReturnValue(makeRoster([{ entryId: 'entry-b', characterId: 'knight' }]));
			await campaignStore.syncWarband('campaign-1');
			states = campaignStore.getCampaign('campaign-1')?.characterStates ?? [];
			expect(states.map((s) => s.entryId)).toEqual(['entry-b']);
		});

		it('retains dead members as history even when their roster entry is gone', async () => {
			vi.mocked(dbGetAll).mockResolvedValue([
				makeCampaign({
					characterStates: [
						{
							entryId: 'entry-dead',
							characterId: 'knight',
							status: 'dead',
							heroicTraits: [],
							woundTraits: [],
							criticalWounds: 0,
							currentHealth: 0,
							relics: [],
							gold: 0,
							valor: 5,
							kills: 3,
							objectives: 1,
							gamesPlayed: 2
						}
					]
				})
			]);
			await campaignStore.hydrate();

			await campaignStore.syncWarband('campaign-1');

			const states = campaignStore.getCampaign('campaign-1')?.characterStates ?? [];
			expect(states.find((s) => s.entryId === 'entry-dead')?.status).toBe('dead');
			expect(states.find((s) => s.entryId === 'entry-a')?.status).toBe('active');
		});
	});

	describe('adjustInfluence / adjustGold', () => {
		it('adjusts the budget, clamps at 0, and mirrors influence to the roster limit', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);

			await campaignStore.adjustInfluence('campaign-1', 5);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(55);
			expect(rosterStore.setMaxInfluence).toHaveBeenCalledWith('roster-1', 55);

			await campaignStore.adjustGold('campaign-1', 3);
			expect(campaignStore.getCampaign('campaign-1')?.gold).toBe(3);

			await campaignStore.adjustInfluence('campaign-1', -1000);
			await campaignStore.adjustGold('campaign-1', -1000);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(0);
			expect(campaignStore.getCampaign('campaign-1')?.gold).toBe(0);
		});
	});

	describe('specialists', () => {
		it('records influencePaid without decrementing the budget', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);

			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);
			expect(campaignStore.getCampaign('campaign-1')?.specialists).toEqual([
				{ type: 'smith', level: 'novice', influencePaid: 10 }
			]);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(50);

			await campaignStore.advanceSpecialist('campaign-1', 'smith', 15);
			const specialist = campaignStore.getCampaign('campaign-1')?.specialists[0];
			expect(specialist?.level).toBe('journeyman');
			expect(specialist?.influencePaid).toBe(25);
			expect(campaignStore.getCampaign('campaign-1')?.influence).toBe(50);
		});

		it('does not recruit a second specialist of the same type and removes one', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);
			await campaignStore.recruitSpecialist('campaign-1', 'smith', 10);
			await campaignStore.recruitSpecialist('campaign-1', 'smith', 20);
			expect(campaignStore.getCampaign('campaign-1')?.specialists).toHaveLength(1);

			await campaignStore.removeSpecialist('campaign-1', 'smith');
			expect(campaignStore.getCampaign('campaign-1')?.specialists).toEqual([]);
		});
	});

	describe('character progression (keyed by entryId)', () => {
		beforeEach(async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);
		});

		it('adds and removes heroic / wound traits and relics', async () => {
			await campaignStore.addHeroicTrait('campaign-1', 'entry-a', 'Iron Will');
			await campaignStore.addWoundTrait('campaign-1', 'entry-a', 'Limp');
			await campaignStore.addRelic('campaign-1', 'entry-a', 'Ring of the Fox');

			let state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.heroicTraits).toEqual(['Iron Will']);
			expect(state?.woundTraits).toEqual(['Limp']);
			expect(state?.relics).toEqual(['Ring of the Fox']);

			await campaignStore.removeHeroicTrait('campaign-1', 'entry-a', 0);
			await campaignStore.removeWoundTrait('campaign-1', 'entry-a', 0);
			await campaignStore.removeRelic('campaign-1', 'entry-a', 0);
			state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state?.heroicTraits).toEqual([]);
			expect(state?.woundTraits).toEqual([]);
			expect(state?.relics).toEqual([]);
		});

		it('adjusts critical wounds / valor / health and clamps at 0', async () => {
			await campaignStore.adjustCriticalWounds('campaign-1', 'entry-a', 2);
			await campaignStore.adjustValor('campaign-1', 'entry-a', 3);
			await campaignStore.setCurrentHealth('campaign-1', 'entry-a', 4);
			let state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state).toMatchObject({ criticalWounds: 2, valor: 3, currentHealth: 4 });

			await campaignStore.adjustCriticalWounds('campaign-1', 'entry-a', -5);
			await campaignStore.adjustValor('campaign-1', 'entry-a', -5);
			await campaignStore.setCurrentHealth('campaign-1', 'entry-a', -5);
			state = campaignStore.getCampaign('campaign-1')?.characterStates[0];
			expect(state).toMatchObject({ criticalWounds: 0, valor: 0, currentHealth: 0 });
		});
	});

	describe('recordMatch', () => {
		beforeEach(async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);
		});

		it('writes a match, applies per-character deltas, and adds rewards to the budget', async () => {
			const record = await campaignStore.recordMatch('campaign-1', {
				result: 'win',
				notes: 'Held the line',
				influenceEarned: 10,
				goldEarned: 5,
				outcomes: [
					{
						entryId: 'entry-a',
						characterId: 'knight',
						result: 'survived',
						kills: 2,
						objectives: 1,
						valorGained: 3,
						currentHealth: 5
					}
				]
			});

			expect(record?.result).toBe('win');
			const campaign = campaignStore.getCampaign('campaign-1');
			expect(campaign?.matches).toHaveLength(1);
			expect(campaign?.influence).toBe(60);
			expect(campaign?.gold).toBe(5);
			expect(rosterStore.setMaxInfluence).toHaveBeenCalledWith('roster-1', 60);
			expect(campaign?.characterStates[0]).toMatchObject({
				kills: 2,
				objectives: 1,
				gamesPlayed: 1,
				valor: 3,
				currentHealth: 5
			});
		});

		it('marks a death and removes that member from the roster', async () => {
			await campaignStore.recordMatch('campaign-1', {
				result: 'loss',
				notes: '',
				influenceEarned: 0,
				goldEarned: 0,
				outcomes: [
					{
						entryId: 'entry-a',
						characterId: 'knight',
						result: 'destroyed',
						kills: 0,
						objectives: 0,
						valorGained: 0,
						injuryOutcome: 'death'
					}
				]
			});

			expect(campaignStore.getCampaign('campaign-1')?.characterStates[0]?.status).toBe('dead');
			expect(rosterStore.removeEntry).toHaveBeenCalledWith('roster-1', 'entry-a');
		});
	});

	describe('deleteCampaign', () => {
		it('removes the campaign from state and db', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);

			await campaignStore.deleteCampaign('campaign-1');

			expect(campaignStore.campaigns).toHaveLength(0);
			expect(dbDelete).toHaveBeenCalledWith('campaigns', 'campaign-1');
		});
	});

	describe('importCampaigns', () => {
		it('merges incoming campaigns, adding new and updating existing', async () => {
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);
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
			await campaignStore.create('Volgelands', 'roster-1', 'advocate', 50);
			const incoming = [makeCampaign({ id: 'campaign-2', name: 'Second Campaign' })];

			await campaignStore.importCampaigns(incoming, 'replace');

			expect(campaignStore.campaigns).toHaveLength(1);
			expect(campaignStore.getCampaign('campaign-1')).toBeUndefined();
			expect(campaignStore.getCampaign('campaign-2')?.name).toBe('Second Campaign');
			expect(dbDelete).toHaveBeenCalledWith('campaigns', 'campaign-1');
		});
	});
});
