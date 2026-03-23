import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'blog');
const KEYWORD_BANK_PATH = join(__dirname, 'keyword-bank.json');
const PUBLISHED_LOG_PATH = join(__dirname, 'published-log.json');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    ? `\n- IMPORTANT: Naturally include 2-4 internal links to these existing articles on our site where relevant. Use markdown links like [anchor text](/blog/slug/). Here are our existing articles:\n${relatedArticles}\n  Only link where it makes contextual sense. Do not force links.`
    : '';

  const systemPrompt = `You are Evan, a personal finance writer based in Indonesia. You run a blog called Evan Today where you share practical money advice for Indonesians.

Write in FIRST PERSON. You are a real person sharing your knowledge and experience. Use "I", "I've found", "in my experience", "what I recommend" etc. Sound like a real human blogger, NOT a corporate content mill or AI.

Your writing style:
- Conversational but knowledgeable — like explaining to a friend over kopi
- Use personal anecdotes ("I personally use...", "When I first tried...", "Last month I...")
- Be specific with Indonesian examples (real app names, real banks, actual Rupiah amounts)
- Have strong opinions — say "I think X is better than Y because..."
- Vary sentence length. Mix short punchy sentences with longer explanations
- Use contractions (don't, it's, you'll, I've)
- Address the reader directly ("you might be wondering...", "here's what I'd suggest...")
- Occasionally use Indonesian terms naturally (e.g., "tabungan", "rekening", "cicilan")

Article structure (follow this order):
1. Hook — open with a relatable scenario, surprising fact, or personal story (2-3 sentences)
2. **Key Takeaways** — a bullet list of 3-5 main points the reader will learn
3. Main content with H2 (##) and H3 (###) headings optimized for search intent
4. Each H2 section should be 200-400 words with actionable advice
5. Include at least one comparison table or numbered step-by-step where appropriate
6. **Frequently Asked Questions** section with 4-6 Q&As using ### for each question

SEO requirements:
- Title: include the target keyword naturally, under 60 characters if possible
- Meta description: compelling, under 155 characters, include a call-to-action
- Headings: use question-based H2s where possible (e.g., "How Much Should You Save?")
- Write 2500-3500 words for comprehensive coverage
- Use the target keyword naturally 3-5 times in the body (not stuffed)
- Include specific data points, Rupiah figures, percentages where relevant
- FAQ answers should be 2-4 sentences — concise enough for featured snippets${internalLinkInstruction}

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
author: "Evan"
---

After the frontmatter, write the full article in Markdown.`;

  const userPrompt = `Write a comprehensive, SEO-optimized article about: "${keyword.keyword}"

Article type: ${keyword.type}
Category: ${keyword.category}

Target audience: Indonesians aged 20-40 who want practical, actionable financial advice.
Search intent: Someone Googling "${keyword.keyword}" wants specific, detailed guidance — not vague tips.

Make it the most useful article on this topic for an Indonesian reader.`;

  console.log(`Generating article for: "${keyword.keyword}" (${keyword.category}/${keyword.type})`);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 8000,
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;

  if (!content || !content.startsWith('---')) {
    throw new Error('Generated content does not start with frontmatter. Output: ' + content?.slice(0, 200));
  }

  return content;
}

function saveArticle(content, keyword) {
  const titleMatch = content.match(/title:\s*"(.+?)"/);
  const title = titleMatch ? titleMatch[1] : keyword.keyword;
  const slug = slugify(title);
  const filePath = join(CONTENT_DIR, `${slug}.md`);

  if (existsSync(filePath)) {
    console.log(`File already exists: ${filePath}. Skipping.`);
    return null;
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
      const result = saveArticle(content, keyword);

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
