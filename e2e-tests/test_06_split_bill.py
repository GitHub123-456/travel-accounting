"""分账模块测试（重点）- 分账计算 / 金额正确性 / 结清状态"""
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
    api_get, api_put,
)


class TestSplitBillUI:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="分账UI测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_render_page(self, logged_in_page):
        """分账页面 - 应正确渲染"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}/split-bill")
        expect(logged_in_page.get_by_text("自动分账")).to_be_visible()

    def test_show_rules(self, logged_in_page):
        """分账页面 - 应显示分账规则说明"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}/split-bill")
        logged_in_page.get_by_text("分账规则说明").click()
        expect(logged_in_page.get_by_text("系统自动计算")).to_be_visible()


class TestTwoPersonSplit:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="两人分账测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        yield
        delete_account_book(self.token, self.book_id)

    def _calc(self):
        return api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)

    def test_one_pays_two_split(self):
        """两人均分 - 张三付600两人分，李四应付张三300"""
        create_transaction(self.token, self.book_id, amount=600, type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        resp = self._calc()
        zs = next(p for p in resp["data"]["participants"] if p["participantName"] == "张三")
        ls = next(p for p in resp["data"]["participants"] if p["participantName"] == "李四")
        assert zs["actualPaid"] == 600
        assert zs["shouldPay"] == 300
        assert zs["balance"] == 300
        assert ls["actualPaid"] == 0
        assert ls["shouldPay"] == 300
        assert ls["balance"] == -300
        assert len(resp["data"]["payments"]) == 1
        assert resp["data"]["payments"][0]["amount"] == 300

    def test_both_pay_different(self):
        """两人均分 - 张三付400李四付200，差额应为100"""
        create_transaction(self.token, self.book_id, amount=400, type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        create_transaction(self.token, self.book_id, amount=200, type="shared",
                           payerId=self.pB["id"], participantIds=[self.pA["id"], self.pB["id"]],
                           transactionTime="2026-04-05 13:00:00")
        resp = self._calc()
        zs = next(p for p in resp["data"]["participants"] if p["participantName"] == "张三")
        ls = next(p for p in resp["data"]["participants"] if p["participantName"] == "李四")
        assert zs["balance"] == 100
        assert ls["balance"] == -100

    def test_equal_pay_zero_balance(self):
        """两人均分 - 各付300余额应为0无需支付"""
        create_transaction(self.token, self.book_id, amount=300, type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        create_transaction(self.token, self.book_id, amount=300, type="shared",
                           payerId=self.pB["id"], participantIds=[self.pA["id"], self.pB["id"]],
                           transactionTime="2026-04-05 13:00:00")
        resp = self._calc()
        zs = next(p for p in resp["data"]["participants"] if p["participantName"] == "张三")
        ls = next(p for p in resp["data"]["participants"] if p["participantName"] == "李四")
        assert zs["balance"] == 0
        assert ls["balance"] == 0
        assert len(resp["data"]["payments"]) == 0


class TestThreePersonSplit:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="三人分账测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        self.pC = add_participant(self.token, self.book_id, "王五")
        yield
        delete_account_book(self.token, self.book_id)

    def test_one_pays_three_split(self):
        """三人均分 - 张三付900三人分，李四王五各欠300"""
        ids = [self.pA["id"], self.pB["id"], self.pC["id"]]
        create_transaction(self.token, self.book_id, amount=900, type="shared",
                           payerId=self.pA["id"], participantIds=ids)
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        assert ps["张三"]["balance"] == 600
        assert ps["李四"]["balance"] == -300
        assert ps["王五"]["balance"] == -300

    def test_indivisible_amount(self):
        """三人均分 - 100÷3除不尽时总余额应接近0"""
        ids = [self.pA["id"], self.pB["id"], self.pC["id"]]
        create_transaction(self.token, self.book_id, amount=100, type="shared",
                           payerId=self.pA["id"], participantIds=ids)
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        total = sum(p["balance"] for p in resp["data"]["participants"])
        assert abs(total) < 0.05

    def test_multiple_payers(self):
        """三人均分 - 张三付300李四付600，张三余额应为0"""
        ids = [self.pA["id"], self.pB["id"], self.pC["id"]]
        create_transaction(self.token, self.book_id, amount=300, type="shared",
                           payerId=self.pA["id"], participantIds=ids)
        create_transaction(self.token, self.book_id, amount=600, type="shared",
                           payerId=self.pB["id"], participantIds=ids,
                           transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        assert ps["张三"]["balance"] == 0
        assert ps["李四"]["balance"] == 300
        assert ps["王五"]["balance"] == -300


class TestPartialParticipants:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="部分参与测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        self.pC = add_participant(self.token, self.book_id, "王五")
        yield
        delete_account_book(self.token, self.book_id)

    def test_third_person_unaffected(self):
        """部分参与 - 只有两人参与的交易不影响第三人"""
        create_transaction(self.token, self.book_id, amount=200, type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ww = next(p for p in resp["data"]["participants"] if p["participantName"] == "王五")
        assert ww["shouldPay"] == 0
        assert ww["balance"] == 0

    def test_mixed_participation(self):
        """部分参与 - 混合参与人数多笔交易计算应正确"""
        create_transaction(self.token, self.book_id, amount=300, type="shared",
                           payerId=self.pA["id"],
                           participantIds=[self.pA["id"], self.pB["id"], self.pC["id"]])
        create_transaction(self.token, self.book_id, amount=200, type="shared",
                           payerId=self.pB["id"],
                           participantIds=[self.pB["id"], self.pC["id"]],
                           transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        assert ps["张三"]["balance"] == 200
        assert ps["李四"]["balance"] == 0
        assert ps["王五"]["balance"] == -200


class TestForeignCurrencySplit:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="外币分账测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        yield
        delete_account_book(self.token, self.book_id)

    def test_thb_split_by_local_amount(self):
        """外币分账 - 1000THB×0.2=200CNY两人各100"""
        set_exchange_rate(self.token, self.book_id, "THB", 0.2)
        create_transaction(self.token, self.book_id, amount=1000, currency="THB", type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        assert ps["张三"]["balance"] == 100
        assert ps["李四"]["balance"] == -100

    def test_mixed_currency_split(self):
        """外币分账 - 混合币种(CNY+USD)分账应正确"""
        set_exchange_rate(self.token, self.book_id, "USD", 7.0)
        create_transaction(self.token, self.book_id, amount=100, currency="CNY", type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        create_transaction(self.token, self.book_id, amount=100, currency="USD", type="shared",
                           payerId=self.pB["id"], participantIds=[self.pA["id"], self.pB["id"]],
                           transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        assert ps["张三"]["balance"] == -300
        assert ps["李四"]["balance"] == 300


class TestPersonalNotInSplit:
    def test_personal_excluded(self, auth):
        """分账排除 - 个人交易不应计入分账"""
        token = auth["token"]
        data = create_account_book(token, name="个人不计入分账")
        book_id = data["id"]
        set_exchange_rate(token, book_id, "CNY", 1)
        pA = add_participant(token, book_id, "张三")
        pB = add_participant(token, book_id, "李四")
        create_transaction(token, book_id, amount=500, type="personal")
        create_transaction(token, book_id, amount=200, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"], pB["id"]],
                           transactionTime="2026-04-05 13:00:00")
        resp = api_get(f"/account-books/{book_id}/split-bills/calculate", token)
        assert resp["data"]["totalSharedExpense"] == 200
        delete_account_book(token, book_id)


class TestSettledStatus:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="结清状态测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        yield
        delete_account_book(self.token, self.book_id)

    def test_mark_settled(self):
        """结清状态 - 应能标记参与人为已结清"""
        resp = api_put(f"/account-books/{self.book_id}/participants/{self.pB['id']}/settled",
                       {"isSettled": True}, self.token)
        assert resp["code"] == 200

    def test_unmark_settled(self):
        """结清状态 - 应能取消结清标记"""
        api_put(f"/account-books/{self.book_id}/participants/{self.pB['id']}/settled",
                {"isSettled": True}, self.token)
        resp = api_put(f"/account-books/{self.book_id}/participants/{self.pB['id']}/settled",
                       {"isSettled": False}, self.token)
        assert resp["code"] == 200

    def test_settled_in_calculation(self):
        """结清状态 - 应在分账计算结果中体现"""
        api_put(f"/account-books/{self.book_id}/participants/{self.pA['id']}/settled",
                {"isSettled": True}, self.token)
        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.token)
        zs = next(p for p in resp["data"]["participants"] if p["participantName"] == "张三")
        assert zs["isSettled"] is True


class TestSplitBillPageUI:
    def test_show_balances(self, logged_in_page, auth):
        """分账UI - 应显示每个参与人的余额"""
        token = auth["token"]
        data = create_account_book(token, name="分账UI展示")
        book_id = data["id"]
        set_exchange_rate(token, book_id, "CNY", 1)
        pA = add_participant(token, book_id, "张三")
        pB = add_participant(token, book_id, "李四")
        create_transaction(token, book_id, amount=400, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"], pB["id"]])
        logged_in_page.goto(f"{BASE_URL}/account-books/{book_id}/split-bill")
        expect(logged_in_page.get_by_text("张三")).to_be_visible()
        expect(logged_in_page.get_by_text("200.00").first).to_be_visible()
        delete_account_book(token, book_id)

    def test_expand_detail(self, logged_in_page, auth):
        """分账UI - 点击参与人卡片应展开详情"""
        token = auth["token"]
        data = create_account_book(token, name="分账展开测试")
        book_id = data["id"]
        set_exchange_rate(token, book_id, "CNY", 1)
        pA = add_participant(token, book_id, "张三")
        pB = add_participant(token, book_id, "李四")
        create_transaction(token, book_id, amount=400, type="shared",
                           payerId=pA["id"], participantIds=[pA["id"], pB["id"]])
        logged_in_page.goto(f"{BASE_URL}/account-books/{book_id}/split-bill")
        logged_in_page.locator(".participant-header").first.click()
        expect(logged_in_page.locator(".participant-detail")).to_be_visible()
        delete_account_book(token, book_id)
