<script lang="ts">
	import Modal from '$lib/components/shared/Modal.svelte';
	import CharacterPreview from './CharacterPreview.svelte';
	import type { Character } from '$lib/models/Character.js';

	interface Props {
		open: boolean;
		characters: Character[];
		onpick: (characterId: string) => void;
		onclose: () => void;
		title?: string;
		actionLabel?: string;
	}

	let { open, characters, onpick, onclose, title = 'Add character', actionLabel = '+ Add to roster' }: Props = $props();

	let search = $state('');
	let expandedId = $state<string | null>(null);

	const filtered = $derived.by(() => {
		const q = search.toLowerCase();
		return characters.filter(
			(c) => !q || c.name.toLowerCase().includes(q) || c.faction.toLowerCase().includes(q)
		);
	});

	function toggle(id: string): void {
		expandedId = expandedId === id ? null : id;
	}

	function pick(characterId: string): void {
		search = '';
		expandedId = null;
		onpick(characterId);
	}

	function close(): void {
		search = '';
		expandedId = null;
		onclose();
	}
</script>

<Modal open={open} title={title} onclose={close}>
	{#snippet children()}
		<input
			type="search"
			bind:value={search}
			placeholder="Search…"
			class="mb-3 w-full rounded-lg bg-surface-overlay px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-accent"
		/>
		<div class="max-h-[70vh] space-y-1.5 overflow-y-auto">
			{#if characters.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">No characters in your collection yet.</p>
			{:else if filtered.length === 0}
				<p class="py-6 text-center text-sm text-on-muted">No results for "{search}"</p>
			{:else}
				{#each filtered as char (char.id)}
					{@const expanded = expandedId === char.id}
					<div class="overflow-hidden rounded-lg bg-surface-overlay">
						<!-- Row header — tap to expand preview -->
						<button
							type="button"
							onclick={() => toggle(char.id)}
							class="flex min-h-touch w-full items-center justify-between px-3 py-2 text-left hover:bg-white/10"
							aria-expanded={expanded}
						>
							<div class="min-w-0">
								<p class="truncate font-semibold">{char.name}</p>
								<p class="truncate text-xs text-on-muted capitalize">
									{char.path}{#if char.faction} · {char.faction}{/if}
								</p>
							</div>
							<div class="ml-3 flex shrink-0 items-center gap-2">
								<span class="text-sm font-semibold text-accent">{char.cost} inf</span>
								<span class="text-xs text-on-muted" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
							</div>
						</button>

						<!-- Inline preview -->
						{#if expanded}
							<div class="border-t border-white/10 px-3 pb-3 pt-2">
								<CharacterPreview character={char} />
								<button
									type="button"
									onclick={() => pick(char.id)}
									class="btn-primary mt-3 w-full text-sm"
								>
									{actionLabel}
								</button>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{/snippet}
</Modal>
