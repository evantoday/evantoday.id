export const SITE_TITLE = 'Evan Today';
export const SITE_DESCRIPTION = 'Panduan lengkap keuangan pribadi, investasi, asuransi, dan pengelolaan uang untuk Indonesia. Tips praktis untuk mengatur anggaran, menabung, dan membangun kekayaan.';
export const SITE_URL = 'https://evantoday.id';
export const SITE_AUTHOR = 'Evan Today';

export const CATEGORIES = [
	'personal-finance',
	'fintech',
	'cryptocurrency',
	'insurance',
	'investing',
	'digital-banking',
	'financial-tips',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
	'personal-finance': 'Keuangan Pribadi',
	'fintech': 'Fintech',
	'cryptocurrency': 'Kripto',
	'insurance': 'Asuransi',
	'investing': 'Investasi',
	'digital-banking': 'Bank Digital',
	'financial-tips': 'Tips Keuangan',
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
	'personal-finance': 'Panduan budgeting, menabung, dan mengelola keuangan dengan strategi yang terbukti berhasil di berbagai level penghasilan.',
	'fintech': 'Review dan panduan aplikasi keuangan terbaik di Indonesia — GoPay, OVO, Dana, dan platform fintech lainnya.',
	'cryptocurrency': 'Panduan investasi Bitcoin, Ethereum, dan crypto untuk pemula — staking, risiko, dan strategi di Indonesia.',
	'insurance': 'Bandingkan asuransi jiwa, kesehatan, kendaraan, dan rumah. Temukan perlindungan terbaik tanpa bayar lebih.',
	'investing': 'Mulai investasi dengan percaya diri — saham, reksadana, obligasi, dan strategi portofolio untuk pemula.',
	'digital-banking': 'Review bank digital dan rekening tabungan bunga tinggi terbaik di Indonesia. Perbandingan neobank dan suku bunga.',
	'financial-tips': 'Tips keuangan praktis untuk menghemat pengeluaran, meningkatkan tabungan, dan membangun kekayaan lebih cepat.',
};
