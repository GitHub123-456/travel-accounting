"""封存账本测试 - 只读限制 / 各模块封存行为验证"""
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
    api_get, api_put, api_post, api_delete,
)


class TestArchivedAPIRestrictions:
    """API 层封存限制"""

    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="封存API测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        set_exchange_rate(self.token, self.book_id, "USD", 7.25)
        add_participant(self.token, self.book_id, "成员A")
        add_participant(self.token, self.book_id, "成员B")
        create_transaction(self.token, self.book_id, amount=500, category="餐饮")
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        yield
        delete_account_book(self.token, self.book_id)

    def test_reject_new_transaction(self):
        """封存API - 应拒绝新增交易"""
        resp = api_post(f"/account-books/{self.book_id}/transactions", {
            "amount": 100, "currency": "CNY", "category": "餐饮",
            "transactionTime": "2026-04-05 12:00:00", "type": "personal",
        }, self.token)
        assert resp["code"] != 200
        assert "封存" in resp["message"]

    def test_reject_rate_change(self):
        """封存API - 应拒绝修改汇率"""
        resp = api_post(f"/account-books/{self.book_id}/exchange-rates",
                        {"currency": "USD", "rate": 8.0}, self.token)
        assert resp["code"] != 200
        assert "封存" in resp["message"]

    def test_reject_edit_transaction(self):
        """封存API - 应拒绝编辑交易"""
        tx_resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        tx_id = tx_resp["data"]["list"][0]["id"]
        resp = api_put(f"/transactions/{tx_id}", {
            "amount": 999, "currency": "CNY", "category": "餐饮",
            "transactionTime": "2026-04-05 12:00:00", "type": "personal",
        }, self.token)
        assert resp["code"] != 200
        assert "封存" in resp["message"]

    def test_reject_delete_transaction(self):
        """封存API - 应拒绝删除交易"""
        tx_resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        tx_id = tx_resp["data"]["list"][0]["id"]
        resp = api_delete(f"/transactions/{tx_id}", self.token)
        assert resp["code"] != 200
        assert "封存" in resp["message"]

    def test_allow_view_transactions(self):
        """封存API - 应允许查看交易列表"""
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        assert resp["code"] == 200
        assert len(resp["data"]["list"]) >= 1

    def test_allow_view_split_bill(self):
        """封存API - 应允许查看分账结果"""
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        assert resp["code"] == 200


class TestArchivedUIRestrictions:
    """UI 层封存限制"""

    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="封存UI测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        add_participant(self.token, self.book_id, "成员A")
        create_transaction(self.token, self.book_id, amount=500, category="餐饮")
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        yield
        delete_account_book(self.token, self.book_id)

    def test_show_archived_notice(self, logged_in_page):
        """封存UI - 应显示封存提示和只读状态"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("账本已封存")).to_be_visible()
        expect(logged_in_page.get_by_text("只读状态")).to_be_visible()

    def test_hide_record_button(self, logged_in_page):
        """封存UI - 应隐藏记账按钮"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".floating-record-btn")).to_have_count(0)

    def test_hide_management_section(self, logged_in_page):
        """封存UI - 应隐藏管理区域"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".management-section")).to_have_count(0)

    def test_transaction_detail_no_edit(self, logged_in_page):
        """封存UI - 交易详情应禁止编辑和删除"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        logged_in_page.locator(".transaction-item").first.click()
        expect(logged_in_page.get_by_text("账本已封存，无法修改或删除账单")).to_be_visible()

    def test_data_still_browsable(self, logged_in_page):
        """封存UI - 数据应仍可浏览"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("总支出")).to_be_visible()
        logged_in_page.get_by_text("账单明细").click()
        expect(logged_in_page.get_by_text("餐饮")).to_be_visible()


class TestArchivedAmountIntegrity:
    """封存后金额不变性"""

    def test_amounts_unchanged(self, auth):
        """封存金额 - 封存后金额应保持不变"""
        token = auth["token"]
        data = create_account_book(token, name="封存金额不变测试")
        book_id = data["id"]
        set_exchange_rate(token, book_id, "CNY", 1)
        create_transaction(token, book_id, amount=500, category="餐饮")
        api_put(f"/account-books/{book_id}/archive", {"isArchived": True}, token)

        resp = api_get(f"/account-books/{book_id}", token)
        assert float(resp["data"]["totalExpense"]) == 500

        tx_resp = api_get(f"/account-books/{book_id}/transactions", token)
        assert float(tx_resp["data"]["list"][0]["amount"]) == 500
        assert float(tx_resp["data"]["list"][0]["local_amount"]) == 500

        delete_account_book(token, book_id)
