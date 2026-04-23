from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from decimal import Decimal
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError

from io import StringIO
from django.core.management import call_command, CommandError

from .models import (
    AuditLog,
    Drug,
    Institution,
    MonthlyIssue,
    NeedRow,
    PagePermission,
    Price,
    Role,
    UserPagePermissionOverride,
    UserProfile,
)

User = get_user_model()


class AuthAccessSmokeTests(APITestCase):
    def setUp(self):
        self.role = Role.objects.create(name="Оператор")
        
        PagePermission.objects.create(
            role=self.role,
            page_code="institutions",
            can_view=True,
        )

        PagePermission.objects.create(
            role=self.role,
            page_code="drugs",
            can_view=False,
        )

        PagePermission.objects.create(
            role=self.role,
            page_code="access_management",
            can_view=False,
            can_manage_access=False,
        )

        self.user = User.objects.create_user(
            username="operator",
            password="StrongPass123!",
            first_name="Ali",
            last_name="Valiyev",
        )
        UserProfile.objects.create(user=self.user, role=self.role)

        self.superuser = User.objects.create_superuser(
            username="root",
            password="RootPass123!",
            email="root@example.com",
        )

        Institution.objects.create(name="1-son muassasa", address="Toshkent")

    def test_login_returns_token_and_permissions(self):
        response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "operator")
        self.assertIn("institutions", response.data["user"]["permissions"])
        self.assertTrue(response.data["user"]["permissions"]["institutions"]["view"])

    def test_page_permission_is_checked_on_api_level(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        institutions_response = self.client.get(reverse("institutions-list"))
        drugs_response = self.client.get(reverse("drugs-list"))

        self.assertEqual(institutions_response.status_code, 200)
        self.assertEqual(drugs_response.status_code, 403)

    def test_access_management_is_available_for_superuser(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.get(reverse("access-roles-list"))
        self.assertEqual(response.status_code, 200)

    def test_access_management_is_forbidden_for_regular_user(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get(reverse("access-roles-list"))
        self.assertEqual(response.status_code, 403)

    def test_auth_me_returns_allowed_pages(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "operator")
        self.assertIn("allowed_pages", response.data)
        self.assertIn("institutions", response.data["allowed_pages"])
        self.assertNotIn("drugs", response.data["allowed_pages"])

    def test_user_override_has_priority_over_role_permission(self):
        UserPagePermissionOverride.objects.create(
            user=self.user,
            page_code="institutions",
            can_view=False,
        )
        UserPagePermissionOverride.objects.create(
            user=self.user,
            page_code="drugs",
            can_view=True,
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        me_response = self.client.get(reverse("auth-me"))
        institutions_response = self.client.get(reverse("institutions-list"))
        drugs_response = self.client.get(reverse("drugs-list"))

        self.assertEqual(me_response.status_code, 200)
        self.assertNotIn("institutions", me_response.data["allowed_pages"])
        self.assertIn("drugs", me_response.data["allowed_pages"])

        self.assertEqual(institutions_response.status_code, 403)
        self.assertEqual(drugs_response.status_code, 200)

    def test_monthly_issue_create_merges_and_blocks_over_need(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        drug = Drug.objects.create(
            name="Test dori",
            unit="dona",
            manufacturer="Test ishlab chiqaruvchi",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=Institution.objects.first(),
            drug=drug,
            year=2026,
            dpm_need=Decimal("6"),
            amb_rec_need=Decimal("4"),
        )

        response1 = self.client.post(
            reverse("monthly-issues-list"),
            {
                "institution": Institution.objects.first().id,
                "drug": drug.id,
                "year": 2026,
                "issued_qty": "3",
            },
            format="json",
        )

        response2 = self.client.post(
            reverse("monthly-issues-list"),
            {
                "institution": Institution.objects.first().id,
                "drug": drug.id,
                "year": 2026,
                "issued_qty": "2",
            },
            format="json",
        )

        self.assertEqual(response1.status_code, 201)
        self.assertEqual(response2.status_code, 201)

        issue = MonthlyIssue.objects.get(
            institution=Institution.objects.first(),
            drug=drug,
            year=2026,
        )

        self.assertEqual(MonthlyIssue.objects.filter(
            institution=Institution.objects.first(),
            drug=drug,
            year=2026,
        ).count(), 1)
        self.assertEqual(float(issue.issued_qty), 5.0)

        response3 = self.client.post(
            reverse("monthly-issues-list"),
            {
                "institution": Institution.objects.first().id,
                "drug": drug.id,
                "year": 2026,
                "issued_qty": "6",
            },
            format="json",
        )

        self.assertEqual(response3.status_code, 400)
        self.assertIn("issued_qty", response3.data)

    def test_need_row_delete_is_blocked_if_monthly_issue_exists(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Delete block dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        need_row = NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("8"),
            amb_rec_need=Decimal("2"),
        )

        MonthlyIssue.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            issued_qty=Decimal("3"),
        )

        response = self.client.delete(reverse("need-rows-detail", args=[need_row.id]))

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(NeedRow.objects.filter(id=need_row.id).exists())


    def test_new_institution_delete_is_blocked_if_need_row_exists(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.create(
            name="Delete block muassasa",
            address="Test address",
            is_active=True,
        )

        drug = Drug.objects.create(
            name="Delete block dori 2",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("5"),
            amb_rec_need=Decimal("5"),
        )

        response = self.client.delete(reverse("institutions-detail", args=[institution.id]))

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Institution.objects.filter(id=institution.id).exists())

    def test_first_institution_delete_is_blocked_if_need_row_exists(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Muassasa block dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("5"),
            amb_rec_need=Decimal("5"),
        )

        response = self.client.delete(
            reverse("institutions-detail", args=[institution.id])
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Institution.objects.filter(id=institution.id).exists())

    def test_drug_delete_is_blocked_if_need_row_exists(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Drug block test",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("7"),
            amb_rec_need=Decimal("3"),
        )

        response = self.client.delete(
            reverse("drugs-detail", args=[drug.id])
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Drug.objects.filter(id=drug.id).exists())

    def test_price_delete_is_allowed_even_if_need_row_and_monthly_issue_exist(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Price delete free drug",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("8"),
            amb_rec_need=Decimal("2"),
        )

        MonthlyIssue.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            issued_qty=Decimal("4"),
        )

        from .models import Price

        price = Price.objects.create(
            drug=drug,
            price=Decimal("12345"),
            start_date="2026-04-13",
            is_active=True,
        )

        response = self.client.delete(
            reverse("prices-detail", args=[price.id])
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Price.objects.filter(id=price.id).exists())
        self.assertTrue(NeedRow.objects.filter(institution=institution, drug=drug, year=2026).exists())
        self.assertTrue(MonthlyIssue.objects.filter(institution=institution, drug=drug, year=2026).exists())

    def test_need_row_list_uses_price_by_row_year_not_today(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Year based price drug",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2024,
            dpm_need=Decimal("6"),
            amb_rec_need=Decimal("4"),
        )

        from .models import Price

        Price.objects.create(
            drug=drug,
            price=Decimal("100"),
            start_date="2024-01-01",
            is_active=True,
        )
        Price.objects.create(
            drug=drug,
            price=Decimal("300"),
            start_date="2026-01-01",
            is_active=True,
        )

        response = self.client.get(reverse("need-rows-list"))

        self.assertEqual(response.status_code, 200)

        row = next(
            item for item in response.data
            if item["institution"] == institution.id
            and item["drug"] == drug.id
            and item["year"] == 2024
        )

        self.assertEqual(row["price"], 100.0)
        self.assertEqual(row["yearly_sum"], 1000.0)
        self.assertEqual(row["given_sum"], 0.0)
        self.assertEqual(row["remaining_sum"], 1000.0)

    def test_need_rows_and_summary_use_same_year_based_price_rule(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Summary price sync drug",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2024,
            dpm_need=Decimal("6"),
            amb_rec_need=Decimal("4"),
        )

        MonthlyIssue.objects.create(
            institution=institution,
            drug=drug,
            year=2024,
            issued_qty=Decimal("4"),
        )

        from .models import Price

        Price.objects.create(
            drug=drug,
            price=Decimal("100"),
            start_date="2024-01-01",
            is_active=True,
        )
        Price.objects.create(
            drug=drug,
            price=Decimal("300"),
            start_date="2026-01-01",
            is_active=True,
        )

        need_rows_response = self.client.get(reverse("need-rows-list"))
        summary_response = self.client.get(reverse("need-rows-summary"))

        self.assertEqual(need_rows_response.status_code, 200)
        self.assertEqual(summary_response.status_code, 200)

        need_row = next(
            item for item in need_rows_response.data
            if item["institution"] == institution.id
            and item["drug"] == drug.id
            and item["year"] == 2024
        )

        summary_row = next(
            item for item in summary_response.data
            if item["institution_id"] == institution.id
            and item["drug_id"] == drug.id
            and item["year"] == 2024
        )

        self.assertEqual(need_row["price"], summary_row["price"])
        self.assertEqual(need_row["yearly_sum"], summary_row["yearly_sum"])
        self.assertEqual(need_row["given_sum"], summary_row["given_sum"])
        self.assertEqual(need_row["remaining_sum"], summary_row["remaining_sum"])


    def test_need_row_create_auto_calculates_yearly_and_quarterly(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Auto calc dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        response = self.client.post(
            reverse("need-rows-list"),
            {
                "institution": institution.id,
                "drug": drug.id,
                "year": 2026,
                "dpm_need": "6",
                "amb_rec_need": "4",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        need_row = NeedRow.objects.get(
            institution=institution,
            drug=drug,
            year=2026,
        )

        self.assertEqual(float(need_row.yearly_need), 10.0)
        self.assertEqual(float(need_row.quarterly_need), 2.5)

    def test_need_row_duplicate_is_blocked(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Duplicate need row dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        response1 = self.client.post(
            reverse("need-rows-list"),
            {
                "institution": institution.id,
                "drug": drug.id,
                "year": 2026,
                "dpm_need": "5",
                "amb_rec_need": "5",
            },
            format="json",
        )

        response2 = self.client.post(
            reverse("need-rows-list"),
            {
                "institution": institution.id,
                "drug": drug.id,
                "year": 2026,
                "dpm_need": "1",
                "amb_rec_need": "1",
            },
            format="json",
        )

        self.assertEqual(response1.status_code, 201)
        self.assertEqual(response2.status_code, 400)
        self.assertEqual(
            NeedRow.objects.filter(
                institution=institution,
                drug=drug,
                year=2026,
            ).count(),
            1,
        )

    def test_need_row_negative_values_are_rejected(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Negative validation dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        response = self.client.post(
            reverse("need-rows-list"),
            {
                "institution": institution.id,
                "drug": drug.id,
                "year": 2026,
                "dpm_need": "-1",
                "amb_rec_need": "5",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("dpm_need", response.data)

    def test_monthly_issue_requires_existing_need_row(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()
        drug = Drug.objects.create(
            name="Need row required dori",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        response = self.client.post(
            reverse("monthly-issues-list"),
            {
                "institution": institution.id,
                "drug": drug.id,
                "year": 2026,
                "issued_qty": "3",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_add_permission_is_checked_on_api_level(self):
        PagePermission.objects.update_or_create(
            role=self.role,
            page_code="institutions",
            defaults={
                "can_view": True,
                "can_add": False,
                "can_edit": False,
                "can_delete": False,
            },
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.post(
            reverse("institutions-list"),
            {
                "name": "API add test muassasa",
                "address": "Toshkent",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_add_permission_allows_create_when_granted_by_override(self):
        PagePermission.objects.update_or_create(
            role=self.role,
            page_code="institutions",
            defaults={
                "can_view": True,
                "can_add": False,
                "can_edit": False,
                "can_delete": False,
            },
        )

        UserPagePermissionOverride.objects.create(
            user=self.user,
            page_code="institutions",
            can_add=True,
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.post(
            reverse("institutions-list"),
            {
                "name": "Override add test muassasa",
                "address": "Sergeli",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_edit_permission_is_checked_on_api_level(self):
        PagePermission.objects.update_or_create(
            role=self.role,
            page_code="institutions",
            defaults={
                "can_view": True,
                "can_add": False,
                "can_edit": False,
                "can_delete": False,
            },
        )

        institution = Institution.objects.first()

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.put(
            reverse("institutions-detail", args=[institution.id]),
            {
                "name": "Edited name",
                "address": institution.address,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_delete_permission_is_checked_on_api_level(self):
        PagePermission.objects.update_or_create(
            role=self.role,
            page_code="institutions",
            defaults={
                "can_view": True,
                "can_add": False,
                "can_edit": False,
                "can_delete": False,
            },
        )

        institution = Institution.objects.create(
            name="Delete permission test",
            address="Test address",
            is_active=True,
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.delete(
            reverse("institutions-detail", args=[institution.id])
        )

        self.assertEqual(response.status_code, 403)

    def test_manage_access_permission_is_checked_on_api_level(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get(reverse("access-roles-list"))
        self.assertEqual(response.status_code, 403)

    def test_manage_access_permission_allows_access_when_granted_by_override(self):
        UserPagePermissionOverride.objects.create(
            user=self.user,
            page_code="access_management",
            can_view=True,
            can_manage_access=True,
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.get(reverse("access-roles-list"))
        self.assertEqual(response.status_code, 200)

    def test_login_writes_audit_log(self):
        response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.user,
                action="login",
                target_type="Фойдаланувчи",
            ).exists()
        )

    def test_logout_writes_audit_log(self):
        login_response = self.client.post(
            reverse("auth-login"),
            {"username": "operator", "password": "StrongPass123!"},
            format="json",
        )
        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        response = self.client.post(reverse("auth-logout"), {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.user,
                action="logout",
                target_type="Фойдаланувчи",
            ).exists()
        )

    def test_institution_create_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post(
            reverse("institutions-list"),
            {
                "name": "Audit test muassasa",
                "address": "Audit address",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="create",
                target_type="Муассаса",
                description="Муассаса қўшилди.",
            ).exists()
        )

    def test_role_create_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post(
            reverse("access-roles-list"),
            {
                "name": "Audit role",
                "description": "Audit test role",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="create",
                target_type="Роль",
                description="Роль қўшилди.",
            ).exists()
        )

    def test_institution_update_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.first()

        response = self.client.put(
            reverse("institutions-detail", args=[institution.id]),
            {
                "name": "Updated audit institution",
                "address": "Updated address",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="update",
                target_type="Муассаса",
                description="Муассаса янгиланди.",
            ).exists()
        )

    def test_institution_delete_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        institution = Institution.objects.create(
            name="Delete audit institution",
            address="Delete audit address",
            is_active=True,
        )

        response = self.client.delete(
            reverse("institutions-detail", args=[institution.id])
        )

        self.assertEqual(response.status_code, 204)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="delete",
                target_type="Муассаса",
                description="Муассаса ўчирилди.",
            ).exists()
        )

    def test_admin_set_password_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post(
            reverse("access-users-set-password", args=[self.user.id]),
            {"new_password": "NewStrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="update",
                target_type="Фойдаланувчи пароли",
                description="Фойдаланувчи пароли админ томонидан янгиланди.",
            ).exists()
        )

    def test_user_deactivate_writes_specific_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.patch(
            reverse("access-users-detail", args=[self.user.id]),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="update",
                target_type="Фойдаланувчи",
                description="Фойдаланувчи нофаол қилинди.",
            ).exists()
        )

    def test_user_api_blocks_self_deactivation(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.patch(
            reverse("access-users-detail", args=[self.superuser.id]),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)

    def test_user_api_blocks_last_active_superuser_deactivation(self):
        UserPagePermissionOverride.objects.create(
            user=self.user,
            page_code="access_management",
            can_view=True,
            can_manage_access=True,
        )

        single_root = User.objects.create_superuser(
            username="single_root",
            password="StrongPass123!",
            email="single_root@example.com",
        )

        self.superuser.is_active = False
        self.superuser.save(update_fields=["is_active"])

        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.patch(
            reverse("access-users-detail", args=[single_root.id]),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

        single_root.refresh_from_db()
        self.assertTrue(single_root.is_active)


    def test_user_override_create_writes_audit_log(self):
        token = Token.objects.create(user=self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post(
            reverse("access-user-permission-overrides-list"),
            {
                "user": self.user.id,
                "page_code": "institutions",
                "can_view": True,
                "can_add": True,
                "can_edit": None,
                "can_delete": None,
                "can_export": None,
                "can_print": None,
                "can_manage_access": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            AuditLog.objects.filter(
                actor=self.superuser,
                action="create",
                target_type="Индивидуал override",
                description="Индивидуал override қўшилди.",
            ).exists()
        )

    def test_price_model_blocks_duplicate_drug_and_start_date_on_db_level(self):
        drug = Drug.objects.create(
            name="DB unique price drug",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        Price.objects.create(
            drug=drug,
            price=Decimal("1000"),
            start_date="2026-01-01",
            is_active=True,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Price.objects.create(
                    drug=drug,
                    price=Decimal("1200"),
                    start_date="2026-01-01",
                    is_active=True,
                )
        
    def test_drug_model_delete_is_protected_when_price_exists(self):
        drug = Drug.objects.create(
            name="Protected drug with price",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        Price.objects.create(
            drug=drug,
            price=Decimal("1000"),
            start_date="2026-01-01",
            is_active=True,
        )

        with self.assertRaises(ProtectedError):
            drug.delete()

    def test_institution_model_delete_is_protected_when_need_row_exists(self):
        institution = Institution.objects.create(
            name="Protected institution",
            address="Test address",
            is_active=True,
        )
        drug = Drug.objects.create(
            name="Protected institution drug",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        NeedRow.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            dpm_need=Decimal("5"),
            amb_rec_need=Decimal("5"),
        )

        with self.assertRaises(ProtectedError):
            institution.delete()

    def test_drug_model_delete_is_protected_when_monthly_issue_exists(self):
        institution = Institution.objects.create(
            name="Monthly issue institution",
            address="Test",
            is_active=True,
        )
        drug = Drug.objects.create(
            name="Protected drug with monthly issue",
            unit="dona",
            manufacturer="Test",
            is_active=True,
        )

        MonthlyIssue.objects.create(
            institution=institution,
            drug=drug,
            year=2026,
            issued_qty=Decimal("3"),
        )

        with self.assertRaises(ProtectedError):
            drug.delete()



class ManagementCommandsTests(APITestCase):
    def test_seed_roles_creates_default_roles_and_permissions(self):
        out = StringIO()
        call_command("seed_roles", stdout=out)

        self.assertTrue(Role.objects.filter(name="Админ").exists())
        self.assertTrue(Role.objects.filter(name="Оператор").exists())
        self.assertTrue(Role.objects.filter(name="Кузатувчи").exists())

        self.assertEqual(
            PagePermission.objects.filter(role__name="Админ").count(),
            9,
        )
        self.assertEqual(
            PagePermission.objects.filter(role__name="Оператор").count(),
            9,
        )
        self.assertEqual(
            PagePermission.objects.filter(role__name="Кузатувчи").count(),
            9,
        )

    def test_assign_role_updates_user_profile(self):
        role = Role.objects.create(name="Оператор", is_active=True)
        user = User.objects.create_user(
            username="cmd_user",
            password="StrongPass123!",
        )

        out = StringIO()
        call_command("assign_role", "cmd_user", "Оператор", stdout=out)

        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.role.name, "Оператор")

    def test_create_user_with_role_creates_user_and_profile(self):
        Role.objects.create(name="Кузатувчи", is_active=True)

        out = StringIO()
        call_command(
            "create_user_with_role",
            "viewer_cmd",
            "StrongPass123!",
            "Кузатувчи",
            "--first-name",
            "Test",
            "--last-name",
            "Viewer",
            stdout=out,
        )

        user = User.objects.get(username="viewer_cmd")
        self.assertEqual(user.first_name, "Test")
        self.assertEqual(user.last_name, "Viewer")

        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.role.name, "Кузатувчи")

    def test_bootstrap_system_creates_or_updates_admin_user(self):
        out = StringIO()

        call_command(
            "bootstrap_system",
            "boot_admin",
            "StrongPass123!",
            "--first-name",
            "Boot",
            "--last-name",
            "Admin",
            "--email",
            "boot@example.com",
            stdout=out,
        )

        self.assertTrue(Role.objects.filter(name="Админ").exists())

        user = User.objects.get(username="boot_admin")
        self.assertEqual(user.first_name, "Boot")
        self.assertEqual(user.last_name, "Admin")
        self.assertEqual(user.email, "boot@example.com")

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password("StrongPass123!"))

        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.role.name, "Админ")

        self.assertEqual(
            PagePermission.objects.filter(role__name="Админ").count(),
            9,
        )

    def test_reset_password_updates_user_password(self):
        user = User.objects.create_user(
            username="reset_user",
            password="OldPass123!",
        )

        out = StringIO()
        call_command(
            "reset_password",
            "reset_user",
            "NewPass123!",
            stdout=out,
        )

        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass123!"))

    def test_show_access_outputs_user_role_and_pages(self):
        role = Role.objects.create(name="Оператор", is_active=True)
        PagePermission.objects.create(
            role=role,
            page_code="dashboard",
            can_view=True,
        )
        user = User.objects.create_user(
            username="access_user",
            password="StrongPass123!",
        )
        UserProfile.objects.create(user=user, role=role)

        out = StringIO()
        call_command("show_access", "--username", "access_user", stdout=out)

        output = out.getvalue()
        self.assertIn("user: access_user", output)
        self.assertIn("role: Оператор", output)
        self.assertIn("dashboard", output)

    def test_seed_roles_sets_access_management_only_for_admin(self):
        out = StringIO()
        call_command("seed_roles", stdout=out)

        admin_perm = PagePermission.objects.get(
            role__name="Админ",
            page_code="access_management",
        )
        operator_perm = PagePermission.objects.get(
            role__name="Оператор",
            page_code="access_management",
        )
        viewer_perm = PagePermission.objects.get(
            role__name="Кузатувчи",
            page_code="access_management",
        )

        self.assertTrue(admin_perm.can_view)
        self.assertTrue(admin_perm.can_manage_access)

        self.assertFalse(operator_perm.can_view)
        self.assertFalse(operator_perm.can_manage_access)

        self.assertFalse(viewer_perm.can_view)
        self.assertFalse(viewer_perm.can_manage_access)

    def test_seed_roles_sets_view_only_for_viewer_prices(self):
        out = StringIO()
        call_command("seed_roles", stdout=out)

        perm = PagePermission.objects.get(
            role__name="Кузатувчи",
            page_code="prices",
        )

        self.assertTrue(perm.can_view)
        self.assertFalse(perm.can_add)
        self.assertFalse(perm.can_edit)
        self.assertFalse(perm.can_delete)
        self.assertFalse(perm.can_manage_access)

    def test_verify_system_outputs_ok_for_configured_system(self):
        out = StringIO()

        call_command("seed_roles", stdout=StringIO())
        call_command(
            "bootstrap_system",
            "verify_admin",
            "StrongPass123!",
            "--first-name",
            "Verify",
            "--last-name",
            "Admin",
            stdout=StringIO(),
        )

        call_command("verify_system", stdout=out)
        output = out.getvalue()

        self.assertIn("Текширув якунланди: OK", output)
        self.assertIn("Админ", output)
        self.assertIn("Оператор", output)
        self.assertIn("Кузатувчи", output)

    def test_set_user_active_can_deactivate_user(self):
        user = User.objects.create_user(
            username="status_user",
            password="StrongPass123!",
        )
        out = StringIO()

        call_command("set_user_active", "status_user", "inactive", stdout=out)

        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertIn("status_user -> inactive", out.getvalue())

    def test_set_user_active_can_activate_user(self):
        user = User.objects.create_user(
            username="inactive_user",
            password="StrongPass123!",
            is_active=False,
        )
        out = StringIO()

        call_command("set_user_active", "inactive_user", "active", stdout=out)

        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertIn("inactive_user -> active", out.getvalue())

    def test_set_user_active_blocks_last_superuser_deactivation(self):
        superuser = User.objects.create_superuser(
            username="single_admin",
            password="StrongPass123!",
            email="single_admin@example.com",
        )

        User.objects.filter(is_superuser=True).exclude(pk=superuser.pk).update(is_active=False)

        with self.assertRaises(CommandError):
            call_command(
                "set_user_active",
                "single_admin",
                "inactive",
                stdout=StringIO(),
            )

        superuser.refresh_from_db()
        self.assertTrue(superuser.is_active)

    def test_delete_user_safe_deletes_regular_user(self):
        user = User.objects.create_user(
            username="delete_me",
            password="StrongPass123!",
        )

        out = StringIO()
        call_command("delete_user_safe", "delete_me", stdout=out)

        self.assertFalse(User.objects.filter(username="delete_me").exists())
        self.assertIn("Фойдаланувчи ўчирилди: delete_me", out.getvalue())

    def test_delete_user_safe_blocks_last_active_superuser(self):
        superuser = User.objects.create_superuser(
            username="only_root",
            password="StrongPass123!",
            email="only_root@example.com",
        )

        User.objects.filter(is_superuser=True).exclude(pk=superuser.pk).update(is_active=False)

        with self.assertRaises(CommandError):
            call_command("delete_user_safe", "only_root", stdout=StringIO())

        self.assertTrue(User.objects.filter(username="only_root").exists())

    def test_standard_role_update_is_blocked_on_api_level(self):
        call_command("seed_roles", stdout=StringIO())

        admin_user = User.objects.create_superuser(
            username="role_api_admin_update",
            password="StrongPass123!",
            email="role_api_admin_update@example.com",
        )
        token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        role = Role.objects.get(name="Админ")

        response = self.client.patch(
            reverse("access-roles-detail", args=[role.id]),
            {"description": "Protected role edited"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)

        role.refresh_from_db()
        self.assertNotEqual(role.description, "Protected role edited")

    def test_standard_role_delete_is_blocked_on_api_level(self):
        call_command("seed_roles", stdout=StringIO())

        admin_user = User.objects.create_superuser(
            username="role_api_admin_delete",
            password="StrongPass123!",
            email="role_api_admin_delete@example.com",
        )
        token = Token.objects.create(user=admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        role = Role.objects.get(name="Кузатувчи")

        response = self.client.delete(
            reverse("access-roles-detail", args=[role.id])
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.data)
        self.assertTrue(Role.objects.filter(id=role.id).exists())