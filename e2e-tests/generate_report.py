"""
自定义测试报告生成器 - 旅行记账系统 UI 自动化测试
运行方式: python generate_report.py [pytest-json-report.json]
"""
import json
import sys
import os
from datetime import datetime


def generate_html(data):
    tests = data.get("tests", [])
    summary = data.get("summary", {})
    duration = data.get("duration", 0)
    created = data.get("created", datetime.now().timestamp())

    total = summary.get("total", 0)
    passed = summary.get("passed", 0)
    failed = summary.get("failed", 0)
    error = summary.get("error", 0)
    skipped = summary.get("skipped", 0)

    pass_rate = f"{(passed / total * 100):.1f}" if total > 0 else "0"

    # Group tests by module
    modules = {}
    for t in tests:
        nodeid = t.get("nodeid", "")
        parts = nodeid.split("::")
        module = parts[0].replace("e2e-tests/", "").replace("e2e-tests\\", "") if parts else "unknown"
        if module not in modules:
            modules[module] = []
        # Use docstring as display name
        doc = t.get("doc", "") or ""
        name = doc.strip() if doc.strip() else parts[-1] if parts else nodeid
        outcome = t.get("outcome", "unknown")
        dur = t.get("call", {}).get("duration", 0) if isinstance(t.get("call"), dict) else 0
        longrepr = ""
        screenshot = ""
        if outcome == "failed":
            call = t.get("call", {})
            if isinstance(call, dict):
                longrepr = call.get("longrepr", "")
            # Try to find screenshot from pytest-html extras
            extras = t.get("extras", [])
            for extra in extras:
                if extra.get("format_type") == "image":
                    screenshot = extra.get("content", "")
            # If no screenshot in extras, try to find from screenshots directory
            if not screenshot:
                import os
                test_name = nodeid.replace("::", "_").replace("/", "_").replace("\\", "_")
                screenshot_path = f"screenshots/{test_name}.png"
                if os.path.exists(screenshot_path):
                    screenshot = screenshot_path
        modules[module].append({"name": name, "outcome": outcome, "duration": dur, "longrepr": longrepr, "nodeid": nodeid, "screenshot": screenshot})

    # Build module rows
    module_html = ""
    for mod, mod_tests in modules.items():
        mod_passed = sum(1 for t in mod_tests if t["outcome"] == "passed")
        mod_failed = sum(1 for t in mod_tests if t["outcome"] == "failed")
        mod_total = len(mod_tests)
        mod_icon = "✅" if mod_failed == 0 else "❌"

        rows = ""
        for t in mod_tests:
            icon = {"passed": "✅", "failed": "❌", "skipped": "⚠️", "error": "❌"}.get(t["outcome"], "❌")
            cls = t["outcome"]
            dur_str = f'{t["duration"]:.2f}s' if t["duration"] > 0 else "-"
            fail_detail = ""
            screenshot_html = ""
            if t["longrepr"]:
                safe = str(t["longrepr"]).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                fail_detail = f'<div class="fail-detail"><pre>{safe}</pre></div>'
            if t["screenshot"]:
                screenshot_html = f'<div class="screenshot"><img src="{t["screenshot"]}" alt="Screenshot" /></div>'
            rows += f'''<tr class="test-row {cls}">
                <td class="icon">{icon}</td>
                <td class="name">{t["name"]}</td>
                <td class="duration">{dur_str}</td>
                <td class="status status-{cls}">{t["outcome"].upper()}</td>
            </tr>
            {f'<tr class="detail-row"><td colspan="4">{fail_detail}{screenshot_html}</td></tr>' if fail_detail or screenshot_html else ''}'''

        module_html += f'''
        <div class="module">
            <div class="module-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <span class="module-icon">{mod_icon}</span>
                <span class="module-name">{mod}</span>
                <span class="module-stats">{mod_passed}/{mod_total} 通过</span>
                <span class="toggle-icon">▼</span>
            </div>
            <table class="test-table">
                <tbody>{rows}</tbody>
            </table>
        </div>'''

    run_time = datetime.fromtimestamp(created).strftime("%Y-%m-%d %H:%M:%S")

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>旅行记账系统 - UI自动化测试报告</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; color: #333; }}
.header {{ background: linear-gradient(135deg, #C8E64E 0%, #A8C43A 100%); color: white; padding: 32px 24px; }}
.header h1 {{ font-size: 22px; font-weight: 600; margin-bottom: 4px; }}
.header p {{ font-size: 13px; opacity: 0.85; }}
.summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 24px; margin-top: -24px; }}
.summary-card {{ background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
.summary-card .number {{ font-size: 28px; font-weight: 700; }}
.summary-card .label {{ font-size: 12px; color: #999; margin-top: 4px; }}
.summary-card.passed .number {{ color: #52c41a; }}
.summary-card.failed .number {{ color: #ff4d4f; }}
.summary-card.total .number {{ color: #1890ff; }}
.summary-card.rate .number {{ color: #faad14; }}
.info-bar {{ display: flex; justify-content: space-between; padding: 12px 24px; font-size: 12px; color: #999; }}
.content {{ padding: 0 16px 24px; }}
.module {{ background: white; border-radius: 12px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }}
.module-header {{ display: flex; align-items: center; gap: 8px; padding: 14px 16px; cursor: pointer; user-select: none; border-bottom: 1px solid #f5f5f5; }}
.module-header:hover {{ background: #fafafa; }}
.module-icon {{ font-size: 16px; }}
.module-name {{ flex: 1; font-size: 14px; font-weight: 500; }}
.module-stats {{ font-size: 12px; color: #999; }}
.toggle-icon {{ font-size: 10px; color: #ccc; transition: transform 0.2s; }}
.module.collapsed .toggle-icon {{ transform: rotate(-90deg); }}
.module.collapsed .test-table {{ display: none; }}
.test-table {{ width: 100%; border-collapse: collapse; }}
.test-row td {{ padding: 10px 16px; border-bottom: 1px solid #f8f8f8; font-size: 13px; }}
.test-row .icon {{ width: 30px; text-align: center; }}
.test-row .name {{ color: #333; }}
.test-row .duration {{ width: 60px; text-align: right; color: #bbb; font-size: 12px; }}
.test-row .status {{ width: 70px; text-align: center; font-size: 11px; font-weight: 600; border-radius: 4px; }}
.status-passed {{ color: #52c41a; }}
.status-failed {{ color: #ff4d4f; }}
.status-skipped {{ color: #faad14; }}
.test-row.failed {{ background: #fff2f0; }}
.fail-detail {{ padding: 8px 16px 12px; }}
.fail-detail pre {{ font-size: 11px; color: #ff4d4f; background: #fff8f6; padding: 12px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }}
.screenshot {{ padding: 8px 16px 12px; text-align: center; }}
.screenshot img {{ max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #ddd; }}
.detail-row td {{ padding: 0 !important; border: none !important; }}
</style>
</head>
<body>
<div class="header">
    <h1>🚀 旅行记账系统 - UI自动化测试报告</h1>
    <p>Python Playwright E2E Tests</p>
</div>
<div class="summary">
    <div class="summary-card total"><div class="number">{total}</div><div class="label">总用例</div></div>
    <div class="summary-card passed"><div class="number">{passed}</div><div class="label">通过</div></div>
    <div class="summary-card failed"><div class="number">{failed + error}</div><div class="label">失败</div></div>
    <div class="summary-card rate"><div class="number">{pass_rate}%</div><div class="label">通过率</div></div>
</div>
<div class="info-bar">
    <span>⏱️ 耗时 {duration:.1f}s</span>
    <span>📅 {run_time}</span>
</div>
<div class="content">
{module_html}
</div>
</body>
</html>'''


if __name__ == "__main__":
    json_file = sys.argv[1] if len(sys.argv) > 1 else "report.json"
    if not os.path.exists(json_file):
        print(f"找不到 {json_file}，请先运行测试生成 JSON 报告")
        sys.exit(1)
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    html = generate_html(data)
    out = "report.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ 报告已生成 {out}")
