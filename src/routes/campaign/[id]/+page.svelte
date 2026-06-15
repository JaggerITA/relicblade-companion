<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import CharacterPickerSheet from '$lib/components/listbuilder/CharacterPickerSheet.svelte';
	import { baseTemplateStore } from '$lib/stores/baseTemplateStore.svelte.js';
	import { campaignStore } from '$lib/stores/campaignStore.svelte.js';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
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

	let showAdventurerPicker = $state(false);
	let confirmRemoveAdventurerId = $state<string | null>(null);

	const availableAdventurers = $derived.by(() => {
		if (!campaign) return [];
		return collectionStore.characters.filter(
			(c) =>
				!campaign.characterStates.some((s) => s.characterId === c.id) &&
				(c.path === 'neutral' || c.path === campaign.pathAlignment)
		);
	});

	$effect(() => {
		campaignStore.hydrate();
		rosterStore.hydrate();
		collectionStore.hydrate();
		baseTemplateStore.hydrate();
	});

	const pathLabel: Record<string, string> = {
		advocate: 'Advocate',
		adversary: 'Adversary'
	};

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
		baseModalMode =
			!campaign?.base && baseTemplateStore.templates.length > 0 ? 'picker' : 'form';
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

	async function pickAdventurer(characterId: string): Promise<void> {
		if (!campaign) return;
		const character = collectionStore.getCharacter(characterId);
		if (!character) return;
		await campaignStore.recruitAdventurer(campaign.id, characterId, character.stats.health, character.cost);
		showAdventurerPicker = false;
	}
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
				<div class="card mb-2 grid grid-cols-2 gap-3">
					<div>
						<p class="text-xs text-on-muted">Influence</p>
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

				<!-- TODO Sprint 7 (#16/#17): Valor is earned per-character, shown once followers are recruited -->
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
									<p class="text-xs capitalize text-on-muted">{specialist.level}</p>
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

			<!-- Roster / character progression -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Warband</h2>
				{#if roster}
					<a href="{base}/roster/{roster.id}" class="card flex items-center justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate font-semibold">{roster.name}</p>
							<p class="truncate text-xs text-on-muted">{roster.entries.length} characters</p>
						</div>
						<span class="text-on-muted">›</span>
					</a>
				{:else}
					<p class="text-sm text-on-muted">Starting roster not found.</p>
				{/if}

				<div class="mb-2 mt-3 flex items-center justify-between">
					<h3 class="text-xs font-semibold uppercase tracking-wider text-on-muted">Adventurers</h3>
					<button type="button" onclick={() => (showAdventurerPicker = true)} class="text-sm text-accent">
						+ Recruit
					</button>
				</div>
				{#if campaign.characterStates.length === 0}
					<!-- TODO Sprint 7 (#17): Heroic Traits, wounds, recovery, relics, valor per character -->
					<p class="text-sm text-on-muted">No adventurers recruited yet.</p>
				{:else}
					<ul class="space-y-1">
						{#each campaign.characterStates as state (state.characterId)}
							{@const character = collectionStore.getCharacter(state.characterId)}
							<li class="card flex items-center justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{character?.name ?? 'Unknown character'}</p>
									<p class="text-xs text-on-muted">Valor {state.valor}</p>
								</div>
								<button
									type="button"
									onclick={() => (confirmRemoveAdventurerId = state.characterId)}
									class="shrink-0 text-sm text-on-muted hover:text-on-surface"
								>
									Remove
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Adventures -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Adventures</h2>
				<!-- TODO Sprint 7 (#19): guided campaign game wizard -->
				<p class="text-sm text-on-muted">Adventure flow coming soon.</p>
			</section>

			<!-- Match history -->
			<section class="mb-4">
				<h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-on-muted">Match History</h2>
				{#if campaign.matches.length === 0}
					<!-- TODO Sprint 7 (#20): post-game resolution & match history -->
					<p class="text-sm text-on-muted">No matches recorded yet.</p>
				{:else}
					<ul class="space-y-1">
						{#each campaign.matches as match (match.id)}
							<li class="card text-sm">
								<p class="font-medium capitalize">{match.result}{#if match.scenario} · {match.scenario}{/if}</p>
								<p class="text-xs text-on-muted">{match.date}</p>
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

	<CharacterPickerSheet
		open={showAdventurerPicker}
		characters={availableAdventurers}
		onpick={pickAdventurer}
		onclose={() => (showAdventurerPicker = false)}
		title="Recruit adventurer"
		actionLabel="+ Recruit"
	/>

	<Modal
		open={confirmRemoveAdventurerId !== null}
		title="Remove adventurer?"
		onclose={() => (confirmRemoveAdventurerId = null)}
	>
		{#snippet children()}
			<p class="text-on-muted">
				This cannot be undone. Their progression (heroic traits, wounds, relics) will be lost.
			</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmRemoveAdventurerId = null)}>Cancel</Button>
			<Button
				variant="danger"
				onclick={async () => {
					if (!campaign || !confirmRemoveAdventurerId) return;
					await campaignStore.removeAdventurer(campaign.id, confirmRemoveAdventurerId);
					confirmRemoveAdventurerId = null;
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
		<p class="text-on-muted">Loading…</p>
	</div>
{/if}
