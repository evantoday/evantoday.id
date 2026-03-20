// Submit ALL site URLs to IndexNow and Bing for maximum indexing speed
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://evantoday.id';
const INDEXNOW_KEY = 'e43a854d3fec3643227d7c80a965efc2';

async function getAllUrls() {
  // Fetch sitemap and extract all URLs
  const res = await fetch(`${SITE_URL}/sitemap-0.xml`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return urls;
}

async function submitToIndexNow(urls) {
  console.log(`\nSubmitting ${urls.length} URLs to IndexNow...`);

  // IndexNow accepts max 10,000 URLs per request
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
    console.log(`IndexNow: ${res.status} ${res.statusText}`);
    if (res.status === 200 || res.status === 202) {
      console.log('Submitted to Bing, Yandex, Seznam, Naver via IndexNow.');
    }
  } catch (err) {
    console.error(`IndexNow failed: ${err.message}`);
  }
}

async function submitToBingWebmaster(urls) {
  const apiKey = process.env.BING_API_KEY;
  if (!apiKey) {
    console.log('\nBing Webmaster: Skipped (no BING_API_KEY set)');
    return;
  }

  console.log(`\nSubmitting to Bing Webmaster API...`);
  try {
    const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteUrl: SITE_URL,
        urlList: urls.slice(0, 100), // Bing limit per request
      }),
    });
    console.log(`Bing Webmaster: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`Bing Webmaster failed: ${err.message}`);
  }
}

async function pingGoogle(urls) {
  console.log(`\nPinging Google for ${urls.length} URLs...`);
  let success = 0;
  // Google deprecated sitemap ping, but individual URL pings via
  // Search Console API would need OAuth. We'll rely on sitemap auto-discovery.
  console.log('Google: Relies on Search Console sitemap auto-discovery.');
  console.log('Make sure sitemap is submitted at: https://search.google.com/search-console');
}

async function main() {
  console.log('=== URL Submission Tool ===');
  console.log(`Site: ${SITE_URL}\n`);

  const urls = await getAllUrls();
  console.log(`Found ${urls.length} URLs in sitemap`);

  // Show URL breakdown
  const articles = urls.filter(u => u.includes('/blog/') && !u.includes('/page/'));
  const categories = urls.filter(u => u.includes('/category/'));
  const tags = urls.filter(u => u.includes('/tag/'));
  const pages = urls.filter(u => !u.includes('/blog/') && !u.includes('/category/') && !u.includes('/tag/'));

  console.log(`  Articles: ${articles.length}`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Tags: ${tags.length}`);
  console.log(`  Pages: ${pages.length}`);

  await submitToIndexNow(urls);
  await submitToBingWebmaster(articles);
  await pingGoogle(urls);

  console.log('\nDone!');
}

main().catch(console.error);
