import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				surface: {
					DEFAULT: '#1a1a2e',
					raised: '#16213e',
					overlay: '#0f3460'
				},
				accent: {
					DEFAULT: '#e94560',
					muted: '#c73652'
				},
				on: {
					surface: '#e2e8f0',
					muted: '#94a3b8',
					accent: '#ffffff'
				}
			},
			minHeight: {
				touch: '44px'
			},
			minWidth: {
				touch: '44px'
			}
		}
	},
	plugins: []
} satisfies Config;
