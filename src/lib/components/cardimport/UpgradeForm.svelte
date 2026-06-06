<script lang="ts">
	import { untrack } from 'svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import type { Upgrade } from '$lib/models/Upgrade.js';
	import type { UpgradeSlotType } from '$lib/models/Character.js';

	interface Props {
		initial?: Partial<Upgrade>;
		onsubmit: (data: Omit<Upgrade, 'id' | 'createdAt'>) => void;
		oncancel: () => void;
	}

	let { initial = {}, onsubmit, oncancel }: Props = $props();

	const SLOT_TYPES: UpgradeSlotType[] = ['weapon', 'potion', 'tactic', 'spell', 'item', 'other'];

	// untrack: intentionally capture prop values once to seed form state
	let name = $state(untrack(() => initial.name ?? ''));
	let type = $state<UpgradeSlotType>(untrack(() => initial.type ?? 'weapon'));
	let cost = $state(untrack(() => initial.cost ?? 0));
	let effect = $state(untrack(() => initial.effect ?? ''));
	let restrictions = $state(untrack(() => initial.restrictions?.join(', ') ?? ''));
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		if (cost < 0) e.cost = 'Cost must be 0 or greater';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function handleSubmit() {
		if (!validate()) return;
		onsubmit({
			name: name.trim(),
			type,
			cost,
			effect,
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
			<label class="mb-1 block text-sm" for="utype">Type *</label>
			<select
				id="utype"
				bind:value={type}
				class="w-full rounded-lg bg-surface-overlay px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-accent"
			>
				{#each SLOT_TYPES as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
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
