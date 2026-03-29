#!/usr/bin/env python3
"""
Add contextual internal links to blog posts - V2 with proper word boundary matching.
Only processes posts that currently have fewer than 3 internal links.
"""

import os
import re

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

    title = title_m.group(1) if title_m else ""
    category = cat_m.group(1) if cat_m else ""

    # Split frontmatter and body
    parts = content.split("---", 2)
    if len(parts) >= 3:
        frontmatter = parts[0] + "---" + parts[1] + "---"
        body = parts[2]
    else:
        frontmatter = ""
        body = content

    # Count existing links
    existing_count = len(re.findall(r'\]\(/blog/', content))
    existing_slugs = set(re.findall(r'\(/blog/([^/)]+)/', content))

    posts[slug] = {
        "title": title,
        "category": category,
        "body": body,
        "frontmatter": frontmatter,
        "fpath": fpath,
        "existing_count": existing_count,
        "existing_slugs": existing_slugs,
    }

# Keyword links: (phrase, slug, anchor_override, require_word_boundary)
# require_word_boundary=True means the phrase must be surrounded by word boundaries
# This prevents matching inside other words
keyword_links = [
    # === BUDGETING ===
    ("50/30/20 rule", "50-30-20-budget-rule-explained", None, False),
    ("50/30/20 budget", "50-30-20-budget-rule-explained", None, False),
    ("zero-based budget", "zero-based-budgeting-method-explained", None, False),
    ("envelope budget", "the-envelope-budgeting-method-for-beginners", None, False),
    ("envelope method", "the-envelope-budgeting-method-for-beginners", None, False),
    ("cash envelope", "the-envelope-budgeting-method-for-beginners", None, False),
    ("how to budget", "how-to-budget-money", None, False),
    ("monthly budget", "how-to-create-a-monthly-spending-plan", None, False),
    ("monthly spending plan", "how-to-create-a-monthly-spending-plan", None, False),
    ("spending plan", "how-to-create-a-monthly-spending-plan", None, False),

    # === SAVINGS ===
    ("emergency fund", "emergency-fund-guide", None, False),
    ("automatic savings", "10-automatic-savings-tips-and-tricks", None, False),
    ("automate your savings", "10-automatic-savings-tips-and-tricks", None, False),
    ("automate savings", "10-automatic-savings-tips-and-tricks", None, False),
    ("save $10,000", "how-to-save-10000-in-one-year", None, False),
    ("high-yield savings", "best-high-yield-savings-accounts-2026", None, False),
    ("high yield savings", "best-high-yield-savings-accounts-2026", "high-yield savings", False),
    ("save money on groceries", "how-to-save-money-on-groceries", None, False),
    ("grocery budget", "how-to-save-money-on-groceries", None, False),
    ("grocery costs", "how-to-save-money-on-groceries", None, False),
    ("grocery bill", "how-to-save-money-on-groceries", None, False),
    ("meal planning", "how-to-save-money-on-groceries", None, False),
    ("reduce monthly expenses", "10-effective-ways-to-reduce-monthly-expenses", None, False),
    ("cut expenses", "10-effective-ways-to-reduce-monthly-expenses", None, False),
    ("lower your bills", "10-effective-ways-to-reduce-monthly-expenses", "reduce expenses", False),
    ("reduce your bills", "10-effective-ways-to-reduce-monthly-expenses", None, False),
    ("cutting costs", "10-effective-ways-to-reduce-monthly-expenses", None, False),
    ("impulse buying", "10-effective-tips-to-avoid-impulse-buying", None, False),
    ("impulse purchases", "10-effective-tips-to-avoid-impulse-buying", None, False),
    ("impulse spending", "10-effective-tips-to-avoid-impulse-buying", None, False),
    ("saving challenges", "10-money-saving-challenges-that-actually-work", None, False),
    ("money saving challenge", "10-money-saving-challenges-that-actually-work", None, False),
    ("transportation costs", "10-effective-ways-to-save-money-on-transportation", None, False),
    ("save on transportation", "10-effective-ways-to-save-money-on-transportation", None, False),
    ("commute costs", "10-effective-ways-to-save-money-on-transportation", None, False),
    ("car expenses", "10-effective-ways-to-save-money-on-transportation", None, False),
    ("gas prices", "10-effective-ways-to-save-money-on-transportation", None, False),
    ("frugal living", "frugal-living-tips", None, False),
    ("college students", "saving-money-tips-for-college-students", None, False),
    ("student budget", "saving-money-tips-for-college-students", None, False),
    ("save for a wedding", "how-to-save-for-a-wedding", None, False),
    ("wedding budget", "how-to-save-for-a-wedding", None, False),
    ("wedding costs", "how-to-save-for-a-wedding", None, False),
    ("rent budget", "how-much-should-you-spend-on-rent", None, False),
    ("how much rent", "how-much-should-you-spend-on-rent", None, False),
    ("housing costs", "how-much-should-you-spend-on-rent", None, False),

    # === DEBT ===
    ("debt snowball", "debt-snowball-vs-debt-avalanche-method-explained-which-is-right-for-you", None, False),
    ("debt avalanche", "debt-snowball-vs-debt-avalanche-method-explained-which-is-right-for-you", None, False),
    ("pay off debt", "debt-free-journey-tips", None, False),
    ("debt-free", "debt-free-journey-tips", None, False),
    ("get out of debt", "debt-free-journey-tips", None, False),
    ("credit card debt", "7-proven-ways-to-pay-off-credit-card-debt-fast-indonesia", None, False),
    ("paycheck to paycheck", "how-to-stop-living-paycheck-to-paycheck", None, False),

    # === INVESTING ===
    ("index fund", "index-fund-investing-guide", None, True),
    ("index funds", "index-fund-investing-guide", None, True),
    ("passive investing", "index-fund-investing-guide", None, False),
    ("ETF investing", "etf-investing-explained", None, False),
    ("exchange-traded fund", "etf-investing-explained", None, False),
    ("ETFs", "etf-investing-explained", None, True),
    ("dividend stocks", "best-dividend-stocks-for-beginners", None, False),
    ("dividend investing", "best-dividend-stocks-for-beginners", None, False),
    ("dollar cost averaging", "dollar-cost-averaging-strategy-explained", None, False),
    ("dollar-cost averaging", "dollar-cost-averaging-strategy-explained", None, False),
    ("stock charts", "how-to-read-stock-charts-for-beginners", None, False),
    ("technical analysis", "how-to-read-stock-charts-for-beginners", None, False),
    ("candlestick", "how-to-read-stock-charts-for-beginners", None, False),
    ("start investing", "how-much-money-do-you-need-to-start-investing", None, False),
    ("begin investing", "how-much-money-do-you-need-to-start-investing", "start investing", False),
    ("Treasury bonds", "treasury-bonds-explained", None, False),
    ("I Bonds", "treasury-bonds-explained", None, True),
    ("government bonds", "treasury-bonds-explained", None, False),
    ("invest in gold", "how-to-invest-in-gold", None, False),
    ("gold investing", "how-to-invest-in-gold", None, False),
    ("gold ETF", "how-to-invest-in-gold", None, False),
    ("P2P lending", "how-p2p-lending-works", None, False),
    ("peer-to-peer lending", "how-p2p-lending-works", "P2P lending", False),
    ("diversify your portfolio", "7-smart-ways-to-diversify-your-investment-portfolio", None, False),
    ("portfolio diversification", "7-smart-ways-to-diversify-your-investment-portfolio", None, False),
    ("diversification", "7-smart-ways-to-diversify-your-investment-portfolio", None, True),
    ("value investing", "7-smart-value-investing-strategy-for-indonesian-stocks-2026-guide", None, False),

    # === RETIREMENT ===
    ("retirement planning", "how-to-financially-prepare-for-retirement", None, False),
    ("retirement savings", "how-to-financially-prepare-for-retirement", None, False),
    ("retire early", "achieving-financial-independence-and-early-retirement-fire-movement", None, False),
    ("FIRE movement", "achieving-financial-independence-and-early-retirement-fire-movement", None, False),
    ("financial independence", "achieving-financial-independence-and-early-retirement-fire-movement", None, False),
    ("early retirement", "achieving-financial-independence-and-early-retirement-fire-movement", None, False),
    ("401(k)", "how-to-financially-prepare-for-retirement", None, False),
    ("Roth IRA", "how-to-financially-prepare-for-retirement", None, False),

    # === FINANCIAL PLANNING ===
    ("financial goals", "comprehensive-guide-to-setting-financial-goals-for-beginners", None, False),
    ("SMART goals", "comprehensive-guide-to-setting-financial-goals-for-beginners", None, False),
    ("net worth", "how-to-calculate-net-worth-and-why-it-matters", None, False),
    ("financial stress", "how-to-deal-with-financial-stress-and-anxiety", None, False),
    ("money anxiety", "how-to-deal-with-financial-stress-and-anxiety", None, False),
    ("financial mistakes", "financial-mistakes-to-avoid-in-your-20s", None, False),
    ("money habits", "smart-money-habits-of-wealthy-people", None, False),
    ("tax refund", "how-to-spend-your-tax-refund-wisely", None, False),
    ("negotiate salary", "how-to-negotiate-salary", None, False),
    ("salary negotiation", "how-to-negotiate-salary", None, False),
    ("negotiate your salary", "how-to-negotiate-salary", "negotiate salary", False),
    ("ask for a raise", "how-to-negotiate-salary", None, False),
    ("teach kids about money", "how-to-teach-kids-about-money", None, False),
    ("newlyweds", "financial-planning-for-newlyweds", None, True),
    ("single mothers", "financial-planning-for-single-mothers", None, False),
    ("couple finances", "how-to-manage-money-as-a-couple", None, False),
    ("manage money as a couple", "how-to-manage-money-as-a-couple", None, False),
    ("cost of raising a child", "cost-of-raising-a-child-2026", None, False),
    ("cost of living", "cost-of-living-comparison-nyc-vs-la-vs-austin", None, False),
    ("track expenses", "best-ways-to-track-expenses-comprehensive-guide", None, False),
    ("expense tracking", "best-ways-to-track-expenses-comprehensive-guide", None, False),
    ("budget apps", "best-ways-to-track-expenses-comprehensive-guide", None, False),
    ("job loss", "7-smart-ways-to-survive-a-job-loss", None, True),
    ("lose your job", "7-smart-ways-to-survive-a-job-loss", None, False),
    ("fresh graduates", "7-smart-money-management-tips-for-fresh-graduates-2026-guide", None, False),

    # === CRYPTO ===
    ("blockchain technology", "beginners-guide-to-blockchain-technology", None, False),
    ("blockchain", "beginners-guide-to-blockchain-technology", None, True),
    ("crypto wallet", "best-crypto-wallets-for-beginners", None, False),
    ("crypto wallets", "best-crypto-wallets-for-beginners", None, False),
    ("hardware wallet", "best-crypto-wallets-for-beginners", None, False),
    ("DeFi", "defi-explained-in-simple-terms-for-beginners", None, True),
    ("decentralized finance", "defi-explained-in-simple-terms-for-beginners", None, False),
    ("crypto staking", "what-is-staking-crypto-and-how-to-earn-passive-income", None, False),
    ("staking rewards", "what-is-staking-crypto-and-how-to-earn-passive-income", None, False),
    ("crypto tax", "crypto-tax-rules-explained", None, False),
    ("crypto taxes", "crypto-tax-rules-explained", None, False),
    ("Bitcoin halving", "bitcoin-halving-impact-on-price-7-things-to-expect", None, False),
    ("cryptocurrency risks", "risks-of-cryptocurrency-investing", None, False),
    ("crypto risks", "risks-of-cryptocurrency-investing", None, False),
    ("Coinbase", "coinbase-review-fees-and-features-2026", None, True),

    # === INSURANCE ===
    ("life insurance", "do-you-need-life-insurance", None, False),
    ("term life insurance", "term-life-vs-whole-life-insurance", None, False),
    ("whole life insurance", "term-life-vs-whole-life-insurance", None, False),
    ("term life vs whole life", "term-life-vs-whole-life-insurance", None, False),
    ("car insurance", "car-insurance-comparison-2026", None, False),
    ("auto insurance", "car-insurance-comparison-2026", None, False),
    ("homeowners insurance", "home-insurance-guide-and-comparison", None, False),
    ("home insurance", "home-insurance-guide-and-comparison", None, False),
    ("property insurance", "home-insurance-guide-and-comparison", None, False),
    ("motorcycle insurance", "motorcycle-insurance-guide", None, False),
    ("critical illness insurance", "critical-illness-insurance-do-you-need-it", None, False),
    ("insurance claim", "7-proven-steps-to-claim-insurance-2026-guide", None, False),
    ("file a claim", "7-proven-steps-to-claim-insurance-2026-guide", None, False),
    ("insurance terms", "insurance-terms-explained-simply-2026-guide", None, False),
    ("deductible", "insurance-terms-explained-simply-2026-guide", None, True),
    ("premium", "insurance-terms-explained-simply-2026-guide", None, True),
    ("coverage types", "insurance-terms-explained-simply-2026-guide", None, False),

    # === FINTECH / BANKING ===
    ("open a bank account", "how-to-open-a-bank-account-online", None, False),
    ("bank account online", "how-to-open-a-bank-account-online", None, False),
    ("neobank", "best-neobanks-2026", None, True),
    ("neobanks", "best-neobanks-2026", None, True),
    ("Apple Pay", "how-to-use-apple-pay-and-google-pay", None, False),
    ("Google Pay", "how-to-use-apple-pay-and-google-pay", None, False),
    ("contactless payment", "best-contactless-payment-apps-2026", None, False),
    ("tap to pay", "best-contactless-payment-apps-2026", None, False),
    ("payment apps", "best-payment-apps-2026", None, False),
    ("Venmo", "best-payment-apps-2026", None, True),
    ("money transfer", "best-money-transfer-apps-comprehensive-review", None, False),
    ("send money abroad", "best-money-transfer-apps-comprehensive-review", None, False),
    ("international transfer", "best-money-transfer-apps-comprehensive-review", None, False),
    ("Wise vs Remitly", "wise-vs-remitly-for-sending-money", None, False),
    ("Cash App", "cash-app-review-features-and-how-to-use", None, False),
    ("Chime", "chime-review-features-and-fees", None, True),
    ("SoFi", "sofi-review-interest-rates-and-features", None, True),
    ("Ally Bank", "ally-bank-review-still-worth-it-in-2026", None, False),
    ("Robinhood", "robinhood-review-features-and-how-to-use", None, True),
    ("Fidelity", "fidelity-review-for-stock-and-fund-investing", None, True),
    ("fintech", "how-fintech-is-changing-banking", None, True),
    ("digital wallet", "7-smart-digital-wallet-security-tips-2026-guide", None, False),
    ("digital wallets", "7-smart-digital-wallet-security-tips-2026-guide", None, False),
    ("Affirm", "affirm-review-features-fees-and-safety", None, True),
    ("buy now pay later", "affirm-review-features-fees-and-safety", None, False),
    ("BNPL", "affirm-review-features-fees-and-safety", None, True),
    ("cashback apps", "7-best-cashback-apps-and-programs-indonesia-2026", None, False),
    ("cashback program", "7-best-cashback-apps-and-programs-indonesia-2026", None, False),

    # === INDONESIA SPECIFIC ===
    ("sukuk", "7-smart-ways-to-start-investing-in-sukuk-indonesia-guide", None, True),
    ("Ramadan", "7-smart-ways-to-budget-for-ramadan-and-lebaran", None, True),
    ("Lebaran", "7-smart-ways-to-budget-for-ramadan-and-lebaran", None, True),
]

