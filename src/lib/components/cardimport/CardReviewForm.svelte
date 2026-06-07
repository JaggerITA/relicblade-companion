<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import type { Action, ActionType, Character, Path, UpgradeSlotType } from '$lib/models/Character.js';

	const UPGRADE_SLOT_TYPES: { value: UpgradeSlotType; label: string }[] = [
		{ value: 'weapon', label: 'Weapon' },
		{ value: 'tactic', label: 'Tactic' },
		{ value: 'potion', label: 'Potion' },
		{ value: 'spell', label: 'Spell' },
		{ value: 'item', label: 'Item' }
	];

	function countSlots(slots: UpgradeSlotType[]): Record<UpgradeSlotType, number> {
		const counts: Record<UpgradeSlotType, number> = { weapon: 0, tactic: 0, potion: 0, spell: 0, item: 0 };
		for (const slot of slots) counts[slot]++;
		return counts;
	}

	const ACTION_TYPES: { value: ActionType; label: string }[] = [
		{ value: 'melee-weapon', label: 'Melee Weapon' },
		{ value: 'ranged-weapon', label: 'Ranged Weapon' },
		{ value: 'ranged-or-melee-weapon', label: 'Ranged or Melee Weapon' },
		{ value: 'natural-weapon', label: 'Natural Weapon' },
		{ value: 'passive-ability', label: 'Passive Ability' },
		{ value: 'magic-spell', label: 'Magic Spell' },
		{ value: 'special-ability', label: 'Special Ability' }
	];

	interface Props {
		initial?: Partial<Character>;
		/** Field confidence map from OCR (0-100). Highlights low-confidence fields. */
		fieldConfidence?: Record<string, number>;
		onsubmit: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
		oncancel: () => void;
	}

	let { initial = {}, fieldConfidence = {}, onsubmit, oncancel }: Props = $props();

	// untrack: intentionally capture prop values once to seed form state
	let name = $state(untrack(() => initial.name ?? ''));
	let faction = $state(untrack(() => initial.faction ?? ''));
	let path = $state<Path>(untrack(() => initial.path ?? 'neutral'));
	let cost = $state(untrack(() => initial.cost ?? 0));
	let actionDice = $state(untrack(() => initial.stats?.actionDice ?? 1));
	let speed = $state(untrack(() => initial.stats?.speed ?? 0));
	let armor = $state(untrack(() => initial.stats?.armor ?? 0));
	let health = $state(untrack(() => initial.stats?.health ?? 1));
	let keywords = $state(untrack(() => initial.keywords?.join(', ') ?? ''));
	let notes = $state(untrack(() => initial.notes ?? ''));
	let upgradeSlotCounts = $state<Record<UpgradeSlotType, number>>(
		untrack(() => countSlots(initial.upgradeSlots ?? []))
	);
	function blankAction(): Action {
		return { name: '', type: 'melee-weapon', diceCount: undefined, activationValue: '', effect: '', bonus: '' };
	}

	let actions = $state<Action[]>(untrack(() =>
		initial.actions?.length ? initial.actions : [blankAction()]
	));

	// Validation
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		if (!faction.trim()) e.faction = 'Faction is required';
		if (cost < 0) e.cost = 'Cost must be 0 or greater';
		if (actionDice < 1) e.actionDice = 'Action dice must be at least 1';
		if (health < 1) e.health = 'Health must be at least 1';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function confidenceClass(field: string): string {
		const c = fieldConfidence[field];
		if (c === undefined) return '';
		if (c >= 85) return 'ring-1 ring-green-500';
		if (c >= 60) return 'ring-1 ring-yellow-500';
		return 'ring-1 ring-red-500';
	}

	function addAction() {
		actions = [...actions, blankAction()];
	}

	function removeAction(i: number) {
		actions = actions.filter((_, idx) => idx !== i);
	}

	function handleSubmit() {
		if (!validate()) return;
		// $state.snapshot() converts reactive Svelte proxies to plain objects
		// so IndexedDB's structured-clone algorithm can serialize them
		const plainActions = $state.snapshot(actions) as Action[];
		onsubmit({
			name: name.trim(),
			faction: faction.trim(),
			path,
			cost,
			stats: { actionDice, speed, armor, health },
			keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
			actions: plainActions.filter((a) => a.name.trim()),
			upgradeSlots: UPGRADE_SLOT_TYPES.flatMap(({ value }) => Array(upgradeSlotCounts[value]).fill(value)),
			notes,
			source: initial.source ?? 'manual',
			ocrConfidence: initial.ocrConfidence,
			imageUri: initial.imageUri
		});
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">

	<!-- Identity -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Identity</h2>

		<div>
			<label class="mb-1 block text-sm" for="name">Name *</label>
			<input
				id="name"
				type="text"
				bind:value={name}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass('name')}"
				placeholder="Character name"
			/>
			{#if errors.name}<p class="mt-1 text-xs text-red-400">{errors.name}</p>{/if}
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="mb-1 block text-sm" for="faction">Faction *</label>
				<input
					id="faction"
					type="text"
					bind:value={faction}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass('faction')}"
					placeholder="e.g. Temple of Justice"
				/>
				{#if errors.faction}<p class="mt-1 text-xs text-red-400">{errors.faction}</p>{/if}
			</div>
			<div>
				<label class="mb-1 block text-sm" for="cost">Cost (inf.) *</label>
				<input
					id="cost"
					type="number"
					min="0"
					bind:value={cost}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass('cost')}"
				/>
				{#if errors.cost}<p class="mt-1 text-xs text-red-400">{errors.cost}</p>{/if}
			</div>
		</div>

		<div>
			<label class="mb-1 block text-sm" for="path">Path *</label>
			<select
				id="path"
				bind:value={path}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass('path')}"
			>
				<option value="advocate">Advocate</option>
				<option value="adversary">Adversary</option>
				<option value="neutral">Neutral</option>
			</select>
		</div>
	</section>

	<!-- Stats -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Stats</h2>
		<div class="grid grid-cols-4 gap-2">
			{#each [
				{ id: 'actionDice', label: 'AD', bind: actionDice, field: 'actionDice', error: errors.actionDice },
				{ id: 'speed', label: 'SPD', bind: speed, field: 'speed', error: undefined },
				{ id: 'armor', label: 'ARM', bind: armor, field: 'armor', error: undefined },
				{ id: 'health', label: 'HP', bind: health, field: 'health', error: errors.health }
			] as stat}
				<div>
					<label class="mb-1 block text-center text-xs text-on-muted" for={stat.id}>{stat.label}</label>
					<input
						id={stat.id}
						type="number"
						min="0"
						value={stat.bind}
						oninput={(e) => {
							const v = parseInt((e.target as HTMLInputElement).value) || 0;
							if (stat.id === 'actionDice') actionDice = v;
							else if (stat.id === 'speed') speed = v;
							else if (stat.id === 'armor') armor = v;
							else if (stat.id === 'health') health = v;
						}}
						class="w-full rounded-lg bg-surface-overlay px-2 py-2 text-center text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass(stat.field)}"
					/>
					{#if stat.error}<p class="mt-1 text-xs text-red-400">{stat.error}</p>{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Actions -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Actions</h2>
			<button type="button" onclick={addAction} class="text-xs text-accent hover:underline">+ Add action</button>
		</div>

		{#each actions as action, i}
			<div class="rounded-lg bg-surface-overlay p-3 space-y-2">
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={action.name}
						placeholder="Action name"
						class="flex-1 rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
					/>
					<select
						bind:value={action.type}
						class="rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
					>
						{#each ACTION_TYPES as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
					<button type="button" onclick={() => removeAction(i)} class="text-on-muted hover:text-on-surface" aria-label="Remove action">✕</button>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<div>
						<label class="mb-0.5 block text-xs text-on-muted" for={`action-${i}-dice`}>Dice</label>
						<input
							id={`action-${i}-dice`}
							type="number"
							min="0"
							value={action.diceCount ?? ''}
							oninput={(e) => {
								const v = (e.target as HTMLInputElement).value;
								action.diceCount = v === '' ? undefined : parseInt(v) || 0;
							}}
							placeholder="e.g. 2"
							class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
					<div>
						<label class="mb-0.5 block text-xs text-on-muted" for={`action-${i}-activation`}>Activation</label>
						<input
							id={`action-${i}-activation`}
							type="text"
							bind:value={action.activationValue}
							placeholder="e.g. 4+"
							class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
					<div>
						<label class="mb-0.5 block text-xs text-on-muted" for={`action-${i}-bonus`}>Bonus</label>
						<input
							id={`action-${i}-bonus`}
							type="text"
							bind:value={action.bonus}
							placeholder="e.g. +3"
							class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
				</div>
				<input
					type="text"
					bind:value={action.effect}
					placeholder="Effect description"
					class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
				/>
			</div>
		{/each}
	</section>

	<!-- Keywords & Upgrade Slots -->
	<section class="space-y-3">
		<h2 class="text-sm font-semibold uppercase tracking-wider text-on-muted">Keywords &amp; Slots</h2>
		<div>
			<label class="mb-1 block text-sm" for="keywords">Keywords (comma-separated)</label>
			<input
				id="keywords"
				type="text"
				bind:value={keywords}
				placeholder="Hero, Construct, ..."
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent {confidenceClass('keywords')}"
			/>
		</div>

		<div>
			<span class="mb-1 block text-sm">Upgrade slots</span>
			<p class="mb-2 text-xs text-on-muted">
				How many of each slot icon does this character's inventory show?
			</p>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each UPGRADE_SLOT_TYPES as t}
					<div class="flex items-center justify-between gap-2 rounded-lg bg-surface-overlay px-3 py-2">
						<label for={`slot-${t.value}`} class="text-sm">{t.label}</label>
						<input
							id={`slot-${t.value}`}
							type="number"
							min="0"
							bind:value={upgradeSlotCounts[t.value]}
							class="w-14 rounded bg-surface px-2 py-1 text-right text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Notes -->
	<section>
		<label class="mb-1 block text-sm" for="notes">Notes</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="2"
			placeholder="Optional free-text notes"
			class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
		></textarea>
	</section>

	<!-- Actions -->
	<div class="flex gap-3 pb-4">
		<Button variant="ghost" onclick={oncancel}>Cancel</Button>
		<Button variant="primary" type="submit">Save card</Button>
	</div>
</form>
