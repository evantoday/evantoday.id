import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'blog');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2], raw: match[1] };
}

async function generateBetterMeta(title, description, firstParagraph) {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    messages: [
      {
        role: 'system',
        content: `You are an SEO CTR optimization specialist. Your job is to rewrite article titles and meta descriptions to maximize click-through rate from Google search results.

Rules for titles:
- 50-60 characters max (STRICT — Google truncates at ~60)
- Include ONE power word (Proven, Essential, Complete, Honest, Smart, Real, Best, Top, Ultimate)
- Front-load the most important/clickable words
- Include a number if the article is a listicle
- Use brackets for context where natural: [2026], [Compared], [Guide]
- Keep the core keyword intact for SEO
- Do NOT use clickbait, ALL CAPS, or misleading claims

Rules for descriptions:
- 120-155 characters (STRICT)
- Start with a hook or bold claim — NOT "Learn how to" or "Discover"
- Include a specific number, amount, or timeframe when possible
- End with a micro CTA or open loop ("Here's how.", "#3 is key.", "The last tip saves the most.")
- Must accurately represent the article content

Output ONLY valid JSON: {"title": "...", "description": "..."}
No explanation, no markdown fences.`,
      },
      {
        role: 'user',
        content: `Rewrite this title and description for higher CTR:

Current title: "${title}"
Current description: "${description}"
Article preview: "${firstParagraph.slice(0, 300)}"`,
      },
    ],
    max_completion_tokens: 300,
    temperature: 0.7,
  });

  const text = response.choices[0].message.content.trim();
  try {
    return JSON.parse(text);
  } catch {
    console.error('  Failed to parse response:', text);
    return null;
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is required.');
    process.exit(1);
  }

  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} articles to refresh.\n`);

  let updated = 0;

  for (const file of files) {
    const filePath = join(CONTENT_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      console.log(`Skipping ${file} — could not parse frontmatter`);
      continue;
    }

    const { frontmatter, body, raw } = parsed;
    const firstParagraph = body.replace(/^#.*\n/gm, '').trim().split('\n\n')[0] || '';

    console.log(`[${updated + 1}/${files.length}] ${file}`);
    console.log(`  Old title: "${frontmatter.title}"`);
    console.log(`  Old desc:  "${frontmatter.description}"`);

    try {
      const result = await generateBetterMeta(frontmatter.title, frontmatter.description, firstParagraph);
      if (!result) continue;

      // Validate lengths
      if (result.title.length > 65) {
        console.log(`  Skipping — new title too long (${result.title.length} chars)`);
        continue;
      }
      if (result.description.length > 160) {
        console.log(`  Skipping — new description too long (${result.description.length} chars)`);
        continue;
      }

      // Replace in frontmatter
      let newRaw = raw;
      // Escape special regex chars in the old values
      const escTitle = frontmatter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escDesc = frontmatter.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      newRaw = newRaw.replace(new RegExp(`title:\\s*"${escTitle}"`), `title: "${result.title}"`);
      newRaw = newRaw.replace(new RegExp(`description:\\s*"${escDesc}"`), `description: "${result.description}"`);

      const newContent = `---\n${newRaw}\n---\n${body}`;
      writeFileSync(filePath, newContent, 'utf-8');

      console.log(`  New title: "${result.title}"`);
      console.log(`  New desc:  "${result.description}"`);
      updated++;

      // Rate limit
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
    console.log();
  }

  console.log(`\nDone: ${updated}/${files.length} articles refreshed.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
