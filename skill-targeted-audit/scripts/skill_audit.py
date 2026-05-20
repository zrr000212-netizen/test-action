#!/usr/bin/env python3
"""Skill Repository Quality Audit — skillcheck + markdownlint-cli2 + cisco-ai-skill-scanner"""

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── CLI ──

def parse_args():
    p = argparse.ArgumentParser(description="Skill gate audit")
    p.add_argument("--target", required=True, help="Single skill dir or parent folder of skills")
    p.add_argument("--output-dir", default=None, help="Report output dir (default: parent of target)")
    p.add_argument("--skillcheck", default="skillcheck", help="skillcheck binary path")
    p.add_argument("--markdownlint", default="markdownlint-cli2", help="markdownlint-cli2 binary path")
    p.add_argument("--skill-scanner", default="skill-scanner", help="skill-scanner binary path")
    p.add_argument("--node-bin", default="", help="Node bin dir for npx (e.g. /opt/nvm/versions/node/v18.20.8/bin)")
    p.add_argument("--no-install", action="store_true", help="Skip auto-install of missing tools")
    return p.parse_args()

# ── Auto-install ──

def which(name):
    return shutil.which(name)

def ensure_python_tool(name, import_name=None):
    """Ensure a Python CLI tool is available, install via pip if missing."""
    if which(name):
        return which(name)
    print(f"  ⚙️ {name} not found, installing via pip ...", end=" ", flush=True)
    out, rc = run_cmd([sys.executable, "-m", "pip", "install", name], timeout=120)
    path = which(name)
    if path and rc == 0:
        print(f"ok → {path}")
        return path
    print(f"FAILED (exit {rc})")
    return None

def ensure_node_tool(name, node_bin=""):
    """Ensure a Node CLI tool is available, install via npm -g if missing."""
    full = os.path.join(node_bin, name) if node_bin else name
    if which(full):
        return full
    npm = os.path.join(node_bin, "npm") if node_bin else "npm"
    if not which(npm):
        npm = "npm"
    print(f"  ⚙️ {name} not found, installing via npm -g ...", end=" ", flush=True)
    out, rc = run_cmd([npm, "install", "-g", name], timeout=120)
    path = which(full) or which(name)
    if path and rc == 0:
        print(f"ok → {path}")
        return path
    print(f"FAILED (exit {rc})")
    return None

def ensure_tools(args):
    """Auto-install missing tools. Returns (skillcheck_bin, markdownlint_bin, scanner_bin) or None on failure."""
    sc_bin = args.skillcheck
    ml_bin = args.markdownlint
    ss_bin = args.skill_scanner

    if not args.no_install:
        if not which(sc_bin):
            p = ensure_python_tool("skillcheck")
            if p:
                sc_bin = p

        if not which(ss_bin):
            p = ensure_python_tool("cisco-ai-skill-scanner")
            # cisco-ai-skill-scanner installs as 'skill-scanner'
            p2 = which("skill-scanner")
            if p2:
                ss_bin = p2
            elif p:
                ss_bin = p

        ml_full = os.path.join(args.node_bin, ml_bin) if args.node_bin else ml_bin
        if not which(ml_full):
            p = ensure_node_tool("markdownlint-cli2", args.node_bin)
            if p:
                ml_bin = p

    return sc_bin, ml_bin, ss_bin

# ── Discover skills ──

def discover_skills(target: Path):
    """Return list of skill dirs. If target itself has SKILL.md → [target], else find subdirs with SKILL.md."""
    if (target / "SKILL.md").exists():
        return [target]
    skills = sorted([d for d in target.iterdir() if d.is_dir() and (d / "SKILL.md").exists()])
    return skills

# ── Run checks ──

def run_cmd(cmd, timeout=60):
    """Run command with hard timeout via shell `timeout` to guarantee process kill."""
    # Wrap with shell timeout command for reliable process termination
    shell_cmd = f"timeout --signal=KILL {timeout} " + " ".join(shlex.quote(c) for c in cmd)
    try:
        r = subprocess.run(shell_cmd, shell=True, capture_output=True, text=True, timeout=timeout + 5)
        return r.stdout + r.stderr, r.returncode
    except FileNotFoundError:
        return f"ERROR: command not found: {cmd[0]}", 127
    except subprocess.TimeoutExpired:
        return "ERROR: timeout", 1

def run_skillcheck(target: Path, skillcheck_bin: str):
    """Run skillcheck on target, return parsed results."""
    config = target / "skillcheck.toml"
    cmd = [skillcheck_bin, str(target)]
    if config.exists():
        cmd += ["--config", str(config)]
    cmd += ["--format", "json"]
    out, rc = run_cmd(cmd)
    try:
        data = json.loads(out)
        return data
    except Exception:
        # fallback: run text format
        cmd2 = [skillcheck_bin, str(target)]
        if config.exists():
            cmd2 += ["--config", str(config)]
        out2, rc2 = run_cmd(cmd2)
        return {"raw_text": out2, "parse_error": True}

