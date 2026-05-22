---
name: skill-targeted-audit
description: Audit a single skill or skill folder for quality, security, and compliance — generate a detailed report with fix strategies
tags: [audit, quality, lint]
version: 1.1.0
category: devops
author: Hermes Agent
created: 2026-05-20
---

# Skill Targeted Audit

## Overview

Scan a single skill directory or a folder of skills, run three quality gates, and generate a structured report with issue details and fix strategies.

**Three checks:**

1. **skillcheck** — SKILL.md agentskills.io spec validation (pip install skillcheck)
2. **markdownlint-cli2** — Markdown style consistency (npm install -g markdownlint-cli2)
3. **cisco-ai-skill-scanner** — Security scanning: command injection, reverse shell, credential leak, dangerous functions (pip install cisco-ai-skill-scanner)

## When to Use

- Before accepting a skill contribution
- During CI/CD pipeline gate
- Periodic repository health check
- Auditing a single skill before release

## Prerequisites

Tools are **auto-installed** on first run. If you prefer manual install:

```bash
pip install skillcheck cisco-ai-skill-scanner
npm install -g markdownlint-cli2
```

To skip auto-install, use `--no-install` flag.

## Usage

### Scan a single skill

```
Use skill-targeted-audit to scan /path/to/my-skill
```

### Scan a folder of skills

```
Use skill-targeted-audit to scan /path/to/skills-folder
```

The agent will:

1. Detect whether input is a single skill (contains SKILL.md) or a parent folder (contains subdirs with SKILL.md)
2. Run all three checks on each skill
3. Generate a report file in the **parent directory** of the scanned path

### Report location

| Input | Report saved to |
|-------|----------------|
| `/repo/skills/python-debugpy` | `/repo/skills/skill-gate-report-<timestamp>.txt` |
| `/repo/skills` | `/repo/skill-gate-report-<timestamp>.txt` |

## Report structure

```
========================================================================
  Skill Gate Audit Report
  Scan target: /path/to/target
  Skills scanned: N
  Generated: 2026-05-20 12:00:00 UTC
========================================================================

── 1. Scanned Skills ──
  ✔ python-debugpy
  ✔ spike
  ...

── 2. Issue Summary ──
  CRITICAL  3  command_injection (skill-scanner)
  ERROR    29  MD013 x17, MD036 x7, MD031 x1 (markdownlint)
  WARNING   2  metadata-budget (skillcheck)
  INFO     22  quality-score, compat (skillcheck)

── 3. Issue Details ──
  [CRITICAL] python-debugpy — command_injection
    L261  YARA_command_injection_generic
    Snippet: nc 127.0.0.1 4444
    ...

── 4. Fix Strategies ──
  [CRITICAL] command_injection
    Strategy: Move shell examples to scripts/ dir, reference by filename in SKILL.md
    ...

========================================================================
  Gate Verdict: 🚫 FAIL  |  Pass: ✅ 1  Fail: ❌ 2  Skip: ⏭️ 0
========================================================================
```

## Fix strategies reference

### skillcheck

| Rule | Fix |
|------|-----|
| description.quality-score low | Start description with action verb (Generates/Analyzes/Validates); add trigger context ("Use this skill whenever...") |
| disclosure.metadata-budget | Move non-essential frontmatter fields to body section |
| disclosure.body-bloat | Move large tables (>20 rows) to a referenced file under references/ |
| compat.unverified | Document field behavior for codex/cursor or remove unverified fields |

### markdownlint-cli2

| Rule | Fix |
|------|-----|
| MD013 line-length | Break long lines; or disable for code blocks in .markdownlint.json |
| MD036 no-emphasis-as-heading | Replace **text** pseudo-headings with ### text real headings |
| MD031 blanks-around-fences | Add blank lines before/after fenced code blocks |
| MD007 ul-indent | Fix list indentation to match configured indent (default 4) |
| MD024 no-duplicate-heading | Add distinguishing suffix or enable siblings_only |

### cisco-ai-skill-scanner

| Category | Fix |
|----------|-----|
| command_injection | Move dangerous commands to standalone scripts; reference script path in SKILL.md instead of inline code |
| reverse_shell | Remove or relocate reverse shell examples; if needed for docs, use <!-- skill-scanner:ignore --> annotation |
| credential_leak | Replace hardcoded secrets with env var references (${VAR}); add to .secrets.baseline if false positive |
| dangerous_function | Wrap eval()/exec() calls with input validation; consider safer alternatives |

## Configuration files

### skillcheck.toml

```toml
[frontmatter]
extension_fields = [
    "license",
    "platforms",
    "metadata",
    "prerequisites",
]
```

### .markdownlint.json

```json
{
  "default": true,
  "MD003": { "style": "atx" },
  "MD004": { "style": "dash" },
  "MD013": { "line_length": 200, "code_blocks": false, "tables": false },
  "MD024": { "siblings_only": true },
  "MD033": false,
  "MD034": false,
  "MD040": false,
  "MD041": false,
  "MD046": false
}
```

## CI/CD integration

```yaml
jobs:
  skill-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install skillcheck cisco-ai-skill-scanner
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g markdownlint-cli2
      - name: Run audit
        run: python3 scripts/skill_audit.py --target . --output-dir .
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: skill-gate-report
          path: skill-gate-report-*.txt
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| skillcheck not found | pip install skillcheck (requires Python >= 3.10) |
| skill-scanner not found | pip install cisco-ai-skill-scanner (CLI: skill-scanner) |
| markdownlint-cli2 not found | npm install -g markdownlint-cli2 |
| Large repo slow | Scan individual skills instead of entire repo |

## Related Skills

- github-code-review — Code review workflows
- requesting-code-review — Pre-commit verification
- systematic-debugging — Debug failing checks
