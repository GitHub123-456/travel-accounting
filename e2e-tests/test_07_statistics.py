"""统计模块测试 - 类别统计 / 成员统计 / 预算 / 总支出"""
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book,
    set_exchange_rate, create_transaction, add_participant,
)


class TestTotalExpense:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="总支出测试", budget=5000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_zero_without_transactions(self, logged_in_page):
        """总支出 - 无交易时应显示0.00"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".expense-amount")).to_contain_text("0.00")

    def test_updates_after_transactions(self, logged_in_page):
        """总支出 - 添加交易后应正确累加金额"""
        create_transaction(self.token, self.book_id, amount=100, transactionTime="2026-04-05 12:00:00")
        create_transaction(self.token, self.book_id, amount=250.50, transactionTime="2026-04-06 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".expense-amount")).to_contain_text("350.50")


class TestBudgetProgress:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="预算测试", budget=5000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_show_percentage(self, logged_in_page):
        """预算进度 - 应显示正确的百分比"""
        create_transaction(self.token, self.book_id, amount=1000, transactionTime="2026-04-05 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("已用20%")).to_be_visible()

    def test_warning_over_80(self, logged_in_page):
        """预算进度 - 超过80%应显示警告样式"""
        create_transaction(self.token, self.book_id, amount=4200, transactionTime="2026-04-05 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".budget-percentage.warning")).to_be_visible()

    def test_overspend_notice(self, logged_in_page):
        """预算进度 - 超支时应显示超支提示"""
        create_transaction(self.token, self.book_id, amount=5500, transactionTime="2026-04-05 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("超支")).to_be_visible()


class TestCategoryStats:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="类别统计测试", budget=5000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        create_transaction(self.token, self.book_id, amount=300, category="餐饮", transactionTime="2026-04-05 12:00:00")
        create_transaction(self.token, self.book_id, amount=500, category="住宿", transactionTime="2026-04-06 12:00:00")
        create_transaction(self.token, self.book_id, amount=200, category="交通", transactionTime="2026-04-07 12:00:00")
        yield
        delete_account_book(self.token, self.book_id)

    def test_show_pie_chart(self, logged_in_page):
        """类别统计 - 应显示饼图"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_role("tab", name="类别统计").click()
        expect(logged_in_page.locator(".recharts-pie")).to_be_visible()

    def test_show_category_amounts(self, logged_in_page):
        """类别统计 - 应显示各类别金额"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_role("tab", name="类别统计").click()
        lst = logged_in_page.locator(".category-detail-list")
        expect(lst.get_by_text("餐饮")).to_be_visible()
        expect(lst.get_by_text("住宿")).to_be_visible()
        expect(lst.get_by_text("交通")).to_be_visible()

    def test_sorted_by_amount_desc(self, logged_in_page):
        """类别统计 - 应按金额降序排列"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_role("tab", name="类别统计").click()
        items = logged_in_page.locator(".category-detail-item")
        expect(items.nth(0)).to_contain_text("住宿")
        expect(items.nth(1)).to_contain_text("餐饮")
        expect(items.nth(2)).to_contain_text("交通")


class TestMemberStats:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="成员统计测试", budget=5000)
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        self.pA = add_participant(self.token, self.book_id, "张三")
        self.pB = add_participant(self.token, self.book_id, "李四")
        create_transaction(self.token, self.book_id, amount=600, type="shared",
                           payerId=self.pA["id"], participantIds=[self.pA["id"], self.pB["id"]])
        yield
        delete_account_book(self.token, self.book_id)

    def test_show_shared_total(self, logged_in_page):
        """成员统计 - 应显示共同支出总额"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_role("tab", name="成员统计").click()
        # 等待数据加载
        logged_in_page.wait_for_timeout(1000)
        expect(logged_in_page.get_by_text("共同支出总额")).to_be_visible()
        # 使用更精确的选择器定位金额
        expect(logged_in_page.locator(".shared-expense-amount")).to_contain_text("600.00")

    def test_split_bill_link(self, logged_in_page):
        """成员统计 - 点击查看详细分账方案应跳转到分账页"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_role("tab", name="成员统计").click()
        logged_in_page.get_by_text("查看详细分账方案").click()
        import re
        expect(logged_in_page).to_have_url(re.compile(r"/split-bill"))


class TestDateGrouping:
    @pytest.fixture(autouse=True)
    def setup(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="日期分组测试")
        self.book_id = data["id"]
        set_exchange_rate(self.token, self.book_id, "CNY", 1)
        yield
        delete_account_book(self.token, self.book_id)

    def test_same_day_one_group(self, logged_in_page):
        """日期分组 - 同一天的交易应归为一组"""
        create_transaction(self.token, self.book_id, amount=50, transactionTime="2026-04-05 08:00:00")
        create_transaction(self.token, self.book_id, amount=80, transactionTime="2026-04-05 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        expect(logged_in_page.locator(".date-group")).to_have_count(1)
        expect(logged_in_page.locator(".date-total")).to_contain_text("130.00")

    def test_different_days_multiple_groups(self, logged_in_page):
        """日期分组 - 不同天的交易应分为多组"""
        create_transaction(self.token, self.book_id, amount=100, transactionTime="2026-04-05 12:00:00")
        create_transaction(self.token, self.book_id, amount=200, transactionTime="2026-04-06 12:00:00")
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        expect(logged_in_page.locator(".date-group")).to_have_count(2)
