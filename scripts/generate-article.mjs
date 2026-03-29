import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'blog');
const IMAGES_DIR = join(CONTENT_DIR, 'images');
const KEYWORD_BANK_PATH = join(__dirname, 'keyword-bank.json');
const PUBLISHED_LOG_PATH = join(__dirname, 'published-log.json');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_SEARCH_TERMS = {
	'personal-finance': 'money budget finance planning',
	'fintech': 'financial technology mobile banking app',
	'cryptocurrency': 'bitcoin cryptocurrency digital',
	'insurance': 'insurance protection family security',
	'investing': 'stock market investing growth',
	'digital-banking': 'online banking digital savings',
	'financial-tips': 'money savings wealth financial',
};

async function fetchHeroImage(keyword, slug) {
	const accessKey = process.env.UNSPLASH_ACCESS_KEY;
	if (!accessKey) {
		console.log('  No UNSPLASH_ACCESS_KEY — skipping image download');
		return null;
	}

	const searchTerms = keyword.keyword
		.replace(/[^a-zA-Z\s]/g, '')
		.split(' ')
		.filter((w) => w.length > 3)
		.slice(0, 3)
		.join(' ');
	const query = searchTerms || CATEGORY_SEARCH_TERMS[keyword.category] || 'finance money';

	try {
		const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5&client_id=${accessKey}`;
		const res = await fetch(url);
		if (!res.ok) {
			console.log(`  Unsplash API error: ${res.status} — skipping image`);
			return null;
		}

		const data = await res.json();
		if (!data.results || data.results.length === 0) {
			// Fallback to category-level search
			const fallbackUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(CATEGORY_SEARCH_TERMS[keyword.category] || 'finance')}&orientation=landscape&per_page=5&client_id=${accessKey}`;
			const fallbackRes = await fetch(fallbackUrl);
			const fallbackData = await fallbackRes.json();
			if (!fallbackData.results?.length) {
				console.log('  No Unsplash results found — skipping image');
				return null;
			}
			data.results = fallbackData.results;
		}

		// Pick a random image from top results to avoid repetition
		const photo = data.results[Math.floor(Math.random() * data.results.length)];
		const imageUrl = `${photo.urls.regular}&w=1200&h=630&fit=crop`;
		const altText = photo.alt_description || photo.description || `Photo by ${photo.user.name} on Unsplash`;
		const photographer = photo.user.name;

		// Download the image
		const imgRes = await fetch(imageUrl);
		if (!imgRes.ok) {
			console.log(`  Failed to download image: ${imgRes.status}`);
			return null;
		}

		const buffer = Buffer.from(await imgRes.arrayBuffer());
		const imagePath = join(IMAGES_DIR, `${slug}.jpg`);
		writeFileSync(imagePath, buffer);
		console.log(`  Image saved: ${slug}.jpg (by ${photographer})`);

		// Trigger Unsplash download endpoint (required by API guidelines)
		if (photo.links?.download_location) {
			fetch(`${photo.links.download_location}?client_id=${accessKey}`).catch(() => {});
		}

		return { path: `./images/${slug}.jpg`, alt: altText, photographer };
	} catch (err) {
		console.log(`  Image fetch failed: ${err.message} — skipping`);
		return null;
	}
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getNextKeyword() {
  const keywordBank = JSON.parse(readFileSync(KEYWORD_BANK_PATH, 'utf-8'));
  const publishedLog = JSON.parse(readFileSync(PUBLISHED_LOG_PATH, 'utf-8'));
  const publishedKeywords = new Set(publishedLog.map((entry) => entry.keyword));

  // Collect all unpublished keywords, sorted by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const candidates = [];

  for (const [category, keywords] of Object.entries(keywordBank)) {
    for (const entry of keywords) {
      if (!publishedKeywords.has(entry.keyword)) {
        candidates.push({ ...entry, category });
      }
    }
  }

  candidates.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  if (candidates.length === 0) {
    console.log('All keywords have been published. Add more to keyword-bank.json.');
    process.exit(0);
  }

  return candidates[0];
}

