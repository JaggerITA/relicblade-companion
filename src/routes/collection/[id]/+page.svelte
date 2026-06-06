<script lang="ts">
	import { page } from '$app/stores';
	const id = $derived($page.params.id);
</script>

<div class="p-4">
	<header class="mb-4 flex items-center gap-3">
		<a href="/collection" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Edit Card</h1>
	</header>

	<!-- TODO Sprint 2: CardReviewForm pre-filled for id={id} -->
	<p class="text-on-muted">Card editor for <code>{id}</code> coming in Sprint 2.</p>
</div>
