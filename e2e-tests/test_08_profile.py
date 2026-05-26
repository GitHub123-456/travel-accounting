"""个人中心模块测试"""
import re
from playwright.sync_api import expect
from conftest import BASE_URL


class TestProfile:
    def test_render_profile(self, logged_in_page, auth):
        """个人中心 - 应正确渲染用户信息"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        expect(logged_in_page.get_by_text("个人中心")).to_be_visible()
        expect(logged_in_page.get_by_text("Pytest测试")).to_be_visible()
        # 使用更精确的选择器定位邮箱
        expect(logged_in_page.locator(".profile-account")).to_be_visible()

    def test_show_stats(self, logged_in_page):
        """个人中心 - 应显示统计信息"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        expect(logged_in_page.get_by_text("账本", exact=True)).to_be_visible()
        expect(logged_in_page.get_by_text("默认币种")).to_be_visible()
        expect(logged_in_page.get_by_text("加入年份")).to_be_visible()

    def test_my_books_link(self, logged_in_page):
        """个人中心 - 点击我的账本应跳转到账本列表"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        logged_in_page.get_by_text("我的账本").click()
        expect(logged_in_page).to_have_url(re.compile(r"/account-books"))

    def test_back_button(self, logged_in_page):
        """个人中心 - 点击返回按钮应回到账本列表"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        logged_in_page.locator(".profile-back").click()
        expect(logged_in_page).to_have_url(re.compile(r"/account-books"))

    def test_logout(self, logged_in_page):
        """个人中心 - 确认退出登录应跳转到登录页并清除token"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        logged_in_page.get_by_text("退出登录").click()
        logged_in_page.get_by_role("button", name="确定").click()
        expect(logged_in_page).to_have_url(re.compile(r"/login"))
        token = logged_in_page.evaluate("() => localStorage.getItem('token')")
        assert token is None

    def test_cancel_logout(self, logged_in_page):
        """个人中心 - 取消退出登录应留在当前页面"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        logged_in_page.get_by_text("退出登录").click()
        logged_in_page.locator(".adm-dialog").get_by_text("取消").click()
        expect(logged_in_page).to_have_url(re.compile(r"/profile"))

    def test_default_currency_cny(self, logged_in_page):
        """个人中心 - 默认币种应显示CNY"""
        logged_in_page.goto(f"{BASE_URL}/profile")
        expect(logged_in_page.get_by_text("CNY")).to_be_visible()
