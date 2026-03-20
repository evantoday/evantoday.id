// Ping Google and Bing to re-crawl the sitemap after new content is published
const SITEMAP_URL = 'https://evantoday.id/sitemap-index.xml';

const engines = [
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  { name: 'Bing', url: `https://www.bing.com/indexnow?url=${encodeURIComponent(SITEMAP_URL)}` },
];

async function ping() {
  for (const engine of engines) {
    try {
      const res = await fetch(engine.url);
      console.log(`${engine.name}: ${res.status} ${res.statusText}`);
    } catch (err) {
      console.error(`${engine.name}: Failed - ${err.message}`);
    }
  }
}

ping();
