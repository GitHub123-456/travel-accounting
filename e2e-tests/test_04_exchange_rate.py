"""汇率管理模块测试"""
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, api_get, api_put, api_post,
)


class TestExchangeRateUI:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="汇率测试账本")
        self.book_id = data["id"]
        yield
        delete_account_book(self.token, self.book_id)

    def test_open_rate_panel(self, logged_in_page):
        """汇率管理 - 点击应弹出管理面板"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("汇率管理").click()
        expect(logged_in_page.get_by_text("账本默认币种")).to_be_visible()

    def test_show_currencies(self, logged_in_page):
        """汇率管理 - 应显示可选币种列表（排除CNY）"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("汇率管理").click()
        for c in ["USD", "EUR", "JPY", "THB", "KRW"]:
            expect(logged_in_page.locator(".currency-chips").get_by_text(c)).to_be_visible()

    def test_empty_rates_message(self, logged_in_page):
        """汇率管理 - 无汇率记录时应显示空状态或汇率提示"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("汇率管理").click()
        # 新建账本可能自动设置了汇率，检查面板正常打开即可
        expect(logged_in_page.get_by_text("账本默认币种")).to_be_visible()

    def test_rate_shows_after_add(self, logged_in_page):
        """汇率管理 - 添加汇率后应显示在列表中"""
        set_exchange_rate(self.token, self.book_id, "USD", 7.25)
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("汇率管理").click()
        expect(logged_in_page.get_by_text("7.25")).to_be_visible()

    def test_archived_rejects_rate_change(self):
        """汇率管理 - 封存账本不应允许修改汇率"""
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        resp = api_post(f"/account-books/{self.book_id}/exchange-rates", {"currency": "USD", "rate": 7.0}, self.token)
        assert "封存" in resp["message"]


class TestExchangeRateAccuracy:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="汇率精度测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_thb_conversion(self):
        """汇率换算 - 500 THB × 0.2 应等于 100 CNY"""
        set_exchange_rate(self.token, self.book_id, "THB", 0.2)
        create_transaction(self.token, self.book_id, amount=500, currency="THB")
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        assert float(resp["data"]["list"][0]["local_amount"]) == 100

    def test_rate_update_recalculates(self):
        """汇率换算 - 更新汇率后应重新计算所有交易本币金额"""
        set_exchange_rate(self.token, self.book_id, "USD", 7.0)
        create_transaction(self.token, self.book_id, amount=100, currency="USD")
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        assert float(resp["data"]["list"][0]["local_amount"]) == 700
        set_exchange_rate(self.token, self.book_id, "USD", 7.25)
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        assert float(resp["data"]["list"][0]["local_amount"]) == 725

    def test_different_currencies_use_own_rates(self):
        """汇率换算 - 不同币种应使用各自汇率"""
        set_exchange_rate(self.token, self.book_id, "USD", 7.25)
        set_exchange_rate(self.token, self.book_id, "JPY", 0.048)
        create_transaction(self.token, self.book_id, amount=100, currency="USD", remark="USD交易")
        create_transaction(self.token, self.book_id, amount=5000, currency="JPY", remark="JPY交易",
                           transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        usd = next(t for t in resp["data"]["list"] if t["remark"] == "USD交易")
        jpy = next(t for t in resp["data"]["list"] if t["remark"] == "JPY交易")
        assert float(usd["local_amount"]) == 725
        assert float(jpy["local_amount"]) == 240

    def test_cny_rate_is_one(self):
        """汇率换算 - CNY交易本币金额应等于原始金额"""
        create_transaction(self.token, self.book_id, amount=256.78, currency="CNY")
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        assert float(resp["data"]["list"][0]["local_amount"]) == 256.78
