#!/usr/bin/env python3
"""
Add contextual internal links to blog posts.
For each post, find 3-5 related posts and insert natural links
into the body text where keywords already appear.
"""

import os
import re
import random

BLOG_DIR = "/home/eclipse/REPO-REMOTE/evantoday.id/src/content/blog"

# Build post metadata
posts = {}
for fname in os.listdir(BLOG_DIR):
    if not fname.endswith(".md") or fname == "images":
        continue
    slug = fname[:-3]
    fpath = os.path.join(BLOG_DIR, fname)
    with open(fpath, "r") as f:
        content = f.read()

    # Parse frontmatter
    title_m = re.search(r'^title:\s*"(.+?)"', content, re.MULTILINE)
    cat_m = re.search(r'^category:\s*"(.+?)"', content, re.MULTILINE)
    tags_m = re.search(r'^tags:\s*\[(.+?)\]', content, re.MULTILINE)

    title = title_m.group(1) if title_m else ""
    category = cat_m.group(1) if cat_m else ""
    tags = []
    if tags_m:
        tags = [t.strip().strip('"') for t in tags_m.group(1).split(",")]

    # Split frontmatter and body
    parts = content.split("---", 2)
    if len(parts) >= 3:
        frontmatter = parts[0] + "---" + parts[1] + "---"
        body = parts[2]
    else:
        frontmatter = ""
        body = content

    posts[slug] = {
        "title": title,
        "category": category,
        "tags": tags,
        "body": body,
        "frontmatter": frontmatter,
        "fpath": fpath,
        "full_content": content,
    }

# Define keyword -> slug mapping
# Each entry: (phrase_to_match, slug_to_link, anchor_text_override_or_None)
# We try to match these phrases in post bodies and link them
# Only link if the phrase appears in a different post than the target

