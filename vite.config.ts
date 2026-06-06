import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: false, // we maintain our own static/manifest.json
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /tesseract-core.*\.wasm$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'tesseract-wasm',
							expiration: { maxAgeSeconds: 60 * 60 * 24 * 90 }
						}
					},
					{
						urlPattern: /\.traineddata(\.gz)?$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'tesseract-traineddata',
							expiration: { maxAgeSeconds: 60 * 60 * 24 * 90 }
						}
					}
				]
			}
		})
	]
});
