import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [
		svelteTesting(),
		tailwindcss(),
		sveltekit({ adapter: adapter() }),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Storage',
				short_name: 'Storage',
				description: 'Personal cloud upload with a fluid, playful interface.',
				theme_color: '#060b18',
				background_color: '#050b17',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
				navigateFallback: '/',
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
						handler: 'CacheFirst',
						options: { cacheName: 'google-fonts', expiration: { maxEntries: 12, maxAgeSeconds: 31536000 } }
					}
				]
			},
			devOptions: { enabled: false }
		})
	],
	test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
