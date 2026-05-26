"""多用户场景测试 - 不同用户的个人支出隔离 / 个人总计只统计当前用户"""
import time
import re
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, api_post, api_get, api_put,
    create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
)


def register_and_login(email, password, nickname):
    """注册并登录一个新用户，返回 token + userId"""
    resp = api_post("/auth/login", {"account": email, "password": password})
    if resp["code"] == 200:
        return resp["data"]["token"], resp["data"]["userId"]
    resp = api_post("/auth/register", {
        "nickname": nickname,
        "email": email,
        "password": password,
    })
    assert resp["code"] == 200, f"注册失败: {resp['message']}"
    return resp["data"]["token"], resp["data"]["userId"]


def login_page_as(page, token, user_id):
    """在页面中以指定用户身份登录"""
    page.goto(f"{BASE_URL}/login")
    page.evaluate(
        """([token, userId]) => {
            localStorage.setItem('token', token);
            localStorage.setItem('userId', String(userId));
        }""",
        [token, str(user_id)],
    )


class TestMultiUserPersonalExpense:
    """多用户个人支出隔离测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        ts = int(time.time())
        # 用户A（账本创建者）
        self.tokenA, self.userIdA = register_and_login(
            f"userA_{ts}@test.com", "UserA123", "用户A"
        )
        # 用户B（被邀请的参与者）
        self.tokenB, self.userIdB = register_and_login(
            f"userB_{ts}@test.com", "UserB123", "用户B"
        )

        # 用户A创建账本
        book = create_account_book(self.tokenA, name=f"多用户测试_{ts}")
        self.book_id = book["id"]
        set_exchange_rate(self.tokenA, self.book_id, "CNY", 1)

        # 添加用户A为参与人（关联 user_id）
        resp = api_post(
            f"/account-books/{self.book_id}/participants",
            {"name": "用户A", "email": f"userA_{ts}@test.com", "remark": "本人"},
            self.tokenA,
        )
        self.participantA = resp["data"]

        # 添加用户B为参与人（通过邮箱关联）
        resp = api_post(
            f"/account-books/{self.book_id}/participants",
            {"name": "用户B", "email": f"userB_{ts}@test.com", "remark": "朋友"},
            self.tokenA,
        )
        self.participantB = resp["data"]

        yield
        delete_account_book(self.tokenA, self.book_id)

    def test_user_a_personal_expense_only_shows_own(self, page):
        """多用户个人支出 - 用户A的个人支出只显示用户A自己的交易"""
        # 用户A记录个人交易 200 元（设置 payerId 为自己的参与人ID）
        create_transaction(self.tokenA, self.book_id,
                           amount=200, type="personal",
                           payerId=self.participantA["id"],
                           remark="用户A的个人消费",
                           transactionTime="2026-04-05 10:00:00")

        # 用户B记录个人交易 300 元
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           remark="用户B的个人消费",
                           transactionTime="2026-04-05 11:00:00")

        # 用户A登录查看 - 个人支出应只显示 200
        login_page_as(page, self.tokenA, self.userIdA)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)

        # 检查个人支出卡片
        personal_card = page.locator(".stat-card.personal-card .stat-value")
        personal_text = personal_card.inner_text()
        # 应包含 200，不应包含 300 或 500
        assert "200" in personal_text, f"用户A个人支出应为200，实际显示: {personal_text}"

    def test_user_b_personal_expense_only_shows_own(self, page):
        """多用户个人支出 - 用户B的个人支出只显示用户B自己的交易"""
        # 用户A记录个人交易 200 元
        create_transaction(self.tokenA, self.book_id,
                           amount=200, type="personal",
                           payerId=self.participantA["id"],
                           remark="用户A的个人消费",
                           transactionTime="2026-04-05 10:00:00")

        # 用户B记录个人交易 300 元
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           remark="用户B的个人消费",
                           transactionTime="2026-04-05 11:00:00")

        # 用户B登录查看 - 个人支出应只显示 300
        login_page_as(page, self.tokenB, self.userIdB)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)

        personal_card = page.locator(".stat-card.personal-card .stat-value")
        personal_text = personal_card.inner_text()
        assert "300" in personal_text, f"用户B个人支出应为300，实际显示: {personal_text}"

    def test_personal_total_includes_own_personal_plus_shared(self, page):
        """多用户个人总计 - 应等于当前用户的个人支出+共同分摊"""
        # 用户A记录个人交易 200 元
        create_transaction(self.tokenA, self.book_id,
                           amount=200, type="personal",
                           payerId=self.participantA["id"],
                           transactionTime="2026-04-05 10:00:00")

        # 用户B记录个人交易 300 元
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           transactionTime="2026-04-05 11:00:00")

        # 共同交易 600 元（用户A付，两人分）
        create_transaction(self.tokenA, self.book_id,
                           amount=600, type="shared",
                           payerId=self.participantA["id"],
                           participantIds=[self.participantA["id"], self.participantB["id"]],
                           transactionTime="2026-04-05 12:00:00")

        # 用户A查看：个人总计 = 个人支出200 + 共同分摊300 = 500
        login_page_as(page, self.tokenA, self.userIdA)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)

        total_card = page.locator(".stat-card-full.total-card .stat-value-large")
        total_text = total_card.inner_text()
        assert "500" in total_text, f"用户A个人总计应为500，实际显示: {total_text}"

    def test_user_b_personal_total(self, page):
        """多用户个人总计 - 用户B的个人总计应为自己的个人支出+共同分摊"""
        # 用户B记录个人交易 300 元
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           transactionTime="2026-04-05 11:00:00")

        # 共同交易 400 元（用户A付，两人分）
        create_transaction(self.tokenA, self.book_id,
                           amount=400, type="shared",
                           payerId=self.participantA["id"],
                           participantIds=[self.participantA["id"], self.participantB["id"]],
                           transactionTime="2026-04-05 12:00:00")

        # 用户B查看：个人总计 = 个人支出300 + 共同分摊200 = 500
        login_page_as(page, self.tokenB, self.userIdB)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)

        total_card = page.locator(".stat-card-full.total-card .stat-value-large")
        total_text = total_card.inner_text()
        assert "500" in total_text, f"用户B个人总计应为500，实际显示: {total_text}"

    def test_total_expense_includes_all_users(self, page):
        """多用户总支出 - 总支出应包含所有用户的所有交易"""
        # 用户A个人 200
        create_transaction(self.tokenA, self.book_id,
                           amount=200, type="personal",
                           payerId=self.participantA["id"],
                           transactionTime="2026-04-05 10:00:00")
        # 用户B个人 300
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           transactionTime="2026-04-05 11:00:00")
        # 共同 600
        create_transaction(self.tokenA, self.book_id,
                           amount=600, type="shared",
                           payerId=self.participantA["id"],
                           participantIds=[self.participantA["id"], self.participantB["id"]],
                           transactionTime="2026-04-05 12:00:00")

        # 总支出应为 200 + 300 + 600 = 1100
        login_page_as(page, self.tokenA, self.userIdA)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)

        expense_amount = page.locator(".expense-amount")
        expense_text = expense_amount.inner_text()
        assert "1100" in expense_text, f"总支出应为1100，实际显示: {expense_text}"

    def test_shared_expense_same_for_all_users(self, page):
        """多用户共同支出 - 共同支出金额对所有用户应一致"""
        # 共同交易 800 元
        create_transaction(self.tokenA, self.book_id,
                           amount=800, type="shared",
                           payerId=self.participantA["id"],
                           participantIds=[self.participantA["id"], self.participantB["id"]],
                           transactionTime="2026-04-05 12:00:00")

        # 用户A看到的共同支出
        login_page_as(page, self.tokenA, self.userIdA)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)
        shared_a = page.locator(".stat-card.shared-card .stat-value").inner_text()

        # 用户B看到的共同支出
        login_page_as(page, self.tokenB, self.userIdB)
        page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        page.wait_for_timeout(1000)
        shared_b = page.locator(".stat-card.shared-card .stat-value").inner_text()

        # 两人看到的共同支出应一致
        assert shared_a == shared_b, f"共同支出不一致: 用户A={shared_a}, 用户B={shared_b}"
        assert "800" in shared_a, f"共同支出应为800，实际: {shared_a}"

    def test_user_b_records_personal_via_api(self):
        """多用户API - 用户B通过API记录的个人交易应正确存储"""
        tx = create_transaction(self.tokenB, self.book_id,
                                amount=150, type="personal",
                                payerId=self.participantB["id"],
                                remark="用户B的API交易",
                                transactionTime="2026-04-05 14:00:00")

        # 验证交易属于该账本
        resp = api_get(f"/transactions/{tx['id']}", self.tokenB)
        assert resp["code"] == 200
        assert float(resp["data"]["amount"]) == 150
        assert resp["data"]["type"] == "personal"

    def test_split_bill_correct_with_mixed_transactions(self):
        """多用户分账 - 混合个人和共同交易时分账应只计算共同交易"""
        # 用户A个人 500
        create_transaction(self.tokenA, self.book_id,
                           amount=500, type="personal",
                           payerId=self.participantA["id"],
                           transactionTime="2026-04-05 10:00:00")
        # 用户B个人 300
        create_transaction(self.tokenB, self.book_id,
                           amount=300, type="personal",
                           payerId=self.participantB["id"],
                           transactionTime="2026-04-05 11:00:00")
        # 共同 1000（用户A付，两人分）
        create_transaction(self.tokenA, self.book_id,
                           amount=1000, type="shared",
                           payerId=self.participantA["id"],
                           participantIds=[self.participantA["id"], self.participantB["id"]],
                           transactionTime="2026-04-05 12:00:00")

        resp = api_get(f"/account-books/{self.book_id}/split-bills/calculate", self.tokenA)
        # 共同支出总额应只有 1000，不含个人的 500+300
        assert resp["data"]["totalSharedExpense"] == 1000

        ps = {p["participantName"]: p for p in resp["data"]["participants"]}
        # 每人应付 500
        assert ps["用户A"]["shouldPay"] == 500
        assert ps["用户B"]["shouldPay"] == 500
        # 用户A实付1000，余额+500
        assert ps["用户A"]["balance"] == 500
        # 用户B实付0，余额-500
        assert ps["用户B"]["balance"] == -500
