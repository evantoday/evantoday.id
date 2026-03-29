#!/usr/bin/env python3
"""Fix broken partial-word links caused by SID and DCA matching inside words."""

import os
import re

BLOG_DIR = "/home/eclipse/REPO-REMOTE/evantoday.id/src/content/blog"

# Patterns that indicate a broken link (partial word match)
# These are cases where "SID" matched inside words like "consider", "inside", "beside", etc.
# and "DCA" matched inside "childcare"

fixes = 0
files_fixed = 0

for fname in sorted(os.listdir(BLOG_DIR)):
    if not fname.endswith(".md"):
        continue
    fpath = os.path.join(BLOG_DIR, fname)
    with open(fpath, "r") as f:
        content = f.read()

    original = content

    # Fix broken SID links: word[sid](/blog/...) -> wordsid (restore original word)
    # Pattern: some_text[sid](/blog/how-to-start-a-sid-for-investing-in-indonesia-2026-guide/)rest_of_word
    # We need to reconstruct the original word
    content = re.sub(
        r'(\w)\[sid\]\(/blog/how-to-start-a-sid-for-investing-in-indonesia-2026-guide/\)',
        r'\1sid',
        content
    )
    content = re.sub(
        r'(\w)\[SID\]\(/blog/how-to-start-a-sid-for-investing-in-indonesia-2026-guide/\)',
        r'\1SID',
        content
    )

    # Fix broken DCA links: word[dca](/blog/dollar-cost-averaging-strategy-explained/)rest
    content = re.sub(
        r'(\w)\[dca\]\(/blog/dollar-cost-averaging-strategy-explained/\)',
        r'\1dca',
        content
    )
    content = re.sub(
        r'(\w)\[DCA\]\(/blog/dollar-cost-averaging-strategy-explained/\)',
        r'\1DCA',
        content
    )

    if content != original:
        with open(fpath, "w") as f:
            f.write(content)
        fix_count = original.count("[sid](/blog/how-to-start-a-sid") - content.count("[sid](/blog/how-to-start-a-sid")
        fix_count += original.count("[dca](/blog/dollar-cost") - content.count("[dca](/blog/dollar-cost")
        fixes += fix_count
        files_fixed += 1
        print(f"Fixed {fname}: {fix_count} broken links restored")

print(f"\nTotal fixes: {fixes} across {files_fixed} files")
