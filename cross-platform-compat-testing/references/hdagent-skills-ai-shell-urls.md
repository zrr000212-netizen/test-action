# HDAgentSkills "前往AI Shell" URL Pattern

## URL Format

```
https://devstation.ulanqab.huawei.com/aishell?skills_url={encoded_gitcode_repo_url}&skills_name={skillId}
```

- Base: `https://devstation.ulanqab.huawei.com/aishell`
- `skills_url`: URL-encoded GitCode repository URL (e.g. `https%3A%2F%2Fgitcode.com%2Fdeveloper-skill%2Fdeveloper-skill.git`)
- `skills_name`: skill ID (e.g. `huawei-cloud-ecs-diagnosis-workflow`)
- Opens via `window.open(url, '_blank')` — **no `noopener` feature** (reverse tabnabbing risk)

## Repository Mapping (9 homepage skills)

| Skill ID | Owner | Repo |
|----------|-------|------|
| huawei-cloud-ecs-diagnosis-workflow | developer-skill | developer-skill |
| forum-publishing-skill | developer-skill | Operations-Skill |
| huaweicloud-ssh-deploy | developer-skill | developer-skill |
| huawei-cloud-ui | developer-skill | developer-skill |
| solution-designer-skill | developer-skill | DTSE-SKILL |
| skill-targeted-audit | developer-skill | general-skills |
| github-huaweicloud-monitoring | developer-skill | Operations-Skill |
| huaweicloud-video-creator-direct | developer-skill | Operations-Skill |
| gitcode-security-scanner | developer-skill | DTSE-SKILL |

## Test Results (2026-05-21)

- 9/9 PASS — All skills' "前往AI Shell" buttons correctly call window.open with valid URLs
- popup.url shows `chrome-error://chromewebdata/` in headless because `devstation.ulanqab.huawei.com` is internal/unreachable — this is NOT a bug
- Only `ctx.add_init_script()` can reliably intercept the URL; `page.evaluate()` replacement fails (Vue caches reference at module init)

## Verification Technique

```python
# MUST use add_init_script before any page loads
ctx.add_init_script("""
    (() => {
        const origOpen = window.open;
        window.__openLog = [];
        window.open = function(url, target, features) {
            window.__openLog.push({url, target, features, ts: Date.now()});
            return origOpen.call(this, url, target, features);
        };
    })();
""")

# After clicking button, read captured URL
open_log = page.evaluate("() => window.__openLog || []")
ai_shell_url = open_log[-1]["url"] if open_log else None
```
