import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';
import satori from 'satori';
import sharp from 'sharp';

export const GET: APIRoute = async () => {
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
					background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
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
											fontSize: '64px',
											fontWeight: 700,
											color: 'white',
											lineHeight: 1.2,
										},
										children: 'Evan Today',
									},
								},
								{
									type: 'div',
									props: {
										style: {
											fontSize: '32px',
											color: 'rgba(255,255,255,0.85)',
											lineHeight: 1.4,
										},
										children: 'Keuangan Pribadi & Tips Finansial Indonesia',
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
								justifyContent: 'flex-start',
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