function getExistingArticles() {
  const log = JSON.parse(readFileSync(PUBLISHED_LOG_PATH, 'utf-8'));
  return log.map((entry) => ({
    title: entry.keyword,
    slug: entry.slug,
    category: entry.category,
  }));
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

async function generateArticle(keyword) {
  const pubDate = getTodayDate();
  const existingArticles = getExistingArticles();

  // Build internal linking context
  const relatedArticles = existingArticles
    .filter((a) => a.slug)
    .slice(-30)
    .map((a) => `- [${a.title}](/blog/${a.slug}/)`)
    .join('\n');

  const internalLinkInstruction = relatedArticles.length > 0
    ? `\n- IMPORTANT: Naturally include 2-4 internal links to these existing articles on our site where relevant. Use markdown links like [anchor text](/blog/slug/). Here are our existing articles:\n${relatedArticles}\n  Only link where it makes contextual sense. Do not force links. NEVER use placeholder domains like example.com or yourwebsite.com — only use the exact /blog/slug/ paths listed above.`
    : '';

  const systemPrompt = `You are Evan, a personal finance writer. You run a blog called Evan Today where you share practical money advice for Americans.

Write in FIRST PERSON. You are a real person sharing your knowledge and experience. Use "I", "I've found", "in my experience", "what I recommend" etc. Sound like a real human blogger, NOT a corporate content mill or AI.

Your writing style:
- Conversational but knowledgeable — like explaining to a friend over coffee
- Use personal anecdotes ("I personally use...", "When I first tried...", "Last month I...")
- Be specific with American examples (real app names, real banks, actual dollar amounts)
- Have strong opinions — say "I think X is better than Y because..."
- Vary sentence length. Mix short punchy sentences with longer explanations
- Use contractions (don't, it's, you'll, I've)
- Address the reader directly ("you might be wondering...", "here's what I'd suggest...")

Article structure (follow this order):
1. Hook — open with a relatable scenario, surprising fact, or personal story (2-3 sentences)
2. **Key Takeaways** — a bullet list of 3-5 main points the reader will learn
3. Main content with H2 (##) and H3 (###) headings optimized for search intent
4. Each H2 section should be 200-400 words with actionable advice
5. Include at least one comparison table or numbered step-by-step where appropriate
6. **Frequently Asked Questions** section with 4-6 Q&As using ### for each question

SEO & CTR requirements:
- Title: include the target keyword naturally, 50-60 characters max
  - Use ONE power word or emotional trigger (e.g., "Proven", "Essential", "Complete", "Honest", "Ultimate", "Smart", "Real")
  - Include a number when relevant (e.g., "7 Proven Ways...", "Top 5...")
  - Use brackets for context when it fits naturally (e.g., "[2026 Guide]", "[Compared]", "[Step-by-Step]")
  - Front-load the most important/clickable words — don't bury the value proposition
  - Do NOT use clickbait or ALL CAPS words. Keep it honest and specific
- Meta description: 120-155 characters, must create a curiosity gap or promise a specific outcome
  - Start with a hook or bold claim, not "Learn how to..." or "Discover..."
  - Include a specific number, dollar amount, or timeframe when possible (e.g., "Save $500/month", "in under 10 minutes")
  - End with a micro call-to-action or open loop (e.g., "Here's exactly how.", "The last one surprised me.", "#3 is a game-changer.")
- Headings: use question-based H2s where possible (e.g., "How Much Should You Save?")
- Write 2500-3500 words for comprehensive coverage
- Use the target keyword naturally 3-5 times in the body (not stuffed)
- Include specific data points, dollar figures, percentages where relevant
- FAQ answers should be 2-4 sentences — concise enough for featured snippets
- Include the primary keyword naturally in the first paragraph and in at least one H2 heading

AI Search Optimization (GEO):
- Write direct, concise answers to questions in the first 1-2 sentences of each section — AI engines extract these as citations
- Use bullet points and numbered lists for key facts, steps, and comparisons
- Include unique data points, personal calculations, or original comparisons that cannot be found elsewhere
- Structure FAQ answers as complete standalone sentences (e.g., "The minimum deposit for X is Rp 100,000." not "Rp 100,000.")${internalLinkInstruction}

Do NOT:
- Include disclaimers in the body
- Use emojis
- Start with "In today's..." or "In this article..."
- Use generic filler phrases
- Repeat the same point in different words

Output format: Raw Markdown starting with YAML frontmatter block. Do NOT wrap in code fences.

The frontmatter MUST follow this exact format:
---
title: "Your Article Title Here"
description: "Meta description under 155 characters"
pubDate: ${pubDate}
updatedDate: ${pubDate}
category: "${keyword.category}"
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
author: "Evan Today"
---

After the frontmatter, write the full article in Markdown.`;

  const userPrompt = `Write a comprehensive, SEO-optimized article about: "${keyword.keyword}"

Article type: ${keyword.type}
Category: ${keyword.category}

Target audience: Americans aged 20-40 who want practical, actionable financial advice.
Search intent: Someone Googling "${keyword.keyword}" wants specific, detailed guidance — not vague tips.

Make it the most useful article on this topic for an American reader.`;

  console.log(`Generating article for: "${keyword.keyword}" (${keyword.category}/${keyword.type})`);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_completion_tokens: 8000,
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;

  if (!content || !content.startsWith('---')) {
    throw new Error('Generated content does not start with frontmatter. Output: ' + content?.slice(0, 200));
  }

  return content;
}

function saveArticle(content, keyword, heroImage) {
  const titleMatch = content.match(/title:\s*"(.+?)"/);
  const title = titleMatch ? titleMatch[1] : keyword.keyword;
  const slug = slugify(title);
  const filePath = join(CONTENT_DIR, `${slug}.md`);

  if (existsSync(filePath)) {
    console.log(`File already exists: ${filePath}. Skipping.`);
    return null;
  }

  // Inject heroImage into frontmatter if we have one
  if (heroImage) {
    content = content.replace(
      /^(---\n[\s\S]*?)(---)/m,
      `$1heroImage: '${heroImage.path}'\nheroImageAlt: '${heroImage.alt.replace(/'/g, "\\'")}'\n$2`
    );
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`Article saved: ${filePath}`);
  return { slug, filePath };
}

function updatePublishedLog(keyword, slug) {
  const log = JSON.parse(readFileSync(PUBLISHED_LOG_PATH, 'utf-8'));
  log.push({
    keyword: keyword.keyword,
    category: keyword.category,
    slug,
    date: new Date().toISOString().split('T')[0],
  });
  writeFileSync(PUBLISHED_LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf-8');
  console.log('Published log updated.');
}

function getNextKeywords(count) {
  const keywordBank = JSON.parse(readFileSync(KEYWORD_BANK_PATH, 'utf-8'));
  const publishedLog = JSON.parse(readFileSync(PUBLISHED_LOG_PATH, 'utf-8'));
  const publishedKeywords = new Set(publishedLog.map((entry) => entry.keyword));

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Group unpublished candidates by category
  const byCategory = {};
  for (const [category, keywords] of Object.entries(keywordBank)) {
    byCategory[category] = keywords
      .filter((entry) => !publishedKeywords.has(entry.keyword))
      .map((entry) => ({ ...entry, category }))
      .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
  }

  // Round-robin across categories for diversity
  const selected = [];
  const categories = Object.keys(byCategory).filter((c) => byCategory[c].length > 0);
  let catIndex = 0;

  while (selected.length < count && categories.length > 0) {
    const cat = categories[catIndex % categories.length];
    if (byCategory[cat].length > 0) {
      selected.push(byCategory[cat].shift());
    } else {
      categories.splice(catIndex % categories.length, 1);
      if (categories.length === 0) break;
      continue;
    }
    catIndex++;
  }

  if (selected.length === 0) {
    console.log('All keywords have been published. Add more to keyword-bank.json.');
    process.exit(0);
  }

  return selected;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required.');
    process.exit(1);
  }

  const count = parseInt(process.env.ARTICLE_COUNT || '1', 10);
  const keywords = getNextKeywords(count);
  console.log(`Generating ${keywords.length} article(s)...\n`);

  let generated = 0;

  for (const keyword of keywords) {
    try {
      console.log(`[${generated + 1}/${keywords.length}] Selected: "${keyword.keyword}" [${keyword.priority}] (${keyword.category})`);
      const content = await generateArticle(keyword);
      const titleMatch = content.match(/title:\s*"(.+?)"/);
      const tempSlug = slugify(titleMatch ? titleMatch[1] : keyword.keyword);
      const heroImage = await fetchHeroImage(keyword, tempSlug);
      const result = saveArticle(content, keyword, heroImage);

      if (result) {
        updatePublishedLog(keyword, result.slug);
        generated++;
        console.log(`  Done!\n`);
      }

      // Small delay between API calls to avoid rate limits
      if (generated < keywords.length) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`  Failed for "${keyword.keyword}":`, err.message);
      console.log('  Continuing with next keyword...\n');
    }
  }

  console.log(`\nFinished: ${generated}/${keywords.length} articles generated.`);
}

main().catch((err) => {
  console.error('Error generating articles:', err);
  process.exit(1);
});
