---
name: cross-platform-compat-testing
version: 1.0.0
description: "跨端兼容性测试 — 桌面端(Chrome/Firefox/IE)×多分辨率 + 移动端(iOS Safari/Android Chrome)×多设备仿真，含横向溢出/触摸目标/WCAG/viewport适配检查，Playwright自动化执行+证据采集+BUG记录"
metadata:
  hermes:
    tags: [compatibility, testing, browser, mobile, responsive, playwright, wcag, ios, android, viewport]
    related_skills: [qa-execution, qa-report, web-app-security-testing]
---

# 跨端兼容性测试 Skill

系统化跨端兼容性测试 — 桌面端多浏览器×多分辨率 + 移动端iOS/Android×多设备仿真。
覆盖横向溢出、viewport适配、触摸目标尺寸(WCAG)、文字可读性、元素重叠等兼容性核心指标。

## When to Use

- 用户要求"兼容性测试"、"浏览器兼容"、"移动端适配测试"、"响应式测试"
- 发布前验证多端多分辨率表现
- UI重构后回归兼容性
- 用户报告特定浏览器/设备下显示异常

## Workflow

### Step 1 — 确定测试矩阵

与用户确认或从spec.md读取：

**桌面端矩阵**:
| 维度 | 默认值 | 说明 |
|------|--------|------|
| 浏览器 | Chrome, Firefox | IE需手工(Playwright/Linux不支持) |
| 分辨率 | 1920×1080, 1366×768, 1280×768, 1536×864 | 必须覆盖边界值 |
| 大屏 | 2560×1440, 3000×2000 | 可选，覆盖2K/3K |

**移动端矩阵**:
| 维度 | 默认值 | 说明 |
|------|--------|------|
| iOS设备 | iPhone SE, iPhone 14, iPhone 14 Pro Max, iPad Pro 11 | 覆盖小屏/中屏/大屏/平板 |
| Android设备 | Galaxy S5, Pixel 7, Galaxy S24, Galaxy Tab S9 | 覆盖经典/主流/新款/平板 |
| 横竖屏 | 竖屏+横屏 | 每设备测双方向 |

**用例总数 = 桌面浏览器数×分辨率数 + iOS设备数 + Android设备数**

### Step 2 — 环境验证

执行任何测试前必须验证：

```
1. HTTP GET目标URL → 200 (否则阻断)
2. Playwright sync_api可用 (EulerOS必须用sync,async会EPIPE crash)
3. 所需浏览器已安装 (playwright install chromium/firefox)
4. 截图目录可写
5. 中文字体已安装 (否则截图方框: wqy-microhei-fonts && fc-cache -fv)
```

### Step 3 — 生成桌面端测试脚本

**脚本模板核心逻辑**:

```python
from playwright.sync_api import sync_playwright

RESOLUTIONS = [(2560,1440), (3000,2000), (1920,1080), (1366,768), (1280,768), (1536,864)]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)  # 或 p.firefox.launch()
    for w, h in RESOLUTIONS:
        context = browser.new_context(
            ignore_https_errors=True,
            viewport={"width": w, "height": h},
        )
        page = context.new_page()
        # goto + 检查 + 截图
```

**桌面端检查项**:

| 检查维度 | 判定标准 | 严重程度 |
|----------|----------|----------|
| page_title | 标题非空 | 致命 |
| nav_bar | 导航栏存在 | 严重 |
| skill_cards | 内容卡片数>0 | 严重 |
| body_content | body文本>50字符 | 致命 |
| horizontal_overflow | scrollWidth<=clientWidth | 严重 |
| element_overlap | 卡片间重叠数=0 | 一般 |
| text_readability | 字号<10px元素=0 | 轻微 |

### Step 4 — 生成移动端测试脚本

**使用Playwright设备描述符仿真**:

```python
from playwright.sync_api import sync_playwright

DEVICES = ["iPhone SE", "iPhone 14", "iPhone 14 Pro Max", "iPad Pro 11",
           "Galaxy S5", "Pixel 7", "Galaxy S24", "Galaxy Tab S9"]

with sync_playwright() as p:
    devices = p.devices
    browser = p.chromium.launch(headless=True)
    for device_name in DEVICES:
        device = devices[device_name]
        context = browser.new_context(**device, ignore_https_errors=True)
        page = context.new_page()
        # goto + 检查 + 截图
```

**移动端检查项(比桌面端更严格)**:

| 检查维度 | 判定标准 | 严重程度 | 移动端特殊说明 |
|----------|----------|----------|----------------|
| viewport_meta | meta viewport标签存在 | 严重 | 移动端必须 |
| horizontal_overflow | scrollWidth<=clientWidth | 严重 | 移动端最关键指标 |
| touch_target_size | 触摸目标>=44×44px | 一般 | WCAG 2.5.8标准 |
| text_readability | 字号>=12px | 轻微 | 移动端阈值12px(桌面10px) |
| mobile_menu | hamburger/抽屉菜单 | 一般 | 不强制,仅记录 |
| fixed_occlusion | fixed元素不遮挡主内容 | 严重 | 移动端常见问题 |
| element_overlap | 卡片间重叠=0 | 一般 | - |

