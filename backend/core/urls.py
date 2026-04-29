from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("health/", views.health_check, name="health-check"),

    path("auth/login/", views.LoginAPIView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutAPIView.as_view(), name="auth-logout"),
    path("auth/me/", views.CurrentUserAPIView.as_view(), name="auth-me"),
    path("auth/meta/", views.AccessMetaAPIView.as_view(), name="auth-meta"),
    path("auth/change-password/", views.SelfChangePasswordAPIView.as_view(), name="auth-change-password"),

    path("institutions/", views.InstitutionListCreateAPIView.as_view(), name="institutions-list"),
    path("institutions/<int:pk>/", views.InstitutionDetailAPIView.as_view(), name="institutions-detail"),

    path("drugs/", views.DrugListCreateAPIView.as_view(), name="drugs-list"),
    path("drugs/<int:pk>/", views.DrugDetailAPIView.as_view(), name="drugs-detail"),

    path("prices/", views.PriceListCreateAPIView.as_view(), name="prices-list"),
    path("prices/<int:pk>/", views.PriceDetailAPIView.as_view(), name="prices-detail"),

    path("monthly-issues/", views.MonthlyIssueListCreateAPIView.as_view(), name="monthly-issues-list"),
    path("monthly-issues/<int:pk>/", views.MonthlyIssueDetailAPIView.as_view(), name="monthly-issues-detail"),

    path("need-rows/", views.NeedRowListCreateAPIView.as_view(), name="need-rows-list"),
    path("need-rows/<int:pk>/", views.NeedRowDetailAPIView.as_view(), name="need-rows-detail"),

    path("stock-summary/", views.StockSummaryAPIView.as_view(), name="stock-summary"),
    path("dashboard-summary/", views.DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
    path("need-rows-summary/", views.NeedRowSummaryAPIView.as_view(), name="need-rows-summary"),

    path("access/roles/", views.RoleListCreateAPIView.as_view(), name="access-roles-list"),
    path("access/roles/<int:pk>/", views.RoleDetailAPIView.as_view(), name="access-roles-detail"),

    path("access/users/", views.ManagedUserListCreateAPIView.as_view(), name="access-users-list"),
    path("access/users/<int:pk>/", views.ManagedUserDetailAPIView.as_view(), name="access-users-detail"),
    path("access/users/<int:pk>/set-password/", views.AdminSetPasswordAPIView.as_view(), name="access-users-set-password"),

    path("access/page-permissions/", views.PagePermissionListCreateAPIView.as_view(), name="access-page-permissions-list"),
    path("access/page-permissions/<int:pk>/", views.PagePermissionDetailAPIView.as_view(), name="access-page-permissions-detail"),

    path("access/user-permission-overrides/", views.UserPermissionOverrideListCreateAPIView.as_view(), name="access-user-permission-overrides-list"),
    path("access/user-permission-overrides/<int:pk>/", views.UserPermissionOverrideDetailAPIView.as_view(), name="access-user-permission-overrides-detail"),
]