def is_inside_link(line, pos):
    """Check if position is already inside a markdown link."""
    before = line[:pos]
    # Check if inside [text](url) - either in the text part or url part
    open_brackets = before.count('[') - before.count(']')
    if open_brackets > 0:
        return True
    # Check if inside parentheses of a markdown link
    for i in range(len(before) - 1, -1, -1):
        if before[i] == ')':
            break
        if before[i] == '(' and i > 0 and before[i-1] == ']':
            return True
    return False

def add_links_to_post(slug, post_data, target_total=5):
    """Add internal links to a single post's body content."""
    body = post_data["body"]
    linked_slugs = set(post_data["existing_slugs"])
    current_count = post_data["existing_count"]
    links_needed = target_total - current_count
    links_added = 0

    if links_needed <= 0:
        return body, 0

    # Sort by phrase length (longest first)
    sorted_keywords = sorted(keyword_links, key=lambda x: len(x[0]), reverse=True)

    for phrase, target_slug, anchor_override, use_word_boundary in sorted_keywords:
        if target_slug == slug:
            continue
        if target_slug in linked_slugs:
            continue
        if links_added >= links_needed:
            break

        anchor = anchor_override or phrase

        # Build regex pattern with proper word boundaries
        escaped_phrase = re.escape(phrase)
        if use_word_boundary:
            pattern = r'(?<![a-zA-Z])' + escaped_phrase + r'(?![a-zA-Z])'
        else:
            pattern = escaped_phrase

        lines = body.split('\n')
        replaced = False
        new_lines = []

        for line in lines:
            if replaced:
                new_lines.append(line)
                continue

            # Skip headings, table rows, images, list item headers, code blocks
            stripped = line.strip()
            if (stripped.startswith('#') or stripped.startswith('|') or
                stripped.startswith('![') or stripped.startswith('```') or
                stripped.startswith('- **') or stripped.startswith('> **')):
                new_lines.append(line)
                continue

            # Skip if this slug is already linked on this line
            if f'](/blog/{target_slug}/)' in line:
                new_lines.append(line)
                continue

            match = re.search(pattern, line, re.IGNORECASE if not phrase[0].isupper() else 0)
            if match and not is_inside_link(line, match.start()):
                matched_text = match.group(0)
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


# Process posts that need more links
total_links = 0
posts_modified = 0

for slug, data in sorted(posts.items()):
    if data["existing_count"] >= 3:
        continue  # Already has enough links

    new_body, links_added = add_links_to_post(slug, data, target_total=5)

    if links_added > 0:
        new_content = data["frontmatter"] + new_body
        with open(data["fpath"], "w") as f:
            f.write(new_content)
        total_links += links_added
        posts_modified += 1
        new_total = data["existing_count"] + links_added
        print(f"{slug}: +{links_added} links (now {new_total} total)")
    else:
        print(f"{slug}: no matches found ({data['existing_count']} existing)")

print(f"\n=== SUMMARY ===")
print(f"Posts modified: {posts_modified}")
print(f"Total new links added: {total_links}")
