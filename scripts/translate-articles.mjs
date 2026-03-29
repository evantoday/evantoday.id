// Batch translate existing English articles to Bahasa Indonesia
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'blog');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getArticleFiles() {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => join(CONTENT_DIR, f));
}

function isAlreadyIndonesian(content) {
  // Check if body (after frontmatter) is already in Indonesian
  const body = content.split('---').slice(2).join('---');
  const sample = body.slice(0, 500).toLowerCase();
  const idWords = ['saya', 'kamu', 'dengan', 'untuk', 'adalah', 'yang', 'dari', 'dalam', 'tidak', 'atau', 'juga', 'bisa', 'akan', 'sudah', 'belum', 'bagaimana', 'mengapa', 'karena'];
  const matches = idWords.filter((w) => sample.includes(` ${w} `)).length;
  return matches >= 4;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: '', body: content };
  return {
    frontmatter: match[1],
    body: content.slice(match[0].length).trim(),
  };
}

async function translateArticle(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  if (isAlreadyIndonesian(content)) {
    return false;
  }

  const { frontmatter, body } = extractFrontmatter(content);

  // Extract title and description from frontmatter for translation
  const titleMatch = frontmatter.match(/title:\s*"(.+?)"/);
  const descMatch = frontmatter.match(/description:\s*"(.+?)"/);
  const title = titleMatch ? titleMatch[1] : '';
  const description = descMatch ? descMatch[1] : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator and financial content writer. Translate the following personal finance article from English to Bahasa Indonesia.

Rules:
- Write naturally in Bahasa Indonesia, not a word-for-word translation
- Keep the conversational, first-person tone ("saya", "kamu")
- Convert dollar amounts to approximate Rupiah equivalents (e.g., $1,000 → Rp 15 juta, $100 → Rp 1,5 juta)
- Replace American-specific references with Indonesian equivalents:
  - 401(k) → DPLK/dana pensiun
  - Roth IRA → reksadana/investasi
  - FDIC → LPS
  - Social Security → BPJS
  - US banks (Ally, Marcus, Capital One) → Indonesian banks (BCA, Mandiri, Jago, Seabank)
  - US apps (Venmo, Cash App) → Indonesian apps (GoPay, OVO, Dana)
  - US insurance (Geico, State Farm) → Indonesian insurance (Prudential, Allianz, AXA Mandiri)
  - Credit score/FICO → BI Checking/SLIK OJK
  - IRS → Dirjen Pajak
- Keep markdown formatting (##, ###, **, -, tables, links)
- Keep all internal links (/blog/slug/) as-is — do NOT translate URLs
- Keep the same heading structure
- Meta description must stay under 155 characters in Indonesian
- Title should stay under 60 characters in Indonesian

Also translate the title and description to Indonesian.

Output format:
TITLE: [translated title]
DESCRIPTION: [translated description]
---
[translated article body in markdown]`,
      },
      {
        role: 'user',
        content: `Title: ${title}\nDescription: ${description}\n\nArticle body:\n${body}`,
      },
    ],
    max_completion_tokens: 8000,
    temperature: 0.5,
  });

  const result = response.choices[0].message.content;

  // Parse translated title, description, and body
  const titleLine = result.match(/TITLE:\s*(.+)/);
  const descLine = result.match(/DESCRIPTION:\s*(.+)/);
  const translatedBody = result.replace(/TITLE:.*\n?/, '').replace(/DESCRIPTION:.*\n?/, '').replace(/^---\n?/, '').trim();

  // Rebuild frontmatter with translated title/description
  let newFrontmatter = frontmatter;
  if (titleLine) {
    const newTitle = titleLine[1].trim().replace(/"/g, '\\"');
    newFrontmatter = newFrontmatter.replace(/title:\s*"(.+?)"/, `title: "${newTitle}"`);
  }
  if (descLine) {
    const newDesc = descLine[1].trim().replace(/"/g, '\\"').slice(0, 155);
    newFrontmatter = newFrontmatter.replace(/description:\s*"(.+?)"/, `description: "${newDesc}"`);
  }

  const newContent = `---\n${newFrontmatter}\n---\n\n${translatedBody}\n`;
  writeFileSync(filePath, newContent, 'utf-8');
  return true;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required.');
    process.exit(1);
  }

  const files = getArticleFiles();
  console.log(`Found ${files.length} articles. Checking which need translation...\n`);

  let translated = 0;
  let skipped = 0;
  const batchSize = parseInt(process.env.BATCH_SIZE || '10', 10);
  let processed = 0;

  for (const file of files) {
    const filename = file.split('/').pop();
    const content = readFileSync(file, 'utf-8');

    if (isAlreadyIndonesian(content)) {
      skipped++;
      continue;
    }

    processed++;
    if (processed > batchSize) {
      console.log(`\nBatch limit reached (${batchSize}). Run again to continue.`);
      break;
    }

    try {
      console.log(`[${translated + 1}] Translating: ${filename}`);
      const didTranslate = await translateArticle(file);
      if (didTranslate) {
        translated++;
        console.log(`  Done!`);
      }
      // Rate limit delay
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }
  }

  console.log(`\nFinished: ${translated} translated, ${skipped} already Indonesian.`);
  console.log(`Remaining: ${files.length - skipped - translated} articles still in English.`);
}

main().catch(console.error);