### Step 5 — 执行与证据采集

**执行策略**:
- 桌面端: Chrome和Firefox可并行(两个browser实例)
- 移动端: iOS和Android可并行
- 每个测试: goto_retry(max_retry=3) → 检查 → 截图

**goto重试模式(远端CDN慢)**:
```python
def goto_retry(page, url, max_retry=3, wait_after=10000):
    for i in range(max_retry):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=120000)
            page.wait_for_timeout(wait_after)
            return True
        except:
            page.wait_for_timeout(5000)
    return False
```

**证据采集**:
- PASS: 1张截图(关键状态)
- FAIL: 1张截图 + 检查项明细
- 截图命名: `TC-{BROWSER}-{RESOLUTION}.png` 或 `TC-{OS}-{DEVICE}.png`
- 结果JSON: 每浏览器一份,含全部检查项值

### Step 6 — BUG记录与判定

**FAIL→BUG转化**:

| 检查项FAIL | 缺陷类型 | 严重程度 | 优先级 |
|-----------|----------|----------|--------|
| horizontal_overflow | 兼容 | 严重 | P0 |
| body_content(白屏) | 兼容 | 致命 | P0 |
| viewport_meta缺失 | 兼容 | 严重 | P1 |
| touch_target_size | 易用性 | 一般 | P1 |
| element_overlap | UI | 一般 | P1 |
| text_readability | UI | 轻微 | P2 |
| fixed_occlusion | 兼容 | 严重 | P1 |

**BUG描述必须写"预期vs实际"**, 不能只写"不正确"。

**全局性BUG判定**: 同一检查项在全部浏览器/设备均FAIL → 标记为全局性问题(非环境特异),提1个BUG而非N个。

### Step 7 — 报告生成(分步保存)

**报告结构**:
```
1. 测试矩阵(浏览器×分辨率/设备)
2. 检查项说明+判定标准
3. 环境验证结果
4. 桌面端执行结果明细
5. 移动端执行结果明细
6. 统计汇总
7. BUG清单
8. 兼容性结论+矩阵
9. 证据索引
```

**保存规则**:
- 必须分步patch追加保存, 禁止一次性write_file
- 每步保存后打印: `✅ StepN saved`
- 保存路径: `~/docs/<test-name>/` 或 `qa-report/<YYYYMMDD>/`

## Pitfalls

1. **EulerOS必须用sync_playwright** — async_api会EPIPE crash(errno-32),根因是Node.js v22+ pipe transport竞争条件
2. **必须ignore_https_errors=True** — 否则SSL阻拦API导致数据为空
3. **screenshot必须timeout=60000** — 默认30s在远端常超时(font loading等)
4. **避免full_page=True** — 字体加载可能阻塞全页截图
5. **远端环境用domcontentloaded+长等待** — wait_until="load"常超时
6. **IE浏览器需手工测试** — Playwright/Linux不支持IE,标注待手工
7. **移动端字号阈值12px** — 比桌面端10px更严格,移动屏幕DPI高
8. **WCAG触摸目标44×44px** — 这是移动端独有检查项,桌面端无此要求
9. **横屏设备用landscape后缀** — 如"iPhone 14 Pro Max landscape"
10. **iPad/平板横屏可能显示桌面布局** — 卡片数可能不同(8→9),需记录
11. **element_overlap可能含正常视觉重叠** — CSS阴影/hover效果也会检测为重叠,需人工复核
12. **全局性BUG只提1个** — 同一问题在全部环境FAIL不重复提BUG
13. **Firefox需单独安装** — `python3 -m playwright install firefox`
14. **无中文字体→截图方框** — 需先`yum install wqy-microhei-fonts && fc-cache -fv`
15. **window.open按钮验证必须用add_init_script** — Vue/React在模块初始化时缓存window.open引用，`page.evaluate()`替换太晚。唯一可靠方法：`ctx.add_init_script("()=>{const o=window.open;window.__openLog=[];window.open=function(u,t,f){window.__openLog.push({url:u,target:t});return o.call(this,u,t,f);}}")`，点击后读`page.evaluate("()=>window.__openLog")`获取真实URL。popup.url可能是chrome-error(目标不可达),不能作为判定依据

## Tools

| Tool | Use |
|------|-----|
| Playwright (sync_api) | 浏览器自动化+设备仿真+截图 |
| p.devices | Playwright内置设备描述符(70+iOS+34+Android) |
| curl/urllib | 环境可达性预检 |

## Integration with Other Skills

- **qa-execution**: 本skill专注兼容性,qa-execution专注功能用例执行
- **qa-report**: 兼容性测试结果可汇入综合测试报告
- **web-app-security-testing**: 安全测试+兼容性测试=发布前完整质量门禁

## Reference Files

- `references/hdagent-skills-ai-shell-urls.md` — HDAgentSkills "前往AI Shell" URL格式、仓库映射、验证技术(add_init_script)
