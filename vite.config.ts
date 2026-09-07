import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({ adapter: adapter() }),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Storage',
				short_name: 'Storage',
				description: 'Personal cloud upload with a fluid, playful interface.',
				theme_color: '#3fa9f5',
				background_color: '#e8f6ff',
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
