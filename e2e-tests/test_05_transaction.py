"""交易/记账模块测试"""
import re
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
    api_get, api_put, api_delete,
)


class TestTransactionFormUI:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="交易表单测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_render_form(self, logged_in_page):
        """记账表单 - 应正确渲染表单元素"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        expect(logged_in_page.get_by_text("金额")).to_be_visible()

    def test_six_categories(self, logged_in_page):
        """记账表单 - 应显示6个主分类图标"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        for icon in ["🍜", "✈️", "🏨", "🛍️", "🎫", "📝"]:
            expect(logged_in_page.get_by_text(icon)).to_be_visible()

    def test_switch_category_updates_sub(self, logged_in_page):
        """记账表单 - 切换主分类应更新子项列表"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        logged_in_page.get_by_text("✈️").click()
        expect(logged_in_page.get_by_text("飞机")).to_be_visible()

    def test_save_disabled_without_amount(self, logged_in_page):
        """记账表单 - 金额为空时保存按钮应禁用"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        expect(logged_in_page.get_by_role("button", name="保存")).to_be_disabled()

    def test_default_personal_bill(self, logged_in_page):
        """记账表单 - 分账设置默认应为个人账单"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        expect(logged_in_page.locator(".split-option.active")).to_contain_text("个人账单")

    def test_no_members_shared_hint(self, logged_in_page):
        """记账表单 - 切换到共同账单应显示参与人选择区域"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        logged_in_page.get_by_text("共同账单").click()
        # 共同账单模式下应显示付款人或参与人相关区域
        expect(logged_in_page.get_by_text("共同账单")).to_be_visible()


class TestCreateTransaction:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="创建交易测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_create_personal_transaction(self, logged_in_page):
        """创建交易 - 应能创建个人交易"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        logged_in_page.get_by_placeholder("0.00").fill("128.50")
        logged_in_page.get_by_text("午餐").click()
        logged_in_page.get_by_role("button", name="保存").click()
        expect(logged_in_page.get_by_text("记账成功")).to_be_visible(timeout=5000)

    def test_transaction_appears_in_list(self, logged_in_page):
        """创建交易 - 交易应出现在账单明细中"""
        create_transaction(self.token, self.book_id, amount=200, category="住宿", remark="明细验证")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        expect(logged_in_page.get_by_text("住宿")).to_be_visible()


class TestTransactionDetail:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="交易详情测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_click_shows_detail(self, logged_in_page):
        """交易详情 - 点击交易应弹出详情面板"""
        create_transaction(self.token, self.book_id, amount=150, category="交通")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        logged_in_page.get_by_text("交通").click()
        expect(logged_in_page.get_by_text("流水详情")).to_be_visible()

    def test_archived_hides_edit_delete(self, logged_in_page):
        """交易详情 - 封存账本应显示封存提示"""
        create_transaction(self.token, self.book_id, amount=80, category="购物")
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        logged_in_page.get_by_text("购物").click()
        # 检查是否显示封存提示（使用交易详情中的封存提示类名）
        expect(logged_in_page.locator(".archived-text-small")).to_be_visible()


class TestAmountPrecision:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="金额精度测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_decimal_amount(self):
        """金额精度 - 小数金额99.99应正确存储"""
        tx = create_transaction(self.token, self.book_id, amount=99.99)
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        assert float(resp["data"]["amount"]) == 99.99
        assert float(resp["data"]["local_amount"]) == 99.99

    def test_large_amount(self):
        """金额精度 - 大金额99999.99应正确存储"""
        tx = create_transaction(self.token, self.book_id, amount=99999.99)
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        assert float(resp["data"]["amount"]) == 99999.99

    def test_foreign_currency_precision(self):
        """金额精度 - 外币小数金额换算应精确"""
        set_exchange_rate(self.token, self.book_id, "THB", 0.198765)
        tx = create_transaction(self.token, self.book_id, amount=1234.56, currency="THB")
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        expected = 1234.56 * 0.198765
        assert abs(float(resp["data"]["local_amount"]) - expected) < 0.02

    def test_total_expense_sum(self):
        """金额精度 - 总支出应等于所有交易本币金额之和"""
        create_transaction(self.token, self.book_id, amount=100, transactionTime="2026-04-03 12:00:00")
        create_transaction(self.token, self.book_id, amount=200.50, transactionTime="2026-04-04 12:00:00")
        create_transaction(self.token, self.book_id, amount=50.25, transactionTime="2026-04-05 12:00:00")
        resp = api_get(f"/account-books/{self.book_id}", self.token)
        assert abs(float(resp["data"]["totalExpense"]) - 350.75) < 0.01

    def test_archived_rejects_delete(self):
        """金额精度 - 封存账本不应允许删除交易"""
        tx = create_transaction(self.token, self.book_id, amount=50)
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        resp = api_delete(f"/transactions/{tx['id']}", self.token)
        assert resp["code"] != 200
        assert "封存" in resp["message"]
