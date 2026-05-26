"""认证模块测试 - 登录 / 注册 / 路由守卫"""
import time
import re
import pytest
from playwright.sync_api import expect
from conftest import BASE_URL, ensure_test_user


class TestLogin:
    """登录页面"""

    def test_render_login_page(self, page):
        """登录页 - 应正确渲染页面元素"""
        page.goto(f"{BASE_URL}/login")
        expect(page.locator("h1").filter(has_text="旅行记账")).to_be_visible()
        expect(page.get_by_text("记录每一次旅行的美好")).to_be_visible()
        expect(page.get_by_placeholder("邮箱或手机号")).to_be_visible()
        expect(page.get_by_placeholder("请输入密码")).to_be_visible()
        expect(page.get_by_role("button", name="登录")).to_be_visible()

    def test_empty_account_shows_error(self, page):
        """登录页 - 账号为空时应提示必填"""
        page.goto(f"{BASE_URL}/login")
        page.get_by_role("button", name="登录").click()
        expect(page.get_by_text("请输入邮箱或手机号")).to_be_visible()

    def test_empty_password_shows_error(self, page):
        """登录页 - 密码为空时应提示必填"""
        page.goto(f"{BASE_URL}/login")
        page.get_by_placeholder("邮箱或手机号").fill("test@example.com")
        page.get_by_role("button", name="登录").click()
        expect(page.get_by_text("请输入密码")).to_be_visible()

    def test_wrong_password_shows_toast(self, page):
        """登录页 - 错误密码应提示登录失败"""
        _, _, email = ensure_test_user()
        page.goto(f"{BASE_URL}/login")
        page.get_by_placeholder("邮箱或手机号").fill(email)
        page.get_by_placeholder("请输入密码").fill("WrongPassword")
        page.get_by_role("button", name="登录").click()
        expect(page.locator(".adm-toast-wrap").first).to_be_visible(timeout=5000)

    def test_correct_login_redirects(self, page):
        """登录页 - 正确凭据应登录成功并跳转到账本列表"""
        _, _, email = ensure_test_user()
        page.goto(f"{BASE_URL}/login")
        page.get_by_placeholder("邮箱或手机号").fill(email)
        page.get_by_placeholder("请输入密码").fill("Pytest123")
        page.get_by_role("button", name="登录").click()
        expect(page).to_have_url(re.compile(r"/account-books"), timeout=10000)
        token = page.evaluate("() => localStorage.getItem('token')")
        assert token is not None

    def test_click_register_link(self, page):
        """登录页 - 点击注册按钮应跳转到注册页"""
        page.goto(f"{BASE_URL}/login")
        page.get_by_role("button", name="注册").click()
        expect(page).to_have_url(re.compile(r"/register"))


class TestRegister:
    """注册页面"""

    def test_render_register_page(self, page):
        """注册页 - 应正确渲染页面元素"""
        page.goto(f"{BASE_URL}/register")
        expect(page.locator(".adm-nav-bar-title")).to_contain_text("注册")
        expect(page.get_by_placeholder("请输入昵称")).to_be_visible()
        expect(page.get_by_placeholder("请输入邮箱")).to_be_visible()
        expect(page.get_by_placeholder("请输入密码")).to_be_visible()
        expect(page.get_by_placeholder("请再次输入密码")).to_be_visible()

    def test_empty_nickname_shows_error(self, page):
        """注册页 - 昵称为空时应提示必填"""
        page.goto(f"{BASE_URL}/register")
        page.get_by_role("button", name="注册").click()
        expect(page.get_by_text("请输入昵称")).to_be_visible()

    def test_password_mismatch_shows_error(self, page):
        """注册页 - 两次密码不一致应提示错误"""
        page.goto(f"{BASE_URL}/register")
        page.get_by_placeholder("请输入昵称").fill("测试")
        page.get_by_placeholder("请输入邮箱").fill(f"mm_{int(time.time())}@test.com")
        page.get_by_placeholder("请输入密码").fill("Password1")
        page.get_by_placeholder("请再次输入密码").fill("Password2")
        page.get_by_role("button", name="注册").click()
        expect(page.get_by_text("两次密码输入不一致")).to_be_visible()

    def test_successful_register(self, page):
        """注册页 - 正确填写应注册成功并跳转到账本列表"""
        page.goto(f"{BASE_URL}/register")
        page.get_by_placeholder("请输入昵称").fill("新用户")
        page.get_by_placeholder("请输入邮箱").fill(f"reg_{int(time.time())}@test.com")
        page.get_by_placeholder("请输入密码").fill("NewUser123")
        page.get_by_placeholder("请再次输入密码").fill("NewUser123")
        page.get_by_role("button", name="注册").click()
        expect(page.get_by_text("注册成功")).to_be_visible(timeout=5000)
        expect(page).to_have_url(re.compile(r"/account-books"), timeout=10000)

    def test_duplicate_email_shows_error(self, page):
        """注册页 - 重复邮箱注册应提示失败"""
        _, _, email = ensure_test_user()
        page.goto(f"{BASE_URL}/register")
        page.get_by_placeholder("请输入昵称").fill("重复用户")
        page.get_by_placeholder("请输入邮箱").fill(email)
        page.get_by_placeholder("请输入密码").fill("Pytest123")
        page.get_by_placeholder("请再次输入密码").fill("Pytest123")
        page.get_by_role("button", name="注册").click()
        expect(page.locator(".adm-toast-wrap").first).to_be_visible(timeout=5000)


class TestRouteGuard:
    """路由守卫"""

    def test_redirect_account_books(self, page):
        """路由守卫 - 未登录访问账本列表应重定向到登录页"""
        page.goto(f"{BASE_URL}/account-books")
        expect(page).to_have_url(re.compile(r"/login"))

    def test_redirect_book_detail(self, page):
        """路由守卫 - 未登录访问账本详情应重定向到登录页"""
        page.goto(f"{BASE_URL}/account-books/1")
        expect(page).to_have_url(re.compile(r"/login"))

    def test_redirect_profile(self, page):
        """路由守卫 - 未登录访问个人中心应重定向到登录页"""
        page.goto(f"{BASE_URL}/profile")
        expect(page).to_have_url(re.compile(r"/login"))
