"""
pytest conftest - 旅行记账系统 Playwright UI 自动化测试
"""
import time
import pytest
import requests

BASE_URL = "http://localhost:5173"
API_BASE = f"{BASE_URL}/api"


# ========== API 辅助函数 ==========

def api_post(url, data, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = requests.post(f"{API_BASE}{url}", json=data, headers=headers)
    return resp.json()


def api_get(url, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = requests.get(f"{API_BASE}{url}", headers=headers)
    return resp.json()


def api_put(url, data, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = requests.put(f"{API_BASE}{url}", json=data, headers=headers)
    return resp.json()


def api_delete(url, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    resp = requests.delete(f"{API_BASE}{url}", headers=headers)
    return resp.json()


def ensure_test_user():
    """确保测试用户存在并返回 token + userId + email"""
    unique_email = f"pytest_{int(time.time())}@test.com"
    resp = api_post("/auth/register", {
        "nickname": "Pytest测试",
        "email": unique_email,
        "password": "Pytest123",
    })
    assert resp["code"] == 200, f"注册失败: {resp['message']}"
    return resp["data"]["token"], resp["data"]["userId"], unique_email


def create_account_book(token, **overrides):
    data = {
        "name": overrides.get("name", f"测试旅行_{int(time.time())}"),
        "destination": overrides.get("destination", "东京"),
        "startDate": overrides.get("startDate", "2026-04-01"),
        "endDate": overrides.get("endDate", "2026-04-10"),
        "budget": overrides.get("budget", 10000),
        "remark": overrides.get("remark", "自动化测试账本"),
    }
    resp = api_post("/account-books", data, token)
    assert resp["code"] == 200, f"创建账本失败: {resp['message']}"
    return resp["data"]


def add_participant(token, book_id, name, remark=""):
    resp = api_post(f"/account-books/{book_id}/participants", {"name": name, "remark": remark}, token)
    assert resp["code"] == 200
    return resp["data"]


def set_exchange_rate(token, book_id, currency, rate):
    resp = api_post(f"/account-books/{book_id}/exchange-rates", {"currency": currency, "rate": rate}, token)
    assert resp["code"] == 200
    return resp["data"]


def create_transaction(token, book_id, **overrides):
    data = {
        "amount": overrides.get("amount", 100),
        "currency": overrides.get("currency", "CNY"),
        "category": overrides.get("category", "餐饮"),
        "subCategory": overrides.get("subCategory", "午餐"),
        "paymentMethod": overrides.get("paymentMethod", "cash"),
        "transactionTime": overrides.get("transactionTime", "2026-04-05 12:00:00"),
        "location": overrides.get("location", "东京站"),
        "remark": overrides.get("remark", "测试交易"),
        "type": overrides.get("type", "personal"),
        "payerId": overrides.get("payerId"),
        "participantIds": overrides.get("participantIds", []),
    }
    resp = api_post(f"/account-books/{book_id}/transactions", data, token)
    assert resp["code"] == 200, f"创建交易失败: {resp['message']}"
    return resp["data"]


def delete_account_book(token, book_id):
    api_delete(f"/account-books/{book_id}", token)


# ========== Fixtures ==========

@pytest.fixture(scope="session")
def browser_type_launch_args():
    """使用系统 Chrome 浏览器，headed 模式 + 慢速执行 + 最大化窗口"""
    return {
        "channel": "chrome",
        "headless": False,
        "slow_mo": 800,
        "args": ["--start-maximized"],
    }


@pytest.fixture(scope="session")
def browser_context_args():
    """iPhone SE 移动端视口 + 设备模拟（浏览器窗口全屏，页面按手机尺寸渲染）"""
    return {
        "viewport": {"width": 375, "height": 667},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    }


@pytest.fixture(scope="session")
def auth():
    """Session 级别的认证信息"""
    token, user_id, _ = ensure_test_user()
    return {"token": token, "userId": user_id}


@pytest.fixture
def logged_in_page(page, auth):
    """已登录的页面"""
    page.goto(f"{BASE_URL}/login")
    page.evaluate(
        """([token, userId]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('userId', String(userId));
        }""",
        [auth["token"], str(auth["userId"])],
    )
    return page


@pytest.fixture
def book(auth):
    """创建一个测试账本，测试结束后自动清理"""
    token = auth["token"]
    data = create_account_book(token, name=f"测试账本_{int(time.time())}")
    set_exchange_rate(token, data["id"], "CNY", 1)
    yield {"id": data["id"], "token": token}
    delete_account_book(token, data["id"])


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """失败时自动截图保存到 screenshots/ 目录"""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        page = item.funcargs.get("page") or item.funcargs.get("logged_in_page")
        if page:
            import os
            os.makedirs("screenshots", exist_ok=True)
            name = item.nodeid.replace("::", "_").replace("/", "_").replace("\\", "_")
            path = f"screenshots/{name}.png"
            page.screenshot(path=path)
            # Add screenshot to report extras for pytest-html
            if hasattr(report, "extras") is False:
                report.extras = []
            report.extras.append({
                "name": "Screenshot",
                "format_type": "image",
                "content": path,
                "mime_type": "image/png",
                "extension": "png"
            })


def pytest_itemcollected(item):
    """用 docstring 作为中文测试标题显示在终端和报告中"""
    doc = item.function.__doc__
    if doc:
        item._nodeid = f"{item.parent.nodeid}::{doc.strip()}"


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """测试结束后自动生成自定义 HTML 报告"""
    import os
    json_file = "report.json"
    if os.path.exists(json_file):
        try:
            from generate_report import generate_html
            with open(json_file, "r", encoding="utf-8") as f:
                import json
                data = json.load(f)
            html = generate_html(data)
            with open("report.html", "w", encoding="utf-8") as f:
                f.write(html)
            print(f"\n✅ 自定义测试报告已生成: report.html")
        except Exception as e:
            print(f"\n⚠️ 生成自定义报告失败: {e}")
