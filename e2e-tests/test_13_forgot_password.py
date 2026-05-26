"""忘记密码模块测试"""
import pytest
import requests
import time

BASE_URL = "http://localhost:3000/api"


class TestForgotPassword:
    """忘记密码功能测试"""

    def test_邮箱直接重置密码成功(self, auth):
        """AUTH-009: 通过邮箱直接重置密码"""
        # 先用已知邮箱重置密码
        email = "pytest@test.com"
        new_password = "newpass123"
        resp = requests.post(
            f"{BASE_URL}/auth/reset-password-direct",
            json={"email": email, "newPassword": new_password},
        )
        data = resp.json()
        assert data["code"] == 200
        assert data["message"] == "密码重置成功"

        # 用新密码登录验证
        resp2 = requests.post(
            f"{BASE_URL}/auth/login",
            json={"account": email, "password": new_password},
        )
        data2 = resp2.json()
        assert data2["code"] == 200
        assert "token" in data2["data"]

        # 改回原密码
        requests.post(
            f"{BASE_URL}/auth/reset-password-direct",
            json={"email": email, "newPassword": "test123456"},
        )

    def test_未注册邮箱重置密码失败(self):
        """AUTH-010: 未注册邮箱重置密码应失败"""
        resp = requests.post(
            f"{BASE_URL}/auth/reset-password-direct",
            json={"email": "nonexist@test.com", "newPassword": "newpass123"},
        )
        data = resp.json()
        assert data["code"] == 400
        assert "未注册" in data["message"]

    def test_密码长度不足6位重置失败(self):
        """AUTH-011: 密码长度不足6位应失败"""
        resp = requests.post(
            f"{BASE_URL}/auth/reset-password-direct",
            json={"email": "pytest@test.com", "newPassword": "123"},
        )
        data = resp.json()
        assert data["code"] == 400

    def test_缺少参数重置失败(self):
        """AUTH-011b: 缺少必要参数应失败"""
        resp = requests.post(
            f"{BASE_URL}/auth/reset-password-direct",
            json={"email": "pytest@test.com"},
        )
        data = resp.json()
        assert data["code"] == 400

    def test_忘记密码弹窗UI(self, page, auth):
        """AUTH-012: 忘记密码弹窗正常弹出和关闭"""
        page.goto("http://localhost:5173/login")
        page.wait_for_timeout(1000)

        # 点击忘记密码
        page.click("text=忘记密码")
        page.wait_for_timeout(500)

        # 验证弹窗出现
        assert page.locator("text=重置密码").is_visible()
        assert page.locator("text=确认重置").is_visible()

        # 验证输入框存在
        assert page.locator('input[placeholder="注册邮箱"]').is_visible()
        assert page.locator('input[placeholder*="新密码"]').first.is_visible()
