// Submit site to web directories and ping services for backlinks & discovery
const SITE_URL = 'https://evantoday.id';
const FEED_URL = 'https://evantoday.id/rss.xml';
const SITE_NAME = 'Evan Today';
const DESCRIPTION = 'Personal finance and fintech blog for Indonesia and Southeast Asia';

// Free ping/directory services that accept automated submissions
const pingServices = [
  // RSS/Blog ping services
  `http://rpc.pingomatic.com/`,
  `https://ping.blo.gs/`,
];

// Ping-o-Matic (pings Google Blog Search, Bing, Technorati, etc.)
async function pingPingomatic() {
  console.log('Pinging Ping-o-Matic (distributes to 10+ services)...');
  const xmlPayload = `<?xml version="1.0"?>
<methodCall>
  <methodName>weblogUpdates.ping</methodName>
  <params>
    <param><value>${SITE_NAME}</value></param>
    <param><value>${SITE_URL}</value></param>
  </params>
</methodCall>`;

  try {
    const res = await fetch('https://rpc.pingomatic.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: xmlPayload,
    });
    const text = await res.text();
    const success = text.includes('<boolean>0</boolean>');
    console.log(`  Ping-o-Matic: ${success ? 'OK' : 'Check response'}`);
  } catch (err) {
    console.log(`  Ping-o-Matic: ${err.message}`);
  }
}

// Ping blo.gs
async function pingBlogs() {
  console.log('Pinging blo.gs...');
  try {
    const res = await fetch(`https://ping.blo.gs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: `<?xml version="1.0"?>
<methodCall>
  <methodName>weblogUpdates.ping</methodName>
  <params>
    <param><value>${SITE_NAME}</value></param>
    <param><value>${SITE_URL}</value></param>
  </params>
</methodCall>`,
    });
    console.log(`  blo.gs: ${res.status}`);
  } catch (err) {
    console.log(`  blo.gs: ${err.message}`);
  }
}

// Submit RSS feed to feed aggregators
async function submitFeeds() {
  console.log('\nSubmitting RSS feed...');

  const feedServices = [
    `https://feedburner.google.com/fb/a/pingSubmit?bloglink=${encodeURIComponent(SITE_URL)}&blogTitle=${encodeURIComponent(SITE_NAME)}`,
  ];

  for (const url of feedServices) {
    try {
      const res = await fetch(url);
      console.log(`  Feed submit: ${res.status}`);
    } catch (err) {
      console.log(`  Feed submit: ${err.message}`);
    }
  }
}

async function main() {
  console.log('=== Directory & Ping Submission ===');
  console.log(`Site: ${SITE_URL}`);
  console.log(`RSS: ${FEED_URL}\n`);

  await pingPingomatic();
  await pingBlogs();
  await submitFeeds();

  console.log('\n=== Manual Submissions (Do These Yourself) ===');
  console.log('These bring the most traffic but need manual signup:\n');
  console.log('1. Google Search Console (MOST IMPORTANT)');
  console.log('   https://search.google.com/search-console');
  console.log('   > Add property > evantoday.id > Submit sitemap\n');
  console.log('2. Bing Webmaster Tools');
  console.log('   https://www.bing.com/webmasters');
  console.log('   > Add site > import from Google Search Console\n');
  console.log('3. Pinterest (big traffic for finance content)');
  console.log('   > Create business account > Claim website > Create pins for articles\n');
  console.log('4. Reddit');
  console.log('   > r/indonesiapersonalfinance, r/finansial, r/indonesia');
  console.log('   > Share genuinely helpful articles (don\'t spam)\n');
  console.log('5. Quora');
  console.log('   > Answer Indonesian finance questions');
  console.log('   > Link to your articles as sources\n');
  console.log('6. Facebook Groups');
  console.log('   > "Belajar Investasi", "Komunitas Finansial Indonesia"');
  console.log('   > Share articles that answer common questions\n');
  console.log('7. Twitter/X');
  console.log('   > Create @evantoday account');
  console.log('   > Tweet each new article with key takeaways\n');
  console.log('8. Medium');
  console.log('   > Republish articles with canonical link back to evantoday.id');
  console.log('   > Free exposure to Medium\'s audience\n');
}

main().catch(console.error);
