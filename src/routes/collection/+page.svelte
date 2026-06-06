<script lang="ts">
</script>

<div class="p-4">
	<header class="mb-4 flex items-center justify-between">
		<h1 class="text-xl font-bold">Collection</h1>
		<a href="/settings" class="text-on-muted hover:text-on-surface" aria-label="Settings">⚙</a>
	</header>

	<!-- TODO Sprint 2: search bar, type + faction filters, card list -->
	<div class="flex flex-col items-center justify-center py-16 text-center text-on-muted">
		<span class="mb-4 text-5xl" aria-hidden="true">🗂</span>
		<p class="mb-1 font-semibold text-on-surface">Your collection is empty</p>
		<p class="mb-6 text-sm">Add your cards to start building warbands.</p>
		<a href="/collection/scan" class="btn-primary mb-3 w-48">📷 Scan a card</a>
		<a href="/collection/new" class="btn-ghost w-48">✎ Enter manually</a>
		<p class="mt-6 text-xs">Cards are saved on this device.</p>
	</div>

	<!-- FAB — will be replaced by a real FAB in Sprint 2 -->
	<a
		href="/collection/new"
		class="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg"
		aria-label="Add card"
	>
		+
	</a>
</div>
