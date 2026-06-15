<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import { baseTemplateStore } from '$lib/stores/baseTemplateStore.svelte.js';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { charactersInfluence } from '$lib/utils/validation.js';
	import type { SpecialistType } from '$lib/models/Campaign.js';

	const specialistTypes: SpecialistType[] = ['smith', 'scribe', 'chemist', 'artisan'];

	const id = $derived($page.params.id ?? '');
	const campaign = $derived(campaignStore.getCampaign(id));
	const roster = $derived(campaign ? rosterStore.getRoster(campaign.rosterId) : undefined);

	let confirmDelete = $state(false);
	let showBaseModal = $state(false);
	let baseModalMode = $state<'picker' | 'form'>('form');
	let baseType = $state('');
	let baseName = $state('');
	let baseNotes = $state('');
	let baseStartingInfluence = $state(0);
	let baseStartingGold = $state(0);
	let baseStartingValor = $state(0);
	let baseErrors = $state<Record<string, string>>({});

	let showSpecialistCostModal = $state(false);
	let specialistModalType = $state<SpecialistType | null>(null);
	let specialistModalAction = $state<'recruit' | 'advance'>('recruit');
	let specialistCostInput = $state(0);
	let confirmRemoveSpecialistType = $state<SpecialistType | null>(null);

	let expandedEntryId = $state<string | null>(null);
	let newHeroicTrait = $state<Record<string, string>>({});
	let newWoundTrait = $state<Record<string, string>>({});
	let newRelic = $state<Record<string, string>>({});

	onMount(async () => {
		await campaignStore.hydrate();
		await rosterStore.hydrate();
		await collectionStore.hydrate();
		await baseTemplateStore.hydrate();
		if (campaign) await campaignStore.syncWarband(campaign.id);
	});

	const pathLabel: Record<string, string> = {
		advocate: 'Advocate',
		adversary: 'Adversary'
	};

	/** State for a warband member, by roster-entry instance. */
	function stateFor(entryId: string) {
		return campaign?.characterStates.find((s) => s.entryId === entryId);
	}

	const fallen = $derived(campaign?.characterStates.filter((s) => s.status === 'dead') ?? []);

	const warbandCost = $derived(
		roster ? charactersInfluence(roster.entries, collectionStore.charactersById) : 0
	);
	const specialistSpend = $derived(
		campaign?.specialists.reduce((sum, s) => sum + s.influencePaid, 0) ?? 0
	);
	const availableInfluence = $derived((campaign?.influence ?? 0) - warbandCost - specialistSpend);

	function matchesForEntry(entryId: string) {
		return (campaign?.matches ?? [])
			.map((m) => ({ match: m, outcome: m.outcomes.find((o) => o.entryId === entryId) }))
			.filter((x) => x.outcome !== undefined);
	}

	function toggleEntry(entryId: string): void {
		expandedEntryId = expandedEntryId === entryId ? null : entryId;
	}

	async function submitHeroicTrait(entryId: string): Promise<void> {
		if (!campaign) return;
		const trait = (newHeroicTrait[entryId] ?? '').trim();
		if (!trait) return;
		await campaignStore.addHeroicTrait(campaign.id, entryId, trait);
		newHeroicTrait[entryId] = '';
	}

	async function submitWoundTrait(entryId: string): Promise<void> {
		if (!campaign) return;
		const trait = (newWoundTrait[entryId] ?? '').trim();
		if (!trait) return;
		await campaignStore.addWoundTrait(campaign.id, entryId, trait);
		newWoundTrait[entryId] = '';
	}

	async function submitRelic(entryId: string): Promise<void> {
		if (!campaign) return;
		const relic = (newRelic[entryId] ?? '').trim();
		if (!relic) return;
		await campaignStore.addRelic(campaign.id, entryId, relic);
		newRelic[entryId] = '';
	}

	function resetBaseForm(): void {
		baseType = campaign?.base?.type ?? '';
		baseName = campaign?.base?.name ?? '';
		baseNotes = campaign?.base?.notes ?? '';
		baseStartingInfluence = 0;
		baseStartingGold = 0;
		baseStartingValor = 0;
		baseErrors = {};
	}

	function openBaseModal(): void {
		resetBaseForm();
		baseModalMode = !campaign?.base && baseTemplateStore.templates.length > 0 ? 'picker' : 'form';
		showBaseModal = true;
	}

	async function useTemplate(templateId: string): Promise<void> {
		if (!campaign) return;
		const template = baseTemplateStore.getTemplate(templateId);
		if (!template) return;
		await campaignStore.setBase(campaign.id, {
			type: template.type,
			name: template.name,
			notes: template.notes
		});
		if (template.startingInfluence) await campaignStore.adjustInfluence(campaign.id, template.startingInfluence);
		if (template.startingGold) await campaignStore.adjustGold(campaign.id, template.startingGold);
		showBaseModal = false;
		toastStore.success(`${template.name} established`);
	}

	async function saveBase(): Promise<void> {
		if (!campaign) return;
		const errors: Record<string, string> = {};
		if (!baseType.trim()) errors.type = 'Base type is required';
		if (!baseName.trim()) errors.name = 'Give your base a name';
		baseErrors = errors;
		if (Object.keys(errors).length > 0) return;
		const isNewBase = !campaign.base;
		await campaignStore.setBase(campaign.id, {
			type: baseType.trim(),
			name: baseName.trim(),
			notes: baseNotes.trim()
		});
		if (isNewBase) {
			await baseTemplateStore.create({
				type: baseType.trim(),
				name: baseName.trim(),
				notes: baseNotes.trim(),
				startingInfluence: baseStartingInfluence,
				startingGold: baseStartingGold,
				startingValor: baseStartingValor
			});
			if (baseStartingInfluence) await campaignStore.adjustInfluence(campaign.id, baseStartingInfluence);
			if (baseStartingGold) await campaignStore.adjustGold(campaign.id, baseStartingGold);
		}
		showBaseModal = false;
	}

	function openSpecialistModal(type: SpecialistType, action: 'recruit' | 'advance'): void {
		specialistModalType = type;
		specialistModalAction = action;
		specialistCostInput = 0;
		showSpecialistCostModal = true;
	}

	async function confirmSpecialistAction(): Promise<void> {
		if (!campaign || !specialistModalType) return;
		if (specialistModalAction === 'recruit') {
			await campaignStore.recruitSpecialist(campaign.id, specialistModalType, specialistCostInput);
		} else {
			await campaignStore.advanceSpecialist(campaign.id, specialistModalType, specialistCostInput);
		}
		showSpecialistCostModal = false;
	}

	const resultLabel: Record<string, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };
