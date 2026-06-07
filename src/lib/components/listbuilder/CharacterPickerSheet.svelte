<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import type { Character } from '$lib/models/Character.js';

	interface Props {
		open: boolean;
		/** Collection characters not yet in the roster. */
		characters: Character[];
		onpick: (characterId: string) => void;
		onclose: () => void;
	}

	let { open, characters, onpick, onclose }: Props = $props();

	let search = $state('');

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		return characters.filter(
			(c) => !q || c.name.toLowerCase().includes(q) || c.faction.toLowerCase().includes(q)
		);
	});

	function close() {
		search = '';
		onclose();
	}
</script>

<Modal open={open} title="Add character" onclose={close}>
	{#snippet children()}
		<input
			type="search"
			bind:value={search}
			placeholder="Search…"
			class="mb-3 w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>
		<div class="max-h-80 space-y-2 overflow-y-auto">
			{#if characters.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">
					Every card in your collection is already in this roster.
				</p>
			{:else if filtered.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">No results for "{search}"</p>
			{:else}
				{#each filtered as char (char.id)}
					<button
						type="button"
						onclick={() => { search = ''; onpick(char.id); }}
						class="flex w-full items-center justify-between rounded-lg bg-surface-overlay px-3 py-2 text-left hover:bg-white/10"
					>
						<div class="min-w-0">
							<p class="truncate font-semibold">{char.name}</p>
							<p class="truncate text-xs text-on-muted">
								<span class="capitalize">{char.path}</span>
								{#if char.faction} · {char.faction}{/if}
							</p>
						</div>
						<span class="ml-3 shrink-0 text-sm font-semibold text-accent">{char.cost} inf</span>
					</button>
				{/each}
			{/if}
		</div>
	{/snippet}
</Modal>
