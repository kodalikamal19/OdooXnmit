from django.urls import path
from apps.authentication.views import (
    CompanySignUpView, LoginView, TokenRefreshView, ChangePasswordView, MeView,
)

urlpatterns = [
    path("signup/", CompanySignUpView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("me/", MeView.as_view(), name="me"),
]
