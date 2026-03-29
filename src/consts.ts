export const SITE_TITLE = 'Evan Today';
export const SITE_DESCRIPTION = 'Expert guides on personal finance, investing, insurance, and money management. Practical advice to help you budget, save, and build wealth.';
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
	'personal-finance': 'Personal Finance',
	'fintech': 'Fintech',
	'cryptocurrency': 'Cryptocurrency',
	'insurance': 'Insurance',
	'investing': 'Investing',
	'digital-banking': 'Digital Banking',
	'financial-tips': 'Financial Tips',
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
	'personal-finance': 'Learn how to budget, save money, and manage your finances with proven strategies that work on any income.',
	'fintech': 'Honest reviews and how-to guides for the best financial apps, payment platforms, and money tools in 2026.',
	'cryptocurrency': 'Bitcoin, Ethereum, and crypto investing explained — beginner guides, staking, and risk management.',
	'insurance': 'Compare life, health, auto, and home insurance policies. Find the right coverage without overpaying.',
	'investing': 'Start investing with confidence — stock market basics, ETFs, index funds, and portfolio strategies.',
	'digital-banking': 'Find the best online banks and high-yield savings accounts. Neobank reviews and rate comparisons.',
	'financial-tips': 'Quick, actionable money tips and strategies to cut expenses, boost savings, and build wealth faster.',
};
