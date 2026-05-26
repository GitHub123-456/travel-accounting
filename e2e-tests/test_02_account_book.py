"""账本模块测试 - 创建 / 列表 / 详情 / 封存"""
import re
import time
import pytest
from playwright.sync_api import expect
from conftest import (
    BASE_URL, create_account_book, delete_account_book, api_put,
)


class TestAccountBookList:
    def test_render_list_page(self, logged_in_page, auth):
        """账本列表 - 应正确渲染列表页元素"""
        logged_in_page.goto(f"{BASE_URL}/account-books")
        expect(logged_in_page.get_by_text("我的账本")).to_be_visible()
        expect(logged_in_page.get_by_placeholder("搜索")).to_be_visible()

    def test_click_avatar_to_profile(self, logged_in_page):
        """账本列表 - 点击头像应跳转到个人中心"""
        logged_in_page.goto(f"{BASE_URL}/account-books")
        logged_in_page.locator(".list-avatar").click()
        expect(logged_in_page).to_have_url(re.compile(r"/profile"))

    def test_created_book_appears_in_list(self, logged_in_page, auth):
        """账本列表 - 创建的账本应出现在列表中"""
        name = f"列表验证_{int(time.time())}"
        book = create_account_book(auth["token"], name=name)
        logged_in_page.goto(f"{BASE_URL}/account-books")
        expect(logged_in_page.get_by_text(name)).to_be_visible()
        delete_account_book(auth["token"], book["id"])


class TestCreateAccountBook:
    def test_floating_btn_opens_form(self, logged_in_page):
        """创建账本 - 点击浮动按钮应弹出创建表单"""
        logged_in_page.goto(f"{BASE_URL}/account-books")
        logged_in_page.locator(".list-fab").last.click()
        expect(logged_in_page.get_by_role("heading", name="新建账本")).to_be_visible()

    def test_form_shows_per_person_budget_label(self, logged_in_page):
        """创建账本 - 表单应显示人均预算标签"""
        logged_in_page.goto(f"{BASE_URL}/account-books")
        logged_in_page.locator(".list-fab").last.click()
        expect(logged_in_page.get_by_text("人均预算")).to_be_visible()

    def test_empty_fields_show_validation(self, logged_in_page):
        """创建账本 - 必填字段为空时应提示验证错误"""
        logged_in_page.goto(f"{BASE_URL}/account-books")
        logged_in_page.locator(".list-fab").last.click()
        logged_in_page.locator(".adm-popup-body").get_by_role("button", name="创建").click()
        expect(logged_in_page.get_by_text("请输入旅行名称")).to_be_visible()


class TestAccountBookDetail:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="详情测试账本", budget=5000)
        self.book_id = data["id"]
        yield
        delete_account_book(self.token, self.book_id)

    def test_show_basic_info(self, logged_in_page):
        """账本详情 - 应正确显示账本基本信息"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("详情测试账本")).to_be_visible()
        expect(logged_in_page.get_by_text("东京")).to_be_visible()

    def test_show_total_expense_label(self, logged_in_page):
        """账本详情 - 应显示全员总支出标签"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("全员总支出")).to_be_visible()

    def test_show_my_budget_progress(self, logged_in_page):
        """账本详情 - 设置预算后应显示我的预算进度条"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("我的预算")).to_be_visible()

    def test_show_four_tabs(self, logged_in_page):
        """账本详情 - 应显示四个标签页"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        for tab in ["总览", "账单明细", "类别统计", "成员统计"]:
            expect(logged_in_page.get_by_text(tab)).to_be_visible()

    def test_show_management_section(self, logged_in_page):
        """账本详情 - 应显示管理功能区"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("汇率管理")).to_be_visible()
        expect(logged_in_page.get_by_text("成员管理")).to_be_visible()

    def test_empty_transactions(self, logged_in_page):
        """账本详情 - 无交易时账单明细应显示空状态"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("账单明细").click()
        expect(logged_in_page.get_by_text("暂无账单记录")).to_be_visible()

    def test_record_btn_opens_form(self, logged_in_page):
        """账本详情 - 点击记账按钮应弹出记账表单"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.locator(".floating-record-btn").click()
        logged_in_page.wait_for_timeout(1000)
        expect(logged_in_page.locator(".adm-popup-body")).to_be_visible()

    def test_split_bill_link(self, logged_in_page):
        """账本详情 - 点击自动分账应跳转到分账页面"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        logged_in_page.get_by_text("自动分账").click()
        expect(logged_in_page).to_have_url(re.compile(r"/split-bill"))


class TestArchivedBook:
    @pytest.fixture(autouse=True)
    def setup_book(self, auth):
        self.token = auth["token"]
        data = create_account_book(self.token, name="封存测试账本")
        self.book_id = data["id"]
        api_put(f"/account-books/{self.book_id}/archive", {"isArchived": True}, self.token)
        yield
        delete_account_book(self.token, self.book_id)

    def test_archived_shows_notice(self, logged_in_page):
        """封存账本 - 应显示只读提示且隐藏记账按钮"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.get_by_text("账本已封存")).to_be_visible()
        expect(logged_in_page.locator(".floating-record-btn")).to_have_count(0)

    def test_archived_hides_management(self, logged_in_page):
        """封存账本 - 管理功能区不应显示"""
        logged_in_page.goto(f"{BASE_URL}/account-books/{self.book_id}")
        expect(logged_in_page.locator(".management-section")).to_have_count(0)
