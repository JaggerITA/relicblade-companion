<script lang="ts">
	import { base } from '$app/paths';
</script>

<div class="p-4">
	<header class="mb-4 flex items-center gap-3">
		<a href="{base}/collection" class="text-on-muted hover:text-on-surface">‹</a>
		<h1 class="text-xl font-bold">Scan Card</h1>
	</header>

	<!-- TODO Sprint 4: camera capture + OCR pipeline -->
	<p class="text-on-muted">OCR scanner coming in Sprint 4.</p>
	<a href="{base}/collection/new" class="btn-ghost mt-4">✎ Enter manually instead</a>
</div>
