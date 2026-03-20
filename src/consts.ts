export const SITE_TITLE = 'Evan Today';
export const SITE_DESCRIPTION = 'Expert guides on personal finance, fintech reviews, investment strategies, and money management tips for Indonesia and Southeast Asia.';
export const SITE_URL = 'https://evantoday.id';

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
