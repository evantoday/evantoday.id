export const SITE_TITLE = 'Evan Today';
export const SITE_DESCRIPTION = 'Expert guides on personal finance, investing, insurance, and money management. Practical advice to help you budget, save, and build wealth.';
export const SITE_URL = 'https://evantoday.id';
export const SITE_AUTHOR = 'Evan';

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
	'personal-finance': 'Budgeting, saving, and money management strategies to take control of your finances.',
	'fintech': 'Reviews and guides on the best financial technology apps and services.',
	'cryptocurrency': 'Bitcoin, Ethereum, and crypto investing guides for beginners and beyond.',
	'insurance': 'Life, health, auto, and home insurance comparisons and buying guides.',
	'investing': 'Stock market, ETFs, index funds, and portfolio strategies for every level.',
	'digital-banking': 'Online banks, neobanks, and high-yield savings account reviews and comparisons.',
	'financial-tips': 'Actionable money tips, hacks, and strategies to improve your financial life.',
};
