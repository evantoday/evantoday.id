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

async function generateArticle(keyword) {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are an expert personal finance and fintech content writer. Write a comprehensive, SEO-optimized article in English targeting an Indonesian and Southeast Asian audience.

Requirements:
- Write a compelling, keyword-rich title (include the target keyword naturally)
- Meta description: under 155 characters, includes keyword
- Structure: use H2 and H3 headings, short paragraphs (2-3 sentences max)
- Include a "Frequently Asked Questions" section with 3-5 Q&As at the end
- Word count: 1800-2500 words
- Tone: authoritative yet approachable, like a knowledgeable friend
- Include specific examples relevant to Indonesia where applicable (mention local banks, apps, services by name)
- Use local currency (Rupiah/Rp) for any monetary examples
- Do NOT include any disclaimers in the article body
- Do NOT use emojis

Output format: Raw Markdown starting with YAML frontmatter block. Do NOT wrap in code fences.

The frontmatter MUST follow this exact format:
---
title: "Your Article Title Here"
description: "Meta description under 155 characters"
pubDate: ${today}
category: "${keyword.category}"
tags: ["tag1", "tag2", "tag3"]
author: "Evan Today"
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

  return candidates.slice(0, count);
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
