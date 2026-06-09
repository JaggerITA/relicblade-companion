<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import IconLegend from '$lib/components/shared/IconLegend.svelte';
	import { ACTION_TYPE_ICONS, UPGRADE_SLOT_TYPE_ICONS } from '$lib/constants/icons.js';
	import type { Action, ActionType, UpgradeSlotType } from '$lib/models/Character.js';
	import type { Upgrade } from '$lib/models/Upgrade.js';

	const UPGRADE_SLOT_TYPES: { value: UpgradeSlotType; label: string }[] = [
		{ value: 'weapon', label: 'Weapon' },
		{ value: 'tactic', label: 'Tactic' },
		{ value: 'potion', label: 'Potion' },
		{ value: 'spell', label: 'Spell' },
		{ value: 'item', label: 'Item' }
	];

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
		initial?: Partial<Upgrade>;
		onsubmit: (data: Omit<Upgrade, 'id' | 'createdAt'>) => void;
		oncancel: () => void;
	}

	let { initial = {}, onsubmit, oncancel }: Props = $props();

	// untrack: intentionally capture prop values once to seed form state
	let name = $state(untrack(() => initial.name ?? ''));
	let type = $state<UpgradeSlotType>(untrack(() => initial.type ?? 'weapon'));
	let cost = $state(untrack(() => initial.cost ?? 0));
	let effect = $state(untrack(() => initial.effect ?? ''));
	let restrictions = $state(untrack(() => initial.restrictions?.join(', ') ?? ''));
	let errors = $state<Record<string, string>>({});

	// Optional action this upgrade grants
	let hasAction = $state(untrack(() => !!initial.action));
	function blankAction(): Action {
		return { name: '', type: 'melee-weapon', diceCount: undefined, activationValue: '', effect: '', bonus: '' };
	}
	let action = $state<Action>(untrack(() => initial.action ? { ...initial.action } : blankAction()));

	const SelectedSlotIcon = $derived(UPGRADE_SLOT_TYPE_ICONS[type]);
	const ActionIcon = $derived(ACTION_TYPE_ICONS[action.type]);

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		if (cost < 0) e.cost = 'Cost must be 0 or greater';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function handleSubmit() {
		if (!validate()) return;
		const plainAction = hasAction ? ($state.snapshot(action) as Action) : undefined;
		onsubmit({
			name: name.trim(),
			type,
			cost,
			effect,
			action: plainAction,
			restrictions: restrictions.split(',').map((r) => r.trim()).filter(Boolean),
			source: initial.source ?? 'manual'
		});
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
	<div>
		<label class="mb-1 block text-sm" for="uname">Name *</label>
		<input
			id="uname"
			type="text"
			bind:value={name}
			placeholder="Upgrade name"
			class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>
		{#if errors.name}<p class="mt-1 text-xs text-red-400">{errors.name}</p>{/if}
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="mb-1 block text-sm" for="utype">Slot type</label>
			<div class="flex items-center gap-2">
				<span
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay text-on-muted"
					aria-hidden="true"
				>
					<SelectedSlotIcon class="h-4 w-4" />
				</span>
				<select
					id="utype"
					bind:value={type}
					class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
				>
					{#each UPGRADE_SLOT_TYPES as t}
						<option value={t.value}>{t.label}</option>
					{/each}
				</select>
			</div>
		</div>
		<div>
			<label class="mb-1 block text-sm" for="ucost">Cost (inf.)</label>
			<input
				id="ucost"
				type="number"
				min="0"
				bind:value={cost}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			/>
			{#if errors.cost}<p class="mt-1 text-xs text-red-400">{errors.cost}</p>{/if}
		</div>
	</div>

	<div>
		<label class="mb-1 block text-sm" for="ueffect">Effect</label>
		<textarea
			id="ueffect"
			bind:value={effect}
			rows="2"
			placeholder="What this upgrade does"
			class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
		></textarea>
	</div>

	<!-- Optional structured action -->
	<section class="space-y-3 rounded-lg border border-white/10 p-3">
		<label class="flex items-center gap-2 text-sm font-medium">
			<input
				type="checkbox"
				bind:checked={hasAction}
				class="h-4 w-4 rounded border-white/30 bg-transparent text-accent focus:ring-accent"
			/>
			This upgrade grants an action
		</label>
		<IconLegend icons={ACTION_TYPE_ICONS} title="Action type icons" />

		{#if hasAction}
			<div class="space-y-2">
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={action.name}
						placeholder="Action name"
						class="flex-1 rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
					/>
					<span
						class="flex shrink-0 items-center justify-center rounded bg-surface px-2 text-on-muted"
						aria-hidden="true"
					>
						<ActionIcon class="h-4 w-4" />
					</span>
					<select
						bind:value={action.type}
						class="rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
					>
						{#each ACTION_TYPES as t}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<div>
						<label class="mb-0.5 block text-xs text-on-muted" for="action-dice">Dice</label>
						<input
							id="action-dice"
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
						<label class="mb-0.5 block text-xs text-on-muted" for="action-activation">Activation</label>
						<input
							id="action-activation"
							type="text"
							bind:value={action.activationValue}
							placeholder="e.g. 4+"
							class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
						/>
					</div>
					<div>
						<label class="mb-0.5 block text-xs text-on-muted" for="action-bonus">Bonus</label>
						<input
							id="action-bonus"
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
					placeholder="Action effect description"
					class="w-full rounded bg-surface px-2 py-1.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-accent"
				/>
			</div>
		{/if}
	</section>

	<div>
		<label class="mb-1 block text-sm" for="urestrictions">Restrictions (comma-separated keywords)</label>
		<input
			id="urestrictions"
			type="text"
			bind:value={restrictions}
			placeholder="Hero, ..."
			class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>
	</div>

	<div class="flex gap-3 pb-4">
		<Button variant="ghost" onclick={oncancel}>Cancel</Button>
		<Button variant="primary" type="submit">Save upgrade</Button>
	</div>
</form>
