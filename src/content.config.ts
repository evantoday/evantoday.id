import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string().max(160),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			author: z.string().default('Evan Today'),
			category: z.enum([
				'personal-finance',
				'fintech',
				'cryptocurrency',
				'insurance',
				'investing',
				'digital-banking',
				'financial-tips',
			]),
			tags: z.array(z.string()).default([]),
			heroImage: z.optional(image()),
			heroImageAlt: z.string().default(''),
			draft: z.boolean().default(false),
		}),
});

export const collections = { blog };
