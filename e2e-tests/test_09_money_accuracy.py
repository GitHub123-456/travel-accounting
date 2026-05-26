"""金钱精度综合测试（重点）- 端到端金额正确性验证"""
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
    api_get,
)


class TestBasicAmountMath:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="基础金额测试", budget=50000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_multi_transaction_sum(self):
        """基础金额 - 多笔交易累加应正确"""
        amounts = [12.34, 56.78, 90.12, 34.56, 78.90]
        expected = sum(amounts)
        for i, amt in enumerate(amounts):
            create_transaction(self.token, self.book_id, amount=amt,
                               transactionTime=f"2026-04-0{i+1} 12:00:00")
        resp = api_get(f"/account-books/{self.book_id}", self.token)
        assert abs(float(resp["data"]["totalExpense"]) - expected) < 0.01

    def test_floating_point_01_02(self):
        """0.1 + 0.2 应正确处理"""
        create_transaction(self.token, self.book_id, amount=0.1, transactionTime="2026-04-05 12:00:00")
        create_transaction(self.token, self.book_id, amount=0.2, transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{self.book_id}", self.token)
        assert abs(float(resp["data"]["totalExpense"]) - 0.3) < 0.01

    def test_min_amount(self):
        """基础金额 - 最小金额0.01应正确存储"""
        tx = create_transaction(self.token, self.book_id, amount=0.01)
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        assert float(resp["data"]["amount"]) == 0.01

    def test_large_amount(self):
        """基础金额 - 大金额9999999.99应正确存储"""
        tx = create_transaction(self.token, self.book_id, amount=9999999.99)
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        assert float(resp["data"]["amount"]) == 9999999.99


class TestExchangeRatePrecision:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="汇率精度综合测试", budget=50000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_high_precision_rate(self):
        """1 JPY = 0.048123 CNY, 12345 JPY"""
        set_exchange_rate(self.token, self.book_id, "JPY", 0.048123)
        tx = create_transaction(self.token, self.book_id, amount=12345, currency="JPY")
        resp = api_get(f"/transactions/{tx['id']}", self.token)
        expected = 12345 * 0.048123
        assert abs(float(resp["data"]["local_amount"]) - expected) < 0.02

    def test_batch_rate_update(self):
        """更新汇率后所有交易重新计算"""
        set_exchange_rate(self.token, self.book_id, "THB", 0.2)
        create_transaction(self.token, self.book_id, amount=100, currency="THB", transactionTime="2026-04-03 12:00:00")
        create_transaction(self.token, self.book_id, amount=200, currency="THB", transactionTime="2026-04-04 12:00:00")
        create_transaction(self.token, self.book_id, amount=300, currency="THB", transactionTime="2026-04-05 12:00:00")

        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        total = sum(float(t["local_amount"]) for t in resp["data"]["list"])
        assert abs(total - 120) < 0.01

        set_exchange_rate(self.token, self.book_id, "THB", 0.25)
        resp = api_get(f"/account-books/{self.book_id}/transactions", self.token)
        total = sum(float(t["local_amount"]) for t in resp["data"]["list"])
        assert abs(total - 150) < 0.01


class TestSplitBillConservation:
    """分账金额守恒"""

    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="守恒测试", budget=50000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_balance_sum_is_zero(self):
        """所有参与人余额之和应为0"""
        pA = add_participant(self.token, self.book_id, "A")
        pB = add_participant(self.token, self.book_id, "B")
        pC = add_participant(self.token, self.book_id, "C")
        create_transaction(self.token, self.book_id, amount=333.33, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"], pB["id"], pC["id"]],
                           transactionTime="2026-04-03 12:00:00")
        create_transaction(self.token, self.book_id, amount=666.66, type="shared",
                           payerId=pB["id"], participantIds=[pA["id"], pB["id"]],
                           transactionTime="2026-04-04 12:00:00")
        create_transaction(self.token, self.book_id, amount=150, type="shared",
                           payerId=pC["id"], participantIds=[pB["id"], pC["id"]],
                           transactionTime="2026-04-05 12:00:00")
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        total = sum(p["balance"] for p in resp["data"]["participants"])
        assert abs(total) < 0.05

    def test_payments_equal_debt(self):
        """支付明细总额 = 所有负余额之和"""
        pA = add_participant(self.token, self.book_id, "X")
        pB = add_participant(self.token, self.book_id, "Y")
        pC = add_participant(self.token, self.book_id, "Z")
        create_transaction(self.token, self.book_id, amount=900, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"], pB["id"], pC["id"]])
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        total_debt = sum(abs(p["balance"]) for p in resp["data"]["participants"] if p["balance"] < 0)
        total_payments = sum(p["amount"] for p in resp["data"]["payments"])
        assert abs(total_payments - total_debt) < 0.02


class TestBudgetCalculation:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="预算计算测试", budget=50000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_percentage_accuracy(self):
        """预算计算 - 百分比应精确计算"""
        create_transaction(self.token, self.book_id, amount=12500)
        resp = api_get(f"/account-books/{self.book_id}", self.token)
        pct = float(resp["data"]["totalExpense"]) / float(resp["data"]["budget"]) * 100
        assert pct == 25

    def test_remaining_budget(self, logged_in_page):
        """预算计算 - 应正确显示剩余预算"""
        create_transaction(self.token, self.book_id, amount=30000)
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("剩余")).to_be_visible()
        expect(logged_in_page.get_by_text("20000")).to_be_visible()


class TestEdgeCases:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="边界测试", budget=50000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_single_person_shared(self):
        """单人参与共同账单应全额承担"""
        pA = add_participant(self.token, self.book_id, "独行侠")
        create_transaction(self.token, self.book_id, amount=500, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"]])
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        p = next(x for x in resp["data"]["participants"] if x["participantName"] == "独行侠")
        assert p["shouldPay"] == 500
        assert p["balance"] == 0

    def test_many_small_amounts(self):
        """20笔 0.05 累加应为 1.00"""
        for i in range(20):
            create_transaction(self.token, self.book_id, amount=0.05,
                               transactionTime=f"2026-04-05 {str(i).zfill(2)}:00:00")
        resp = api_get(f"/account-books/{self.book_id}", self.token)
        assert abs(float(resp["data"]["totalExpense"]) - 1.0) < 0.01