def run_markdownlint(target: Path, markdownlint_bin: str, node_bin: str):
    """Run markdownlint-cli2 on target, return raw output."""
    config = target / ".markdownlint.json"
    ml = os.path.join(node_bin, markdownlint_bin) if node_bin else markdownlint_bin
    # Use absolute glob so it only scans under target
    md_glob = str(target / "**" / "*.md")
    cmd = [ml, md_glob, "--config", str(config)] if config.exists() else [ml, md_glob]
    out, rc = run_cmd(cmd, timeout=60)
    return out, rc

def run_skill_scanner(skill_dir: Path, scanner_bin: str):
    """Run skill-scanner scan on a single skill dir, return parsed JSON."""
    cmd = [scanner_bin, "scan", str(skill_dir), "--format", "json"]
    out, rc = run_cmd(cmd, timeout=15)
    try:
        data = json.loads(out)
        return data
    except Exception:
        return {"raw_text": out, "parse_error": True}

# ── Parse markdownlint output ──

def parse_markdownlint(raw: str):
    """Parse markdownlint-cli2 text output into structured list."""
    issues = []
    # pattern: filepath:line:col MDxxx/rule-name Description
    pat = re.compile(r'^(.+?):(\d+):?(\d+)?\s+(MD\d+/\S+)\s+(.*)$', re.MULTILINE)
    for m in pat.finditer(raw):
        issues.append({
            "file": m.group(1),
            "line": int(m.group(2)),
            "col": int(m.group(3)) if m.group(3) else 0,
            "rule": m.group(4),
            "message": m.group(5).strip(),
        })
    return issues

# ── Fix strategies ──

FIX_STRATEGIES = {
    # skillcheck
    "description.quality-score": "Start description with action verb (Generates/Analyzes/Validates); add trigger context like 'Use this skill whenever...'",
    "disclosure.metadata-budget": "Move non-essential frontmatter fields to the body section to reduce token count below 100",
    "disclosure.body-bloat": "Move large tables (>20 rows) to a referenced file under references/ directory",
    "compat.unverified": "Document field behavior for codex/cursor or remove unverified fields from frontmatter",
    # markdownlint
    "MD013": "Break long lines; or disable for code blocks/tables in .markdownlint.json: MD013: {code_blocks: false, tables: false}",
    "MD036": "Replace **text** pseudo-headings with ### text real headings",
    "MD031": "Add blank lines before and after fenced code blocks",
    "MD007": "Fix list indentation to match configured indent (default 4 spaces)",
    "MD024": "Add distinguishing suffix to duplicate headings, or enable siblings_only in config",
    # skill-scanner
    "command_injection": "Move dangerous commands (nc, curl|sh, etc.) to standalone scripts under scripts/; reference script path in SKILL.md instead of inline code",
    "reverse_shell": "Remove or relocate reverse shell examples; if needed for documentation, add <!-- skill-scanner:ignore --> annotation",
    "credential_leak": "Replace hardcoded secrets with environment variable references (${VAR}); add to .secrets.baseline if false positive",
    "dangerous_function": "Wrap eval()/exec() calls with input validation; consider safer alternatives like ast.literal_eval()",
    "prompt_injection": "Review and sanitize user-controllable input before embedding in prompts; use structured input templates",
}

def get_fix_strategy(rule_or_category: str) -> str:
    # Try exact match first
    if rule_or_category in FIX_STRATEGIES:
        return FIX_STRATEGIES[rule_or_category]
    # Try prefix match (e.g. MD013/line-length → MD013)
    prefix = rule_or_category.split("/")[0].split("_")[0]
    for key in FIX_STRATEGIES:
        if key.lower() == prefix.lower():
            return FIX_STRATEGIES[key]
    return "Review the issue and apply best practices for this category"

# ── Build report ──

