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

function getRandomPastDate() {
  // Spread articles across the last 1-14 days to look natural
  const daysAgo = Math.floor(Math.random() * 14) + 1;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

async function generateArticle(keyword) {
  const pubDate = getRandomPastDate();
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

  const systemPrompt = `You are Evan, a personal finance writer from Indonesia. You run a blog called Evan Today where you share practical money advice for people in Indonesia and Southeast Asia.

Write in FIRST PERSON. You are a real person sharing your knowledge and experience. Use "I", "I've found", "in my experience", "what I recommend" etc. Sound like a real human blogger, NOT a corporate content mill.

Your writing style:
- Conversational but knowledgeable — like explaining to a friend over kopi
- Use occasional personal anecdotes or opinions ("I personally use...", "When I first tried...")
- Be specific with Indonesian examples (real app names, real banks, Rupiah amounts)
- Have opinions — don't be afraid to say "I think X is better than Y because..."
- Vary sentence length. Mix short punchy sentences with longer explanations.
- Use contractions (don't, it's, you'll, I've)
- Occasionally address the reader directly ("you might be wondering...", "here's what I'd suggest...")

Article requirements:
- Compelling title with the target keyword
- Meta description: under 155 characters
- Use H2 and H3 headings
- Short paragraphs (2-3 sentences)
- Include a "Frequently Asked Questions" section with 3-5 Q&As at the end
- Word count: 1800-2500 words
- Include specific Indonesian examples (local banks, fintech apps, real Rupiah figures)
- Do NOT include disclaimers in the body
- Do NOT use emojis
- Do NOT start the article with "In today's..." or "In this article..." — just dive into the topic${internalLinkInstruction}

Output format: Raw Markdown starting with YAML frontmatter block. Do NOT wrap in code fences.

The frontmatter MUST follow this exact format:
---
title: "Your Article Title Here"
description: "Meta description under 155 characters"
pubDate: ${pubDate}
category: "${keyword.category}"
tags: ["tag1", "tag2", "tag3"]
author: "Evan"
---

After the frontmatter, write the full article in Markdown with H2 (##) and H3 (###) headings.`;

  const userPrompt = `Write an article about: "${keyword.keyword}"

Article type: ${keyword.type}
Category: ${keyword.category}

Make it comprehensive, practical, and useful for someone in Indonesia seeking this information.`;

  console.log(`Generating article for: "${keyword.keyword}" (${keyword.category}/${keyword.type})`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
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
