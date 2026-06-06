<script lang="ts">
	interface Props {
		variant?: 'primary' | 'ghost' | 'danger';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		onclick?: () => void;
		children: import('svelte').Snippet;
	}

	let { variant = 'ghost', type = 'button', disabled = false, onclick, children }: Props = $props();

	const styles = {
		primary: 'bg-accent text-white hover:bg-accent-muted active:scale-95',
		ghost: 'text-on-muted hover:bg-white/10 active:scale-95',
		danger: 'bg-red-700 text-white hover:bg-red-800 active:scale-95'
	};
</script>

<button
	{type}
	{disabled}
	{onclick}
	class="min-h-touch inline-flex items-center justify-center rounded-lg px-4 font-medium transition-colors disabled:opacity-40 {styles[variant]}"
>
	{@render children()}
</button>
