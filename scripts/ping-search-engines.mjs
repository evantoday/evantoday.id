// Ping Bing to re-crawl the sitemap after new content is published
// Note: Google deprecated sitemap ping in 2023 — they auto-discover via Search Console
const SITEMAP_URL = 'https://evantoday.id/sitemap-index.xml';

async function ping() {
  // Bing sitemap submission
  try {
    const res = await fetch(`https://www.bing.com/webmaster/ping.aspx?siteMap=${encodeURIComponent(SITEMAP_URL)}`);
    console.log(`Bing sitemap ping: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`Bing ping failed: ${err.message}`);
  }
}

ping();
