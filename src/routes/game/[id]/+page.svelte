<script lang="ts">
	import { page } from '$app/stores';
	const id = $derived($page.params.id);
</script>

<div class="p-4">
	<header class="mb-4 flex items-center gap-3">
		<a href="/game" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Game Manager</h1>
	</header>

	<!-- TODO Sprint 6: GameManager for id={id} -->
	<p class="text-on-muted">Game manager for <code>{id}</code> coming in Sprint 6.</p>
</div>
