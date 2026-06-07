<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import Modal from '$lib/components/shared/Modal.svelte';
	import Button from '$lib/components/shared/Button.svelte';
	import InfluenceBar from '$lib/components/listbuilder/InfluenceBar.svelte';
	import CharacterPickerSheet from '$lib/components/listbuilder/CharacterPickerSheet.svelte';
	import UpgradePickerSheet from '$lib/components/listbuilder/UpgradePickerSheet.svelte';
	import { rosterStore } from '$lib/stores/rosterStore.svelte.js';
	import { collectionStore } from '$lib/stores/collectionStore.svelte.js';
	import { toastStore } from '$lib/stores/toastStore.svelte.js';
	import { charactersInfluence, upgradesInfluence, usedInfluence } from '$lib/utils/validation.js';

	const id = $derived($page.params.id ?? '');
	const roster = $derived(rosterStore.getRoster(id));

	let confirmDelete = $state(false);
	let showCharacterPicker = $state(false);
	let upgradeTargetCharacterId = $state<string | null>(null);

	$effect(() => {
		rosterStore.hydrate();
		collectionStore.hydrate();
	});

	const availableCharacters = $derived.by(() => {
		if (!roster) return [];
		const usedIds = new Set(roster.entries.map((e) => e.characterId));
		return collectionStore.characters.filter((c) => !usedIds.has(c.id));
	});

	const upgradeTarget = $derived(
		upgradeTargetCharacterId ? collectionStore.getCharacter(upgradeTargetCharacterId) : undefined
	);
	const upgradeTargetEntry = $derived(
		roster && upgradeTargetCharacterId
			? roster.entries.find((e) => e.characterId === upgradeTargetCharacterId)
			: undefined
	);
</script>

