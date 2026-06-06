<script lang="ts">
	import { page } from '$app/stores';
	const id = $derived($page.params.id);
</script>

<div class="p-4">
	<header class="mb-4 flex items-center gap-3">
		<a href="/roster" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Roster Builder</h1>
	</header>

	<!-- TODO Sprint 5: RosterBuilder + sticky InfluenceBar for id={id} -->
	<p class="text-on-muted">Roster builder for <code>{id}</code> coming in Sprint 5.</p>
</div>
