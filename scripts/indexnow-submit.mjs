// Submit new article URLs to IndexNow for instant indexing on Bing, Yandex, etc.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLISHED_LOG_PATH = join(__dirname, 'published-log.json');
const SITE_URL = 'https://evantoday.id';
const INDEXNOW_KEY = 'e43a854d3fec3643227d7c80a965efc2';

async function submitToIndexNow() {
  const log = JSON.parse(readFileSync(PUBLISHED_LOG_PATH, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  // Get articles published today
  const todaysArticles = log.filter((entry) => entry.date === today);

  if (todaysArticles.length === 0) {
    console.log('No new articles today. Nothing to submit.');
    return;
  }

  const urls = todaysArticles.map((entry) => `${SITE_URL}/blog/${entry.slug}/`);

  console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);
  urls.forEach((u) => console.log(`  ${u}`));

  const payload = {
    host: 'evantoday.id',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow response: ${res.status} ${res.statusText}`);
    if (res.status === 200 || res.status === 202) {
      console.log('URLs submitted successfully! Bing, Yandex, and others will index them shortly.');
    }
  } catch (err) {
    console.error(`IndexNow submission failed: ${err.message}`);
  }
}

submitToIndexNow();