keyword_links = [
    # === BUDGETING ===
    ("50/30/20 rule", "50-30-20-budget-rule-explained", None),
    ("50/30/20 budget", "50-30-20-budget-rule-explained", None),
    ("50-30-20 rule", "50-30-20-budget-rule-explained", "50/30/20 rule"),
    ("zero-based budget", "zero-based-budgeting-method-explained", None),
    ("zero based budget", "zero-based-budgeting-method-explained", "zero-based budget"),
    ("envelope budget", "the-envelope-budgeting-method-for-beginners", None),
    ("envelope method", "the-envelope-budgeting-method-for-beginners", None),
    ("cash envelope", "the-envelope-budgeting-method-for-beginners", None),
    ("how to budget", "how-to-budget-money", None),
    ("budgeting basics", "how-to-budget-money", None),
    ("monthly budget", "how-to-create-a-monthly-spending-plan", None),
    ("monthly spending plan", "how-to-create-a-monthly-spending-plan", None),
    ("spending plan", "how-to-create-a-monthly-spending-plan", None),

    # === SAVINGS ===
    ("emergency fund", "emergency-fund-guide", None),
    ("rainy day fund", "emergency-fund-guide", "emergency fund"),
    ("automatic savings", "10-automatic-savings-tips-and-tricks", None),
    ("automate your savings", "10-automatic-savings-tips-and-tricks", None),
    ("save $10,000", "how-to-save-10000-in-one-year", None),
    ("save $10000", "how-to-save-10000-in-one-year", "save $10,000"),
    ("high-yield savings", "best-high-yield-savings-accounts-2026", None),
    ("high yield savings", "best-high-yield-savings-accounts-2026", "high-yield savings"),
    ("save money on groceries", "how-to-save-money-on-groceries", None),
    ("grocery budget", "how-to-save-money-on-groceries", None),
    ("save on groceries", "how-to-save-money-on-groceries", None),
    ("reduce monthly expenses", "10-effective-ways-to-reduce-monthly-expenses", None),
    ("cut expenses", "10-effective-ways-to-reduce-monthly-expenses", None),
    ("lower your bills", "10-effective-ways-to-reduce-monthly-expenses", "reduce monthly expenses"),
    ("impulse buying", "10-effective-tips-to-avoid-impulse-buying", None),
    ("impulse purchases", "10-effective-tips-to-avoid-impulse-buying", "impulse buying"),
    ("impulse spending", "10-effective-tips-to-avoid-impulse-buying", None),
    ("saving challenges", "10-money-saving-challenges-that-actually-work", None),
    ("money saving challenge", "10-money-saving-challenges-that-actually-work", None),
    ("52-week challenge", "10-money-saving-challenges-that-actually-work", None),
    ("transportation costs", "10-effective-ways-to-save-money-on-transportation", None),
    ("save on transportation", "10-effective-ways-to-save-money-on-transportation", None),
    ("save money on a low income", "how-to-save-money-on-a-low-salary", None),
    ("save on a low salary", "how-to-save-money-on-a-low-salary", None),
    ("low income", "how-to-save-money-on-a-low-salary", None),
    ("frugal living", "frugal-living-tips", None),
    ("frugal lifestyle", "frugal-living-tips", "frugal living"),
    ("live frugally", "frugal-living-tips", "frugal living"),
    ("college students", "saving-money-tips-for-college-students", None),
    ("save for a wedding", "how-to-save-for-a-wedding", None),
    ("wedding budget", "how-to-save-for-a-wedding", None),
    ("how much should you spend on rent", "how-much-should-you-spend-on-rent", None),
    ("rent budget", "how-much-should-you-spend-on-rent", None),
    ("30% rule", "how-much-should-you-spend-on-rent", None),
    ("30 percent rule", "how-much-should-you-spend-on-rent", None),

    # === DEBT ===
    ("debt snowball", "debt-snowball-vs-debt-avalanche-method-explained-which-is-right-for-you", None),
    ("debt avalanche", "debt-snowball-vs-debt-avalanche-method-explained-which-is-right-for-you", None),
    ("pay off debt", "debt-free-journey-tips", None),
    ("debt-free", "debt-free-journey-tips", None),
    ("debt free", "debt-free-journey-tips", None),
    ("get out of debt", "debt-free-journey-tips", None),
    ("credit card debt", "7-proven-ways-to-pay-off-credit-card-debt-fast-indonesia", None),
    ("paycheck to paycheck", "how-to-stop-living-paycheck-to-paycheck", None),

    # === INVESTING ===
    ("index fund", "index-fund-investing-guide", None),
    ("index funds", "index-fund-investing-guide", None),
    ("passive investing", "index-fund-investing-guide", None),
    ("ETF investing", "etf-investing-explained", None),
    ("exchange-traded fund", "etf-investing-explained", None),
    ("ETFs", "etf-investing-explained", None),
    ("dividend stocks", "best-dividend-stocks-for-beginners", None),
    ("dividend investing", "best-dividend-stocks-for-beginners", None),
    ("dollar cost averaging", "dollar-cost-averaging-strategy-explained", None),
    ("dollar-cost averaging", "dollar-cost-averaging-strategy-explained", None),
    ("DCA", "dollar-cost-averaging-strategy-explained", None),
    ("stock charts", "how-to-read-stock-charts-for-beginners", None),
    ("technical analysis", "how-to-read-stock-charts-for-beginners", None),
    ("start investing", "how-much-money-do-you-need-to-start-investing", None),
    ("begin investing", "how-much-money-do-you-need-to-start-investing", "start investing"),
    ("how much to invest", "how-much-money-do-you-need-to-start-investing", None),
    ("Treasury bonds", "treasury-bonds-explained", None),
    ("I Bonds", "treasury-bonds-explained", None),
    ("government bonds", "treasury-bonds-explained", None),
    ("invest in gold", "how-to-invest-in-gold", None),
    ("gold investing", "how-to-invest-in-gold", None),
    ("gold ETF", "how-to-invest-in-gold", None),
    ("P2P lending", "how-p2p-lending-works", None),
    ("peer-to-peer lending", "how-p2p-lending-works", "P2P lending"),
    ("diversify your portfolio", "7-smart-ways-to-diversify-your-investment-portfolio", None),
    ("portfolio diversification", "7-smart-ways-to-diversify-your-investment-portfolio", None),
    ("diversification", "7-smart-ways-to-diversify-your-investment-portfolio", None),
    ("robo-advisor", "robo-advisor-indonesia-review-2026-guide", None),
    ("robo advisor", "robo-advisor-indonesia-review-2026-guide", None),
    ("value investing", "7-smart-value-investing-strategy-for-indonesian-stocks-2026-guide", None),

    # === RETIREMENT ===
    ("retirement planning", "how-to-financially-prepare-for-retirement", None),
    ("retire early", "achieving-financial-independence-and-early-retirement-fire-movement", None),
    ("FIRE movement", "achieving-financial-independence-and-early-retirement-fire-movement", None),
    ("financial independence", "achieving-financial-independence-and-early-retirement-fire-movement", None),
    ("early retirement", "achieving-financial-independence-and-early-retirement-fire-movement", None),
    ("401(k)", "how-to-financially-prepare-for-retirement", None),
    ("401k", "how-to-financially-prepare-for-retirement", None),
    ("IRA", "how-to-financially-prepare-for-retirement", None),
    ("Roth IRA", "how-to-financially-prepare-for-retirement", None),

    # === FINANCIAL PLANNING ===
    ("financial goals", "comprehensive-guide-to-setting-financial-goals-for-beginners", None),
    ("set financial goals", "comprehensive-guide-to-setting-financial-goals-for-beginners", "financial goals"),
    ("SMART goals", "comprehensive-guide-to-setting-financial-goals-for-beginners", None),
    ("net worth", "how-to-calculate-net-worth-and-why-it-matters", None),
    ("calculate net worth", "how-to-calculate-net-worth-and-why-it-matters", None),
    ("financial stress", "how-to-deal-with-financial-stress-and-anxiety", None),
    ("money anxiety", "how-to-deal-with-financial-stress-and-anxiety", None),
    ("financial mistakes", "financial-mistakes-to-avoid-in-your-20s", None),
    ("money mistakes", "financial-mistakes-to-avoid-in-your-20s", None),
    ("money habits", "smart-money-habits-of-wealthy-people", None),
    ("wealthy habits", "smart-money-habits-of-wealthy-people", None),
    ("tax refund", "how-to-spend-your-tax-refund-wisely", None),
    ("negotiate salary", "how-to-negotiate-salary", None),
    ("salary negotiation", "how-to-negotiate-salary", None),
    ("teach kids about money", "how-to-teach-kids-about-money", None),
    ("kids and money", "how-to-teach-kids-about-money", None),
    ("financial literacy", "how-to-teach-kids-about-money", None),
    ("newlyweds", "financial-planning-for-newlyweds", None),
    ("single mothers", "financial-planning-for-single-mothers", None),
    ("single mom", "financial-planning-for-single-mothers", None),
    ("manage money as a couple", "how-to-manage-money-as-a-couple", None),
    ("couple finances", "how-to-manage-money-as-a-couple", None),
    ("joint accounts", "how-to-manage-money-as-a-couple", None),
    ("cost of raising a child", "cost-of-raising-a-child-2026", None),
    ("raising a child", "cost-of-raising-a-child-2026", None),
    ("cost of living", "cost-of-living-comparison-nyc-vs-la-vs-austin", None),
    ("track expenses", "best-ways-to-track-expenses-comprehensive-guide", None),
    ("expense tracking", "best-ways-to-track-expenses-comprehensive-guide", None),
    ("track your spending", "best-ways-to-track-expenses-comprehensive-guide", None),
    ("budget apps", "best-ways-to-track-expenses-comprehensive-guide", None),
    ("job loss", "7-smart-ways-to-survive-a-job-loss", None),
    ("lost your job", "7-smart-ways-to-survive-a-job-loss", None),
    ("fresh graduates", "7-smart-money-management-tips-for-fresh-graduates-2026-guide", None),

    # === CRYPTO ===
    ("blockchain", "beginners-guide-to-blockchain-technology", None),
    ("blockchain technology", "beginners-guide-to-blockchain-technology", None),
    ("crypto wallet", "best-crypto-wallets-for-beginners", None),
    ("crypto wallets", "best-crypto-wallets-for-beginners", None),
    ("hardware wallet", "best-crypto-wallets-for-beginners", None),
    ("DeFi", "defi-explained-in-simple-terms-for-beginners", None),
    ("decentralized finance", "defi-explained-in-simple-terms-for-beginners", None),
    ("crypto staking", "what-is-staking-crypto-and-how-to-earn-passive-income", None),
    ("staking rewards", "what-is-staking-crypto-and-how-to-earn-passive-income", None),
    ("crypto tax", "crypto-tax-rules-explained", None),
    ("crypto taxes", "crypto-tax-rules-explained", None),
    ("Bitcoin halving", "bitcoin-halving-impact-on-price-7-things-to-expect", None),
    ("cryptocurrency risks", "risks-of-cryptocurrency-investing", None),
    ("crypto risks", "risks-of-cryptocurrency-investing", None),
    ("crypto scam", "risks-of-cryptocurrency-investing", None),
    ("Coinbase", "coinbase-review-fees-and-features-2026", None),

    # === INSURANCE ===
    ("life insurance", "do-you-need-life-insurance", None),
    ("term life", "term-life-vs-whole-life-insurance", None),
    ("whole life", "term-life-vs-whole-life-insurance", None),
    ("term life vs whole life", "term-life-vs-whole-life-insurance", None),
    ("car insurance", "car-insurance-comparison-2026", None),
    ("auto insurance", "car-insurance-comparison-2026", None),
    ("home insurance", "home-insurance-guide-and-comparison", None),
    ("homeowners insurance", "home-insurance-guide-and-comparison", None),
    ("motorcycle insurance", "motorcycle-insurance-guide", None),
    ("critical illness insurance", "critical-illness-insurance-do-you-need-it", None),
    ("insurance claim", "7-proven-steps-to-claim-insurance-2026-guide", None),
    ("insurance terms", "insurance-terms-explained-simply-2026-guide", None),

    # === FINTECH / BANKING ===
    ("open a bank account", "how-to-open-a-bank-account-online", None),
    ("bank account online", "how-to-open-a-bank-account-online", None),
    ("neobank", "best-neobanks-2026", None),
    ("neobanks", "best-neobanks-2026", None),
    ("Apple Pay", "how-to-use-apple-pay-and-google-pay", None),
    ("Google Pay", "how-to-use-apple-pay-and-google-pay", None),
    ("contactless payment", "best-contactless-payment-apps-2026", None),
    ("payment apps", "best-payment-apps-2026", None),
    ("money transfer", "best-money-transfer-apps-comprehensive-review", None),
    ("send money abroad", "best-money-transfer-apps-comprehensive-review", None),
    ("Wise vs Remitly", "wise-vs-remitly-for-sending-money", None),
    ("Cash App", "cash-app-review-features-and-how-to-use", None),
    ("Chime", "chime-review-features-and-fees", None),
    ("SoFi", "sofi-review-interest-rates-and-features", None),
    ("Ally Bank", "ally-bank-review-still-worth-it-in-2026", None),
    ("Robinhood", "robinhood-review-features-and-how-to-use", None),
    ("Fidelity", "fidelity-review-for-stock-and-fund-investing", None),
    ("fintech", "how-fintech-is-changing-banking", None),
    ("digital wallet", "7-smart-digital-wallet-security-tips-2026-guide", None),
    ("Affirm", "affirm-review-features-fees-and-safety", None),
    ("buy now pay later", "affirm-review-features-fees-and-safety", None),
    ("BNPL", "affirm-review-features-fees-and-safety", None),
    ("cashback apps", "7-best-cashback-apps-and-programs-indonesia-2026", None),

    # === INDONESIA SPECIFIC ===
    ("sukuk", "7-smart-ways-to-start-investing-in-sukuk-indonesia-guide", None),
    ("Ramadan", "7-smart-ways-to-budget-for-ramadan-and-lebaran", None),
    ("Lebaran", "7-smart-ways-to-budget-for-ramadan-and-lebaran", None),
    ("SID", "how-to-start-a-sid-for-investing-in-indonesia-2026-guide", None),
    ("Reku", "reku-crypto-exchange-review-indonesia-2026-guide", None),
    ("Flip app", "flip-app-review-7-things-i-d-check-first-2026", None),
]

