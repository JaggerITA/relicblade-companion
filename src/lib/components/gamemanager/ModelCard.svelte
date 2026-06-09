<script lang="ts">
	import Button from '$lib/components/shared/Button.svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import HealthTracker from './HealthTracker.svelte';
	import CharacterPreview from '$lib/components/listbuilder/CharacterPreview.svelte';
	import { STAT_ICONS } from '$lib/constants/icons.js';
	import { computeEffectiveStats, hasKeyword } from '$lib/utils/computeEffectiveStats.js';

	const SpeedIcon = STAT_ICONS.speed;
	const ArmorIcon = STAT_ICONS.armor;
	import type { Character } from '$lib/models/Character.js';
	import type { ModelState } from '$lib/models/GameState.js';

	interface Props {
		character: Character;
		model: ModelState;
		onadjusthealth: (delta: number) => void;
		onadjustactiondice: (delta: number) => void;
		ontoggleactivation: () => void;
		ontogglecondition: (condition: string) => void;
	}

	let { character, model, onadjusthealth, onadjustactiondice, ontoggleactivation, ontogglecondition }: Props =
		$props();

	const stats = $derived(computeEffectiveStats(character, model));

	/** Detected via keyword match — exactly how `compatibleUpgrades` checks `restrictions` against `keywords` (Game Rules #type/construct|mount|rider|companion). */
	const SPECIAL_TYPES = ['Construct', 'Mount', 'Rider', 'Companion'] as const;
	const specialTypes = $derived(SPECIAL_TYPES.filter((type) => hasKeyword(character, type)));

	const ActionDiceIcon = STAT_ICONS.actionDice;

	let newCondition = $state('');
	let confirmRevive = $state(false);
	let showDetails = $state(false);

	function addCondition(): void {
		const trimmed = newCondition.trim();
		if (!trimmed || model.conditions.includes(trimmed)) return;
		ontogglecondition(trimmed);
		newCondition = '';
	}
</script>

<div
	class="card transition-opacity {model.destroyed
		? 'opacity-25'
		: stats.isDisabled
			? 'opacity-50'
			: ''}"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold">
				{character.name}
				{#if model.destroyed}
					<span class="font-normal text-on-muted">(destroyed 💀💀)</span>
				{:else if stats.isDisabled}
					<span class="font-normal text-on-muted">(disabled 💀)</span>
				{/if}
			</p>
			{#if specialTypes.length > 0}
				<div class="mt-1 flex flex-wrap gap-1">
					{#each specialTypes as type (type)}
						<span
							class="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-on-muted"
						>
							{type}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Stats row: AD (primary, highlighted) + SPD and ARM (secondary) -->
		<div class="flex shrink-0 flex-col items-end gap-1">
			<span class="flex items-center gap-1 text-sm font-semibold text-accent">
				<ActionDiceIcon class="h-4 w-4" aria-hidden="true" />
				{stats.actionDice}
				{#if stats.criticalWoundPenalty > 0}
					<span class="text-xs font-normal text-amber-400">(−{stats.criticalWoundPenalty} crit)</span>
				{/if}
			</span>
			<span class="flex items-center gap-2 text-xs text-on-muted">
				<span class="flex items-center gap-0.5">
					<SpeedIcon class="h-3.5 w-3.5" aria-hidden="true" />{stats.speed}
				</span>
				<span class="flex items-center gap-0.5">
					<ArmorIcon class="h-3.5 w-3.5" aria-hidden="true" />{stats.armor}
				</span>
			</span>
		</div>
	</div>

	<div class="mt-3">
		<HealthTracker
			currentHealth={model.currentHealth}
			maxHealth={model.maxHealth}
			isConstruct={model.isConstruct}
			criticalBoxes={character.criticalHealthBoxes ?? []}
			onadjust={(delta) => {
				if (model.destroyed && delta > 0) confirmRevive = true;
				else onadjusthealth(delta);
			}}
		/>
	</div>

	{#if !model.isConstruct}
		<div class="mt-2 flex items-center gap-2 text-xs text-on-muted">
			<span>AD modifier (poison, focus, etc.)</span>
			<div class="ml-auto flex items-center gap-2">
				<Button variant="ghost" onclick={() => onadjustactiondice(-1)}>−</Button>
				<span class="w-5 text-center font-semibold text-on-surface">{model.actionDiceModifier}</span>
				<Button variant="ghost" onclick={() => onadjustactiondice(1)}>+</Button>
			</div>
		</div>
	{/if}

	<label class="mt-2 flex min-h-touch items-center gap-2 text-sm">
		<input
			type="checkbox"
			checked={model.activated}
			onchange={ontoggleactivation}
			class="h-5 w-5 shrink-0 rounded border-white/30 bg-transparent text-accent focus:ring-accent"
		/>
		activated
	</label>

	<div class="mt-1 flex flex-wrap items-center gap-1.5">
		{#each model.conditions as condition (condition)}
			<button
				type="button"
				onclick={() => ontogglecondition(condition)}
				class="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-on-muted hover:bg-white/20"
				aria-label="Remove condition {condition}"
			>
				{condition}
				<span aria-hidden="true">✕</span>
			</button>
		{/each}
		<input
			type="text"
			bind:value={newCondition}
			onkeydown={(e) => e.key === 'Enter' && addCondition()}
			placeholder="+ condition"
			class="min-w-0 max-w-[8rem] rounded-full border border-dashed border-white/20 bg-transparent px-2 py-0.5 text-xs text-on-muted placeholder:text-on-muted/60 focus:border-accent focus:outline-none"
		/>
	</div>

	<!-- Card details toggle -->
	<button
		type="button"
		onclick={() => (showDetails = !showDetails)}
		class="mt-2 flex min-h-touch w-full items-center gap-1 text-xs text-on-muted hover:text-on-surface"
		aria-expanded={showDetails}
	>
		<span aria-hidden="true">{showDetails ? '▴' : '▾'}</span>
		{showDetails ? 'Hide details' : 'Show details'}
	</button>
	{#if showDetails}
		<div class="mt-2 border-t border-white/10 pt-2">
			<CharacterPreview {character} />
		</div>
	{/if}
</div>

<Modal open={confirmRevive} title="Revive {character.name}?" onclose={() => (confirmRevive = false)}>
	{#snippet children()}
		<p class="text-on-muted">This will restore {character.name} to 1 HP and return them to play.</p>
	{/snippet}
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmRevive = false)}>Cancel</Button>
		<Button variant="primary" onclick={() => { onadjusthealth(1); confirmRevive = false; }}>Revive</Button>
	{/snippet}
</Modal>
