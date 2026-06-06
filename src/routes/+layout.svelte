<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/collection', label: 'Cards', icon: '🗂' },
		{ href: '/roster', label: 'Rosters', icon: '📋' },
		{ href: '/game', label: 'Games', icon: '🎲' },
		{ href: '/campaign', label: 'Camp.', icon: '🏕' }
	] as const;

	function isActive(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<div class="flex min-h-screen flex-col">
	<main class="flex-1 overflow-y-auto pb-16">
		<slot />
	</main>

	<!-- Bottom navigation bar -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-white/10 bg-surface-raised"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		{#each navItems as item}
			<a
				href={item.href}
				class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors
					{isActive(item.href)
					? 'text-accent'
					: 'text-on-muted hover:text-on-surface'}"
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				<span class="text-lg leading-none" aria-hidden="true">{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</div>