def add_links_to_post(slug, post_data):
    """Add internal links to a single post's body content."""
    body = post_data["body"]
    links_added = 0
    linked_slugs = set()

    # Find which slugs are already linked in this post
    existing_links = re.findall(r'\(/blog/([^/)]+)/', body)
    for el in existing_links:
        linked_slugs.add(el)

    # Sort keyword_links by phrase length (longest first) to prefer more specific matches
    sorted_keywords = sorted(keyword_links, key=lambda x: len(x[0]), reverse=True)

    for phrase, target_slug, anchor_override in sorted_keywords:
        # Don't link to self
        if target_slug == slug:
            continue
        # Don't link to same slug twice
        if target_slug in linked_slugs:
            continue
        # Stop after 5 new links
        if links_added >= 5:
            break

        anchor = anchor_override or phrase
        link_md = f"[{anchor}](/blog/{target_slug}/)"

        # Find the phrase in the body (case-insensitive for first char flexibility)
        # But only in paragraph text, not in headings, links, or frontmatter
        # Use word boundary matching

        # Build a regex that matches the phrase but NOT inside existing links or headings
        # We'll look for the phrase not preceded by [ or ( and not followed by ]( or ](/
        escaped_phrase = re.escape(phrase)

        # Match the phrase as a whole word (with flexible boundaries)
        pattern = r'(?<!\[)(?<!\()' + escaped_phrase + r'(?!\]|\))'

        lines = body.split('\n')
        replaced = False
        new_lines = []

        for line in lines:
            if replaced or line.startswith('#') or line.startswith('|') or line.startswith('- **') or line.startswith('!['):
                new_lines.append(line)
                continue

            # Skip lines that are already links or have the phrase already linked
            if f'](/blog/{target_slug}/)' in line:
                new_lines.append(line)
                continue

            # Only match in paragraph text (not in markdown formatting)
            match = re.search(pattern, line, re.IGNORECASE)
            if match and not line.strip().startswith('#') and not line.strip().startswith('```'):
                # Check if the match is inside an existing markdown link
                start = match.start()
                # Look backwards for [ without closing ]
                before = line[:start]
                open_brackets = before.count('[') - before.count(']')
                if open_brackets > 0:
                    new_lines.append(line)
                    continue

                # Check if inside parentheses of a link
                open_parens_in_link = 0
                for i, ch in enumerate(before):
                    if ch == '(' and i > 0 and before[i-1] == ']':
                        open_parens_in_link += 1
                    elif ch == ')':
                        open_parens_in_link -= 1
                if open_parens_in_link > 0:
                    new_lines.append(line)
                    continue

                # Replace only the first occurrence
                matched_text = match.group(0)
                # Use the matched text case for anchor if no override
                if anchor_override:
                    replacement = f"[{anchor_override}](/blog/{target_slug}/)"
                else:
                    replacement = f"[{matched_text}](/blog/{target_slug}/)"

                new_line = line[:match.start()] + replacement + line[match.end():]
                new_lines.append(new_line)
                replaced = True
                links_added += 1
                linked_slugs.add(target_slug)
            else:
                new_lines.append(line)

        body = '\n'.join(new_lines)

    return body, links_added

# Process all posts
total_links = 0
posts_modified = 0

for slug, data in sorted(posts.items()):
    new_body, links_added = add_links_to_post(slug, data)

    if links_added > 0:
        # Write back the file
        new_content = data["frontmatter"] + new_body
        with open(data["fpath"], "w") as f:
            f.write(new_content)
        total_links += links_added
        posts_modified += 1
        print(f"{slug}: +{links_added} links")
    else:
        print(f"{slug}: no links added (already linked or no matches)")

print(f"\n=== SUMMARY ===")
print(f"Posts modified: {posts_modified}")
print(f"Total links added: {total_links}")