{#if roster}
	<div class="flex h-full flex-col">
		<header class="sticky top-0 z-10 flex items-center justify-between bg-surface px-4 pb-2 pt-4">
			<div class="flex items-center gap-3">
				<a href="{base}/roster" class="text-on-muted hover:text-on-surface">‹</a>
				<div class="min-w-0">
					<h1 class="truncate text-lg font-bold">{roster.name}</h1>
					<p class="truncate text-xs capitalize text-on-muted">
						{roster.limitMode} mode{#if roster.faction} · {roster.faction}{/if}
					</p>
				</div>
			</div>
			<button
				onclick={() => (confirmDelete = true)}
				class="shrink-0 text-sm text-on-muted hover:text-on-surface"
				aria-label="Delete roster"
			>
				Delete
			</button>
		</header>

		<div class="flex-1 overflow-y-auto px-4 py-2">
			{#if roster.entries.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
					<span class="mb-4 text-5xl" aria-hidden="true">🛡</span>
					<p class="mb-1 font-semibold text-on-surface">No characters yet</p>
					<p class="mb-6 text-sm">Add characters from your collection to build this warband.</p>
					<Button variant="primary" onclick={() => (showCharacterPicker = true)}>+ Add character</Button>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each roster.entries as entry (entry.characterId)}
						{@const character = collectionStore.getCharacter(entry.characterId)}
						{#if character}
							<li class="card">
								<div class="flex items-center justify-between">
									<div class="min-w-0">
										<p class="truncate font-semibold">{character.name}</p>
										<p class="truncate text-xs text-on-muted">
											<span class="capitalize">{character.path}</span>
											{#if character.faction} · {character.faction}{/if}
										</p>
									</div>
									<div class="ml-3 flex shrink-0 items-center gap-3">
										<span class="text-sm font-semibold text-accent">{entry.entryInfluence} inf</span>
										<button
											onclick={() => rosterStore.removeEntry(roster.id, entry.characterId)}
											class="text-on-muted hover:text-on-surface"
											aria-label="Remove {character.name} from roster"
										>
											✕
										</button>
									</div>
								</div>

								{#if entry.equippedUpgradeIds.length > 0}
									<ul class="mt-2 space-y-1 border-t border-white/10 pt-2">
										{#each entry.equippedUpgradeIds as upgradeId (upgradeId)}
											{@const upgrade = collectionStore.getUpgrade(upgradeId)}
											{#if upgrade}
												<li class="flex items-center justify-between pl-3 text-sm text-on-muted">
													<span class="truncate">▸ {upgrade.type}: {upgrade.name}</span>
													<div class="ml-3 flex shrink-0 items-center gap-2">
														<span>{upgrade.cost} inf</span>
														<button
															onclick={() => rosterStore.unequipUpgrade(roster.id, entry.characterId, upgradeId)}
															class="text-on-muted hover:text-on-surface"
															aria-label="Unequip {upgrade.name}"
														>
															✕
														</button>
													</div>
												</li>
											{/if}
										{/each}
									</ul>
								{/if}

								<button
									onclick={() => (upgradeTargetCharacterId = entry.characterId)}
									class="mt-2 pl-3 text-sm text-accent hover:underline"
								>
									▸ + add upgrade
								</button>
							</li>
						{/if}
					{/each}
				</ul>

				<button
					onclick={() => (showCharacterPicker = true)}
					class="mt-3 w-full rounded-lg border border-dashed border-white/20 py-3 text-sm text-on-muted hover:bg-white/5"
				>
					+ Add character
				</button>
			{/if}
		</div>

		<InfluenceBar
			used={usedInfluence(roster, collectionStore.charactersById, collectionStore.upgradesById)}
			max={roster.maxInfluence}
			mode={roster.limitMode}
			charactersInfluence={charactersInfluence(roster.entries, collectionStore.charactersById)}
			upgradesInfluence={upgradesInfluence(roster.entries, collectionStore.upgradesById)}
		/>
	</div>

	<CharacterPickerSheet
		open={showCharacterPicker}
		characters={availableCharacters}
		onpick={(characterId) => {
			rosterStore.addEntry(roster.id, characterId);
			showCharacterPicker = false;
		}}
		onclose={() => (showCharacterPicker = false)}
	/>

	{#if upgradeTarget && upgradeTargetEntry}
		<UpgradePickerSheet
			open={true}
			character={upgradeTarget}
			equippedUpgradeIds={upgradeTargetEntry.equippedUpgradeIds}
			collectionUpgrades={collectionStore.upgrades}
			upgradesById={collectionStore.upgradesById}
			onpick={(upgradeId) => {
				rosterStore.equipUpgrade(roster.id, upgradeTarget.id, upgradeId);
				upgradeTargetCharacterId = null;
			}}
			onclose={() => (upgradeTargetCharacterId = null)}
		/>
	{/if}

	<Modal open={confirmDelete} title="Delete roster?" onclose={() => (confirmDelete = false)}>
		{#snippet children()}
			<p class="text-on-muted">This cannot be undone. "{roster.name}" will be removed.</p>
		{/snippet}
		{#snippet actions()}
			<Button variant="ghost" onclick={() => (confirmDelete = false)}>Cancel</Button>
			<Button
				variant="danger"
				onclick={async () => {
					const name = roster.name;
					await rosterStore.deleteRoster(roster.id);
					goto(`${base}/roster`);
					toastStore.info(`${name} deleted`);
				}}
			>
				Delete
			</Button>
		{/snippet}
	</Modal>
{:else if rosterStore.loaded}
	<div class="p-4">
		<header class="mb-4 flex items-center gap-3">
			<a href="{base}/roster" class="text-on-muted hover:text-on-surface">‹</a>
			<h1 class="text-xl font-bold">Roster Builder</h1>
		</header>
		<p class="text-on-muted">Roster not found.</p>
		<a href="{base}/roster" class="mt-4 inline-block text-accent">Back to rosters</a>
	</div>
{:else}
	<div class="p-4">
		<p class="text-on-muted">Loading…</p>
	</div>
{/if}
