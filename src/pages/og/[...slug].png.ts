import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'fs';
import { join } from 'path';
import satori from 'satori';
import sharp from 'sharp';
import { CATEGORY_LABELS, type Category } from '../../consts';

const categoryGradients: Record<string, [string, string]> = {
	'personal-finance': ['#3b82f6', '#1d4ed8'],
	'fintech': ['#a855f7', '#7c3aed'],
	'cryptocurrency': ['#f97316', '#ea580c'],
	'insurance': ['#22c55e', '#16a34a'],
	'investing': ['#10b981', '#059669'],
	'digital-banking': ['#06b6d4', '#0891b2'],
	'financial-tips': ['#f59e0b', '#d97706'],
};

export const getStaticPaths: GetStaticPaths = async () => {
	const posts = (await getCollection('blog')).filter((p) => !p.data.draft);
	return posts.map((post) => ({
		params: { slug: post.id },
		props: { title: post.data.title, category: post.data.category },
	}));
};

export const GET: APIRoute = async ({ props }) => {
	const { title, category } = props;
	const [color1, color2] = categoryGradients[category] || ['#3b82f6', '#1d4ed8'];
	const categoryLabel = CATEGORY_LABELS[category as Category] || category;

	const fontRegular = readFileSync(join(process.cwd(), 'public/fonts/atkinson-regular.woff'));
	const fontBold = readFileSync(join(process.cwd(), 'public/fonts/atkinson-bold.woff'));

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '1200px',
					height: '630px',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '60px 80px',
					background: `linear-gradient(135deg, ${color1}, ${color2})`,
					fontFamily: 'Atkinson',
				},
				children: [
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								flexDirection: 'column',
								gap: '20px',
							},
							children: [
								{
									type: 'div',
									props: {
										style: {
											display: 'flex',
											alignItems: 'center',
											gap: '12px',
										},
										children: [
											{
												type: 'div',
												props: {
													style: {
														background: 'rgba(255,255,255,0.2)',
														padding: '6px 16px',
														borderRadius: '20px',
														fontSize: '20px',
														color: 'white',
													},
													children: categoryLabel,
												},
											},
										],
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: title.length > 60 ? '42px' : '52px',
											fontWeight: 700,
											color: 'white',
											lineHeight: 1.2,
											maxWidth: '900px',
										},
										children: title,
									},
								},
							],
						},
					},
					{
						type: 'div',
						props: {
							style: {
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							},
							children: [
								{
									type: 'div',
									props: {
										style: {
											fontSize: '28px',
											fontWeight: 700,
											color: 'rgba(255,255,255,0.9)',
										},
										children: 'evantoday.id',
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: '18px',
											color: 'rgba(255,255,255,0.7)',
										},
										children: 'Personal Finance & Fintech',
									},
								},
							],
						},
					},
				],
			},
		},
		{
			width: 1200,
			height: 630,
			fonts: [
				{ name: 'Atkinson', data: fontRegular, weight: 400, style: 'normal' },
				{ name: 'Atkinson', data: fontBold, weight: 700, style: 'normal' },
			],
		}
	);

	const png = await sharp(Buffer.from(svg)).png({ quality: 85 }).toBuffer();

	return new Response(png, {
		headers: { 'Content-Type': 'image/png' },
	});
};