def build_report(target: Path, skills: list, sc_data, md_raw, md_rc, md_issues, scanner_results):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    L = []
    def a(s=""): L.append(s)

    a("=" * 72)
    a("  Skill Gate Audit Report")
    a(f"  Scan target: {target}")
    a(f"  Skills scanned: {len(skills)}")
    a(f"  Generated: {now}")
    a("=" * 72)
    a()

    # ── Section 1: Scanned Skills ──
    a("── 1. Scanned Skills ──")
    a()
    for s in skills:
        a(f"  ✔ {s.name}")
    a()

    # ── Collect all issues by severity ──
    critical_issues = []  # (skill_name, issue_dict)
    error_issues = []
    warning_issues = []
    info_issues = []

    # skillcheck issues (skip INFO)
    sc_pass = True
    if sc_data and not sc_data.get("parse_error"):
        for r in sc_data.get("results", []):
            skill_name = Path(r["path"]).parent.name if "/" in r["path"] else r["path"]
            for d in r.get("diagnostics", []):
                sev = d.get("severity", "info")
                if sev == "info":
                    continue  # skip INFO
                issue = {"skill": skill_name, "source": "skillcheck", "rule": d["rule"], "severity": sev, "message": d["message"]}
                if sev == "warning":
                    warning_issues.append(issue)
                else:
                    error_issues.append(issue)
        if sc_data.get("files_failed", 0) > 0:
            sc_pass = False

    # markdownlint issues
    md_pass = md_rc == 0
    for iss in md_issues:
        rule_prefix = iss["rule"].split("/")[0]
        issue = {"skill": iss["file"], "source": "markdownlint", "rule": iss["rule"], "severity": "error",
                 "message": iss["message"], "line": iss["line"], "rule_prefix": rule_prefix}
        error_issues.append(issue)

    # skill-scanner issues
    scanner_pass = True
    for sr in scanner_results:
        skill_name = sr.get("skill_name", "")
        if not sr.get("is_safe", True):
            scanner_pass = False
        for f in sr.get("findings", []):
            issue = {"skill": skill_name, "source": "skill-scanner", "rule": f.get("rule_id", ""),
                     "severity": f.get("severity", "CRITICAL").lower(), "category": f.get("category", ""),
                     "message": f.get("description", ""), "line": f.get("line_number", 0),
                     "snippet": f.get("snippet", ""), "remediation": f.get("remediation", "")}
            sev = issue["severity"]
            if sev == "info":
                continue  # skip INFO
            if sev == "critical":
                critical_issues.append(issue)
            elif sev == "high":
                error_issues.append(issue)
            elif sev == "medium":
                warning_issues.append(issue)
            else:
                info_issues.append(issue)

    # ── Section 2: Issue Summary ──
    a("── 2. Issue Summary ──")
    a()
    if critical_issues:
        cats = {}
        for i in critical_issues:
            c = i.get("category", i["rule"])
            cats[c] = cats.get(c, 0) + 1
        detail = ", ".join(f"{k} x{v}" for k, v in sorted(cats.items()))
        a(f"  CRITICAL  {len(critical_issues):>3}  {detail} (skill-scanner)")
    if error_issues:
        rules = {}
        for i in error_issues:
            r = i.get("rule_prefix", i["rule"])
            rules[r] = rules.get(r, 0) + 1
        detail = ", ".join(f"{k} x{v}" for k, v in sorted(rules.items()))
        src = set(i["source"] for i in error_issues)
        a(f"  ERROR    {len(error_issues):>3}  {detail} ({', '.join(src)})")
    if warning_issues:
        rules = {}
        for i in warning_issues:
            r = i["rule"]
            rules[r] = rules.get(r, 0) + 1
        detail = ", ".join(f"{k} x{v}" for k, v in sorted(rules.items()))
        a(f"  WARNING  {len(warning_issues):>3}  {detail} (skillcheck)")
    if info_issues:
        rules = {}
        for i in info_issues:
            r = i["rule"].split(".")[0] + "." + i["rule"].split(".")[1] if "." in i["rule"] else i["rule"]
            rules[r] = rules.get(r, 0) + 1
        detail = ", ".join(f"{k} x{v}" for k, v in sorted(rules.items()))
        a(f"  INFO     {len(info_issues):>3}  {detail} (skillcheck)")
    if not critical_issues and not error_issues and not warning_issues and not info_issues:
        a("  (no issues found)")
    a()

    # ── Section 3: Issue Details ──
    a("── 3. Issue Details ──")
    a()

    def detail_block(issues, label):
        if not issues:
            return
        for i in issues:
            a(f"  [{label}] {i['skill']} — {i.get('category', i['rule'])}")
            if i.get("line"):
                a(f"    L{i['line']}  {i['rule']}")
            else:
                a(f"    {i['rule']}")
            if i.get("snippet"):
                a(f"    Snippet: {i['snippet'][:120]}")
            if i.get("message"):
                a(f"    {i['message'][:150]}")
            a()

    detail_block(critical_issues, "CRITICAL")
    detail_block(error_issues, "ERROR")
    detail_block(warning_issues, "WARNING")
    detail_block(info_issues, "INFO")

    # ── Section 4: Fix Strategies ──
    a("── 4. Fix Strategies ──")
    a()

    seen_rules = set()
    all_issues = critical_issues + error_issues + warning_issues + info_issues
    for i in all_issues:
        rule_key = i.get("category") or i.get("rule_prefix") or i["rule"]
        if rule_key in seen_rules:
            continue
        seen_rules.add(rule_key)
        sev = i["severity"].upper() if i["severity"] != "error" else "ERROR"
        strategy = get_fix_strategy(rule_key)
        a(f"  [{sev}] {rule_key}")
        a(f"    Strategy: {strategy}")
        a()

    if not seen_rules:
        a("  (no issues to fix)")
        a()

    # ── Verdict ──
    a("=" * 72)
    pass_count = sum([1 for x in [sc_pass, md_pass, scanner_pass] if x])
    fail_count = 3 - pass_count
    if pass_count == 3:
        a("  Gate Verdict: 🎉 PASS  |  skillcheck ✅  markdownlint ✅  skill-scanner ✅")
    else:
        parts = []
        parts.append("skillcheck ✅" if sc_pass else "skillcheck ❌")
        parts.append("markdownlint ✅" if md_pass else "markdownlint ❌")
        parts.append("skill-scanner ✅" if scanner_pass else "skill-scanner ❌")
        a(f"  Gate Verdict: 🚫 FAIL  |  {'  '.join(parts)}")
    a("=" * 72)

    return "\n".join(L)

