// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeExternalLinks from 'rehype-external-links';
import { defineConfig } from 'astro/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Build a slug → lastmod date mapping from blog content frontmatter
function buildDateMap() {
	const map = {};
	const blogDir = join(process.cwd(), 'src', 'content', 'blog');
	try {
		const files = readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
		for (const file of files) {
			const content = readFileSync(join(blogDir, file), 'utf-8');
			const slug = file.replace(/\.(md|mdx)$/, '');
			const updatedMatch = content.match(/updatedDate:\s*(.+)/);
			const pubMatch = content.match(/pubDate:\s*(.+)/);
			const dateStr = updatedMatch?.[1]?.trim() || pubMatch?.[1]?.trim();
			if (dateStr) {
				map[slug] = new Date(dateStr).toISOString();
			}
		}
	} catch {}
	return map;
}

const dateMap = buildDateMap();

// https://astro.build/config
export default defineConfig({
	site: 'https://evantoday.id',
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				// Set lastmod from actual content dates for blog posts
				const slugMatch = item.url.match(/\/blog\/([^/]+)\/?$/);
				if (slugMatch && dateMap[slugMatch[1]]) {
					item.lastmod = dateMap[slugMatch[1]];
				}

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
				rel: ['noopener', 'noreferrer'],
			}],
		],
	},
});