</script>

{#if campaign}
	<div class="flex h-full flex-col">
		<header class="sticky top-0 z-10 flex items-center justify-between bg-surface px-4 pb-2 pt-4">
			<div class="flex items-center gap-3">
				<a href="{base}/campaign" class="text-on-muted hover:text-on-surface">‹</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold">{campaign.name}</h1>
					<p class="truncate text-xs capitalize text-on-muted">
						{pathLabel[campaign.pathAlignment]}{#if roster} · {roster.name}{/if}
					</p>
				</div>
			</div>
			<button
				onclick={() => (confirmDelete = true)}
				class="shrink-0 text-sm text-on-muted hover:text-on-surface"
				aria-label="Delete campaign"
			>
				Delete
			</button>
		</header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			<!-- Campaign game -->
			<section class="mb-4">
				<a href="{base}/campaign/{campaign.id}/play" class="btn-primary block w-full text-center">
					▶ Start Campaign Game
				</a>
			</section>

			<!-- Encampment -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Encampment</h2>

				<!-- Path Alignment -->
				<div class="card mb-2">
					<p class="mb-2 text-xs text-on-muted">Path Alignment</p>
					<div class="flex gap-2">
						{#each (['advocate', 'adversary'] as const) as alignment}
							<button
								type="button"
								onclick={() => campaignStore.setPathAlignment(campaign.id, alignment)}
								class="flex min-h-touch flex-1 items-center justify-center rounded-lg text-sm transition-colors
									{campaign.pathAlignment === alignment
									? 'bg-accent text-white'
									: 'bg-surface-overlay text-on-muted hover:bg-white/10'}"
								aria-pressed={campaign.pathAlignment === alignment}
							>
								{pathLabel[alignment]}
							</button>
						{/each}
					</div>
				</div>

				<!-- Resources -->
				<div class="card mb-2">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<p class="text-xs text-on-muted">Influence budget</p>
							<div class="mt-1 flex items-center gap-2">
								<Button variant="ghost" onclick={() => campaignStore.adjustInfluence(campaign.id, -1)}>−</Button>
								<span class="w-8 text-center text-lg font-semibold text-accent">{campaign.influence}</span>
								<Button variant="ghost" onclick={() => campaignStore.adjustInfluence(campaign.id, 1)}>+</Button>
							</div>
						</div>
						<div>
							<p class="text-xs text-on-muted">Gold</p>
							<div class="mt-1 flex items-center gap-2">
								<Button variant="ghost" onclick={() => campaignStore.adjustGold(campaign.id, -1)}>−</Button>
								<span class="w-8 text-center text-lg font-semibold text-accent">{campaign.gold}</span>
								<Button variant="ghost" onclick={() => campaignStore.adjustGold(campaign.id, 1)}>+</Button>
							</div>
						</div>
					</div>
					<div class="mt-3 border-t border-white/10 pt-2 text-xs text-on-muted">
						<div class="flex justify-between">
							<span>Warband ({roster?.entries.length ?? 0})</span>
							<span>−{warbandCost}</span>
						</div>
						<div class="flex justify-between">
							<span>Specialists</span>
							<span>−{specialistSpend}</span>
						</div>
						<div class="mt-1 flex justify-between font-semibold {availableInfluence < 0 ? 'text-red-400' : 'text-on-surface'}">
							<span>Available</span>
							<span>{availableInfluence}</span>
						</div>
					</div>
				</div>

				<!-- Base -->
				{#if campaign.base}
					<button type="button" onclick={openBaseModal} class="card w-full text-left">
						<div class="flex items-center justify-between">
							<p class="text-sm font-medium">{campaign.base.name}</p>
							<span class="text-xs text-on-muted">Edit</span>
						</div>
						<p class="text-xs text-on-muted">{campaign.base.type}</p>
						{#if campaign.base.notes}
							<p class="mt-1 text-xs text-on-muted">{campaign.base.notes}</p>
						{/if}
					</button>
				{:else}
					<button
						type="button"
						onclick={openBaseModal}
						class="w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-on-muted hover:bg-white/5"
					>
						+ Establish base
					</button>
				{/if}
			</section>

			<!-- Followers -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Followers</h2>
				<ul class="space-y-2">
					{#each specialistTypes as type (type)}
						{@const specialist = campaign.specialists.find((s) => s.type === type)}
						<li class="card flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium capitalize">{type}</p>
								{#if specialist}
									<p class="text-xs capitalize text-on-muted">{specialist.level} · {specialist.influencePaid} inf paid</p>
								{:else}
									<p class="text-xs text-on-muted">Not recruited</p>
								{/if}
							</div>
							<div class="flex shrink-0 gap-3 text-sm">
								{#if !specialist}
									<button type="button" onclick={() => openSpecialistModal(type, 'recruit')} class="text-accent">
										Recruit
									</button>
								{:else}
									{#if specialist.level !== 'master'}
										<button type="button" onclick={() => openSpecialistModal(type, 'advance')} class="text-accent">
											Advance
										</button>
									{/if}
									<button
										type="button"
										onclick={() => (confirmRemoveSpecialistType = type)}
										class="text-on-muted hover:text-on-surface"
									>
										Remove
									</button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>

			<!-- Warband -->
			<section class="mb-4">
				<div class="mb-2 flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Warband</h2>
					{#if roster}
						<a href="{base}/roster/{roster.id}" class="text-sm text-accent">Manage warband</a>
					{/if}
				</div>

				{#if !roster}
					<p class="text-sm text-on-muted">Starting roster not found.</p>
				{:else if roster.entries.length === 0}
					<p class="text-sm text-on-muted">
						No characters yet. <a href="{base}/roster/{roster.id}" class="text-accent">Add some</a> within
						your influence budget.
					</p>
				{:else}
					<ul class="space-y-1">
						{#each roster.entries as entry (entry.entryId)}
							{@const character = collectionStore.getCharacter(entry.characterId)}
							{@const state = stateFor(entry.entryId)}
							{@const expanded = expandedEntryId === entry.entryId}
							{@const timeline = matchesForEntry(entry.entryId)}
							<li class="card">
								<div class="flex items-center justify-between gap-3">
									<button
										type="button"
										onclick={() => toggleEntry(entry.entryId)}
										class="min-w-0 flex-1 text-left"
										aria-expanded={expanded}
									>
										<p class="truncate text-sm font-medium">{character?.name ?? 'Unknown character'}</p>
										<p class="truncate text-xs text-on-muted">
											HP {state?.currentHealth ?? '?'}/{character?.stats.health ?? '?'} · Valor {state?.valor ?? 0}
											{#if (state?.criticalWounds ?? 0) > 0}
												· {state?.criticalWounds} crit ({-(state?.criticalWounds ?? 0)} AD)
											{/if}
										</p>
										<p class="truncate text-xs text-on-muted">
											{state?.kills ?? 0} kills · {state?.objectives ?? 0} obj · {state?.gamesPlayed ?? 0} games
										</p>
									</button>
									<button
										type="button"
										onclick={() => toggleEntry(entry.entryId)}
										class="shrink-0 text-on-muted"
										aria-label={expanded ? 'Collapse' : 'Expand'}
									>
										{expanded ? '▴' : '▾'}
									</button>
								</div>

								{#if expanded && state}
									<div class="mt-3 space-y-3 border-t border-white/10 pt-3">
										<div class="flex items-center justify-between">
											<p class="text-xs text-on-muted">Health</p>
											<div class="flex items-center gap-2">
												<Button
													variant="ghost"
													onclick={() => campaignStore.setCurrentHealth(campaign.id, entry.entryId, (state?.currentHealth ?? 0) - 1)}
												>
													−
												</Button>
												<span class="w-14 text-center text-sm font-semibold">
													{state.currentHealth}/{character?.stats.health ?? '?'}
												</span>
												<Button
													variant="ghost"
													onclick={() =>
														campaignStore.setCurrentHealth(
															campaign.id,
															entry.entryId,
															Math.min(character?.stats.health ?? state.currentHealth, state.currentHealth + 1)
														)}
												>
													+
												</Button>
											</div>
										</div>

										<div class="flex items-center justify-between">
											<p class="text-xs text-on-muted">Critical Wounds (−1 AD each)</p>
											<div class="flex items-center gap-2">
												<Button variant="ghost" onclick={() => campaignStore.adjustCriticalWounds(campaign.id, entry.entryId, -1)}>
													−
												</Button>
												<span class="w-8 text-center text-sm font-semibold">{state.criticalWounds}</span>
												<Button variant="ghost" onclick={() => campaignStore.adjustCriticalWounds(campaign.id, entry.entryId, 1)}>
													+
												</Button>
											</div>
										</div>

										<div class="flex items-center justify-between">
											<p class="text-xs text-on-muted">Valor</p>
											<div class="flex items-center gap-2">
												<Button variant="ghost" onclick={() => campaignStore.adjustValor(campaign.id, entry.entryId, -1)}>
													−
												</Button>
												<span class="w-8 text-center text-sm font-semibold">{state.valor}</span>
												<Button variant="ghost" onclick={() => campaignStore.adjustValor(campaign.id, entry.entryId, 1)}>
													+
												</Button>
											</div>
										</div>

										<div>
											<p class="mb-1 text-xs text-on-muted">Heroic Traits</p>
											{#if state.heroicTraits.length > 0}
												<ul class="mb-2 space-y-1">
													{#each state.heroicTraits as trait, i (i)}
														<li class="flex items-center justify-between gap-2 rounded bg-surface-overlay px-2 py-1 text-sm">
															<span class="truncate">{trait}</span>
															<button
																type="button"
																onclick={() => campaignStore.removeHeroicTrait(campaign.id, entry.entryId, i)}
																class="text-on-muted hover:text-on-surface"
																aria-label="Remove heroic trait"
															>
																×
															</button>
														</li>
													{/each}
												</ul>
											{/if}
											<div class="flex gap-2">
												<input
													type="text"
													bind:value={newHeroicTrait[entry.entryId]}
													placeholder="Add a heroic trait"
													class="min-w-0 flex-1 rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
												/>
												<Button variant="ghost" onclick={() => submitHeroicTrait(entry.entryId)}>Add</Button>
											</div>
										</div>

										<div>
											<p class="mb-1 text-xs text-on-muted">Wound Traits</p>
											{#if state.woundTraits.length > 0}
												<ul class="mb-2 space-y-1">
													{#each state.woundTraits as trait, i (i)}
														<li class="flex items-center justify-between gap-2 rounded bg-surface-overlay px-2 py-1 text-sm">
															<span class="truncate">{trait}</span>
															<button
																type="button"
																onclick={() => campaignStore.removeWoundTrait(campaign.id, entry.entryId, i)}
																class="text-on-muted hover:text-on-surface"
																aria-label="Remove wound trait"
															>
																×
															</button>
														</li>
													{/each}
												</ul>
											{/if}
											<div class="flex gap-2">
												<input
													type="text"
													bind:value={newWoundTrait[entry.entryId]}
													placeholder="Add a wound trait"
													class="min-w-0 flex-1 rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
												/>
												<Button variant="ghost" onclick={() => submitWoundTrait(entry.entryId)}>Add</Button>
											</div>
										</div>

										<div>
											<p class="mb-1 text-xs text-on-muted">Relics</p>
											{#if state.relics.length > 0}
												<ul class="mb-2 space-y-1">
													{#each state.relics as relic, i (i)}
														<li class="flex items-center justify-between gap-2 rounded bg-surface-overlay px-2 py-1 text-sm">
															<span class="truncate">{relic}</span>
															<button
																type="button"
																onclick={() => campaignStore.removeRelic(campaign.id, entry.entryId, i)}
																class="text-on-muted hover:text-on-surface"
																aria-label="Remove relic"
															>
																×
															</button>
														</li>
													{/each}
												</ul>
											{/if}
											<div class="flex gap-2">
												<input
													type="text"
													bind:value={newRelic[entry.entryId]}
													placeholder="Add a relic"
													class="min-w-0 flex-1 rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
												/>
												<Button variant="ghost" onclick={() => submitRelic(entry.entryId)}>Add</Button>
											</div>
										</div>

										{#if timeline.length > 0}
											<div>
												<p class="mb-1 text-xs text-on-muted">History</p>
												<ul class="space-y-1">
													{#each timeline as { match, outcome } (match.id)}
														<li class="rounded bg-surface-overlay px-2 py-1 text-xs">
															<span class="capitalize">{resultLabel[match.result]}</span>
															{#if match.scenario} · {match.scenario}{/if}
															· {outcome?.kills ?? 0}k / {outcome?.objectives ?? 0}o
															{#if (outcome?.valorGained ?? 0) !== 0} · +{outcome?.valorGained} valor{/if}
															{#if outcome?.injuryOutcome && outcome.injuryOutcome !== 'none'}
																· <span class="text-red-400">{outcome.injuryOutcome}</span>
															{/if}
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if fallen.length > 0}
					<h3 class="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-on-muted">Fallen</h3>
					<ul class="space-y-1">
						{#each fallen as state (state.entryId)}
							{@const character = collectionStore.getCharacter(state.characterId)}
							<li class="card text-sm opacity-70">
								<p class="font-medium">{character?.name ?? 'Unknown character'} <span class="text-xs text-red-400">† fallen</span></p>
								<p class="text-xs text-on-muted">
									{state.kills} kills · {state.objectives} obj · {state.gamesPlayed} games · Valor {state.valor}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Match history -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Match History</h2>
				{#if campaign.matches.length === 0}
					<p class="text-sm text-on-muted">No matches recorded yet.</p>
				{:else}
					<ul class="space-y-1">
						{#each [...campaign.matches].reverse() as match (match.id)}
							<li class="card text-sm">
								<p class="font-medium capitalize">
									{resultLabel[match.result]}{#if match.scenario} · {match.scenario}{/if}
								</p>
								<p class="text-xs text-on-muted">
									{new Date(match.date).toLocaleDateString()}
									{#if match.influenceEarned} · +{match.influenceEarned} inf{/if}
									{#if match.goldEarned} · +{match.goldEarned} gold{/if}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>

	<Modal
		open={showBaseModal}
		title={campaign.base ? 'Edit base' : 'Establish base'}
		onclose={() => (showBaseModal = false)}
	>
		{#snippet children()}
			{#if baseModalMode === 'picker'}
				<div class="space-y-2">
					<p class="mb-2 text-sm text-on-muted">Choose a base from your library, or create a new one.</p>
					{#each baseTemplateStore.templates as template (template.id)}
						<button
							type="button"
							onclick={() => useTemplate(template.id)}
							class="card w-full text-left hover:bg-white/5"
						>
							<p class="text-sm font-medium">{template.name}</p>
							<p class="text-xs text-on-muted">{template.type}</p>
							<p class="mt-1 text-xs text-on-muted">
								{template.startingInfluence} Influence · {template.startingGold} Gold · {template.startingValor} Valor
							</p>
							{#if template.notes}
								<p class="mt-1 text-xs text-on-muted">{template.notes}</p>
							{/if}
						</button>
					{/each}
					<button
						type="button"
						onclick={() => (baseModalMode = 'form')}
						class="w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-on-muted hover:bg-white/5"
					>
						+ Create new base
					</button>
				</div>
			{:else}
				<div class="space-y-4">
					<div>
						<label class="mb-1 block text-sm" for="baseType">Base type *</label>
						<input
							id="baseType"
							type="text"
							bind:value={baseType}
							placeholder="As printed in your Seeker's Handbook"
							class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
						/>
						{#if baseErrors.type}<p class="mt-1 text-xs text-red-400">{baseErrors.type}</p>{/if}
					</div>
					<div>
						<label class="mb-1 block text-sm" for="baseName">Base name *</label>
						<input
							id="baseName"
							type="text"
							bind:value={baseName}
							placeholder="Your own name for this base"
							class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
						/>
						{#if baseErrors.name}<p class="mt-1 text-xs text-red-400">{baseErrors.name}</p>{/if}
					</div>
					{#if !campaign.base}
						<div class="grid grid-cols-3 gap-3">
							<div>
								<label class="mb-1 block text-sm" for="baseStartingInfluence">Starting Influence</label>
								<input
									id="baseStartingInfluence"
									type="number"
									min="0"
									bind:value={baseStartingInfluence}
									class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
								/>
							</div>
							<div>
								<label class="mb-1 block text-sm" for="baseStartingGold">Starting Gold</label>
								<input
									id="baseStartingGold"
									type="number"
									min="0"
									bind:value={baseStartingGold}
									class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
								/>
							</div>
							<div>
								<label class="mb-1 block text-sm" for="baseStartingValor">Starting Valor</label>
								<input
									id="baseStartingValor"
									type="number"
									min="0"
									bind:value={baseStartingValor}
									class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
								/>
							</div>
						</div>
					{/if}
					<div>
						<label class="mb-1 block text-sm" for="baseNotes">Permanent boon / notes</label>
						<textarea
							id="baseNotes"
							bind:value={baseNotes}
							rows="3"
							placeholder="Permanent boon granted by this base"
							class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
						></textarea>
					</div>
				</div>
			{/if}
		{/snippet}
		{#snippet actions()}
			{#if baseModalMode === 'picker'}
				<Button variant="ghost" onclick={() => (showBaseModal = false)}>Cancel</Button>
			{:else}
				<Button variant="ghost" onclick={() => (showBaseModal = false)}>Cancel</Button>
				<Button variant="primary" onclick={saveBase}>Save</Button>
			{/if}
		{/snippet}
	</Modal>

	<Modal
		open={showSpecialistCostModal}
		title={specialistModalAction === 'recruit' ? 'Recruit specialist' : 'Advance specialist'}
		onclose={() => (showSpecialistCostModal = false)}
	>
		{#snippet children()}
			<p class="mb-3 text-sm text-on-muted">
				Enter the Influence cost from your book{#if specialistModalAction === 'advance'} for the next level{/if}.
			</p>
			<label class="mb-1 block text-sm" for="specialistCost">Influence cost</label>
			<input
				id="specialistCost"
				type="number"
				min="0"
				bind:value={specialistCostInput}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (showSpecialistCostModal = false)}>Cancel</Button>
			<Button variant="primary" onclick={confirmSpecialistAction}>
				{specialistModalAction === 'recruit' ? 'Recruit' : 'Advance'}
			</Button>
		{/snippet}
	</Modal>

	<Modal
		open={confirmRemoveSpecialistType !== null}
		title="Remove specialist?"
		onclose={() => (confirmRemoveSpecialistType = null)}
	>
		{#snippet children()}
			<p class="text-on-muted">This cannot be undone.</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmRemoveSpecialistType = null)}>Cancel</Button>
			<Button
				variant="danger"
				onclick={async () => {
					if (!campaign || !confirmRemoveSpecialistType) return;
					await campaignStore.removeSpecialist(campaign.id, confirmRemoveSpecialistType);
					confirmRemoveSpecialistType = null;
				}}
			>
				Remove
			</Button>
		{/snippet}
	</Modal>

	<Modal open={confirmDelete} title="Delete campaign?" onclose={() => (confirmDelete = false)}>
		{#snippet children()}
			<p class="text-on-muted">This cannot be undone. "{campaign.name}" and its progress will be removed.</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
			<Button
				variant="danger"
				onclick={async () => {
					const name = campaign.name;
					await campaignStore.deleteCampaign(campaign.id);
					goto(`${base}/campaign`);
					toastStore.info(`${name} deleted`);
				}}
			>
				Delete
			</Button>
		{/snippet}
	</Modal>
{:else if campaignStore.loaded}
	<div class="p-4">
		<header class="mb-4 flex items-center gap-3">
			<a href="{base}/campaign" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Campaign Tracker</h1>
		</header>
		<p class="text-on-muted">Campaign not found.</p>
		<a href="{base}/campaign" class="mt-4 inline-block text-accent">Back to campaigns</a>
	</div>
{:else}
	<div class="p-4">
		<p class="py-8 text-center text-sm text-on-muted">Loading…</p>
	</div>
{/if}