# ── Main ──

def main():
    args = parse_args()
    target = Path(args.target).resolve()
    if not target.exists():
        print(f"ERROR: target not found: {target}", file=sys.stderr)
        sys.exit(1)

    skills = discover_skills(target)
    if not skills:
        print(f"ERROR: no skills found under: {target}", file=sys.stderr)
        sys.exit(1)

    # Determine output dir: parent of target
    output_dir = Path(args.output_dir).resolve() if args.output_dir else target.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    # Auto-install missing tools
    sc_bin, ml_bin, ss_bin = ensure_tools(args)

    print(f"Scanning {len(skills)} skill(s) under {target} ...")
    print()

    # 1. skillcheck
    print("  ┌─ [1/3] skillcheck — SKILL.md 规范校验 ─────────────────────────")
    sc_data = run_skillcheck(target, sc_bin)
    if sc_data and not sc_data.get("parse_error"):
        for r in sc_data.get("results", []):
            name = Path(r["path"]).parent.name if "/" in r["path"] else r["path"]
            valid = r.get("valid", True)
            diags = r.get("diagnostics", [])
            warns = [d for d in diags if d.get("severity") == "warning"]
            infos = [d for d in diags if d.get("severity") == "info"]
            icon = "✔" if valid else "✘"
            extra = ""
            if warns:
                extra += f"  ⚠{len(warns)}warn"
            if infos:
                extra += f"  ℹ{len(infos)}info"
            print(f"  │  {icon} {name}{extra}")
    print("  └───────────────────────────────────────────────────────────────")
    print()

    # 2. markdownlint-cli2
    print("  ┌─ [2/3] markdownlint-cli2 — Markdown 格式检查 ──────────────────")
    md_raw, md_rc = run_markdownlint(target, ml_bin, args.node_bin)
    md_issues = parse_markdownlint(md_raw)
    # group by file
    from collections import Counter
    file_counts = Counter(i["file"] for i in md_issues)
    for f, cnt in sorted(file_counts.items()):
        short = f.replace(str(target) + "/", "").replace(str(target), ".")
        print(f"  │  ✘ {short}  ({cnt} issues)")
    if not md_issues:
        print(f"  │  ✔ 全部通过")
    print(f"  └───────────────────────────────────────────────────────────────")
    print(f"  共 {len(md_issues)} 个格式错误")
    print()

    # 3. skill-scanner (per skill)
    print("  ┌─ [3/3] skill-scanner — 安全扫描 ───────────────────────────────")
    scanner_results = []
    for s in skills:
        sr = run_skill_scanner(s, ss_bin)
        sr["skill_name"] = s.name
        scanner_results.append(sr)
        safe = sr.get("is_safe", True)
        findings = sr.get("findings_count", 0)
        if safe:
            print(f"  │  ✔ {s.name}  (安全)")
        else:
            sev = sr.get("max_severity", "UNKNOWN")
            print(f"  │  ✘ {s.name}  ({findings} findings, {sev})")
            for f in sr.get("findings", []):
                print(f"  │     L{f.get('line_number','?')} [{f.get('severity','')}] {f.get('category','')}: {f.get('snippet','')[:60]}")
    print("  └───────────────────────────────────────────────────────────────")
    print()

    # Build report
    report = build_report(target, skills, sc_data, md_raw, md_rc, md_issues, scanner_results)

    # Write report
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    report_path = output_dir / f"skill-gate-report-{ts}.txt"
    report_path.write_text(report, encoding="utf-8")

    print(f"\nReport saved: {report_path}")
    return report_path

if __name__ == "__main__":
    main()
