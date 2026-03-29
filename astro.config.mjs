// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeExternalLinks from 'rehype-external-links';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://evantoday.id',
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				// Add lastmod to all pages so Google knows when to re-crawl
				item.lastmod = new Date().toISOString();

				// Blog posts get higher priority
				if (item.url.includes('/blog/') && !item.url.endsWith('/blog/')) {
					item.changefreq = 'monthly';
					item.priority = 0.8;
				}
				// Category pages
				else if (item.url.includes('/category/')) {
					item.changefreq = 'weekly';
					item.priority = 0.6;
				}
				// Tag pages - lower priority to avoid thin page signals
				else if (item.url.includes('/tag/')) {
					item.changefreq = 'weekly';
					item.priority = 0.3;
				}
				// Pagination pages - low priority
				else if (item.url.includes('/page/')) {
					item.changefreq = 'weekly';
					item.priority = 0.2;
				}
				// Homepage
				else if (item.url === 'https://evantoday.id/') {
					item.changefreq = 'daily';
					item.priority = 1.0;
				}
				// Other pages
				else {
					item.changefreq = 'monthly';
					item.priority = 0.5;
				}
				return item;
			},
			filter(page) {
				// Exclude thin listing pages from sitemap
				return !page.includes('/blog/page/') && !page.includes('/tag/');
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
	build: {
		format: 'directory',
	},
	markdown: {
		shikiConfig: {
			theme: 'github-dark',
		},
		rehypePlugins: [
			[rehypeExternalLinks, {
				target: '_blank',
				rel: ['nofollow', 'noopener', 'noreferrer'],
			}],
		],
	},
});
