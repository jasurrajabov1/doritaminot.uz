# PROJECT_STRUCTURE

Автомат янгиланган структура файли.

```text
pharm_demand_system/
├─ backend/
│  ├─ config/
│  │  ├─ __init__.py
│  │  ├─ asgi.py
│  │  ├─ settings.py
│  │  ├─ urls.py
│  │  └─ wsgi.py
│  ├─ core/
│  │  ├─ management/
│  │  │  ├─ commands/
│  │  │  │  ├─ __init__.py
│  │  │  │  ├─ assign_role.py
│  │  │  │  ├─ bootstrap_system.py
│  │  │  │  ├─ create_user_with_role.py
│  │  │  │  ├─ delete_user_safe.py
│  │  │  │  ├─ reset_password.py
│  │  │  │  ├─ seed_drug_options.py
│  │  │  │  ├─ seed_roles.py
│  │  │  │  ├─ set_user_active.py
│  │  │  │  ├─ show_access.py
│  │  │  │  └─ verify_system.py
│  │  │  └─ __init__.py
│  │  ├─ migrations/
│  │  │  ├─ 0001_initial.py
│  │  │  ├─ 0002_drug_manufacturer_drug_price.py
│  │  │  ├─ 0003_demand_demanditem_and_more.py
│  │  │  ├─ 0004_annuallimit_monthlyissue_price.py
│  │  │  ├─ 0005_needrow.py
│  │  │  ├─ 0006_needrow_remaining_percent.py
│  │  │  ├─ 0007_price_base_price_price_referent_price_15_and_more.py
│  │  │  ├─ 0008_remove_price_end_date.py
│  │  │  ├─ 0009_alter_annuallimit_options_alter_drug_options_and_more.py
│  │  │  ├─ 0010_remove_drug_price.py
│  │  │  ├─ 0011_remove_annuallimit_drug_and_more.py
│  │  │  ├─ 0012_auth_access_system.py
│  │  │  ├─ 0013_auditlog.py
│  │  │  ├─ 0014_price_unique_price_drug_start_date.py
│  │  │  ├─ 0015_alter_monthlyissue_drug_and_more.py
│  │  │  ├─ 0016_userprofile_must_change_password_and_more.py
│  │  │  ├─ 0017_alter_needrow_drug.py
│  │  │  ├─ 0018_institution_inn_and_more.py
│  │  │  ├─ 0019_needaddition.py
│  │  │  ├─ 0020_remove_needaddition_needaddition_added_qty_gt_zero_and_more.py
│  │  │  ├─ 0021_alter_drug_options_drug_dosage_form_drug_dosage_unit_and_more.py
│  │  │  ├─ 0022_drugoption.py
│  │  │  ├─ 0023_drug_control_group.py
│  │  │  └─ __init__.py
│  │  ├─ __init__.py
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ constants.py
│  │  ├─ drug_normalizer.py
│  │  ├─ drug_option_api.py
│  │  ├─ excel_import.py
│  │  ├─ excel_import_api.py
│  │  ├─ excel_need_matrix_api.py
│  │  ├─ excel_need_matrix_import.py
│  │  ├─ models.py
│  │  ├─ need_addition_api.py
│  │  ├─ need_addition_utils.py
│  │  ├─ permissions.py
│  │  ├─ price_utils.py
│  │  ├─ serializers.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  ├─ views.py
│  │  └─ views_before_summary_total_need_fix_2026_05_10.py
│  ├─ manual_backups/
│  │  ├─ db_backup_2026_05_11_16_34.sqlite3
│  │  ├─ db_backup_after_access_check_final_2026_05_09.sqlite3
│  │  ├─ db_backup_after_clean_2026_04_26.sqlite3
│  │  ├─ db_backup_after_dashboard_inn_final_2026_05_09.sqlite3
│  │  ├─ db_backup_after_dashboard_summary_ok_2026_04_27.sqlite3
│  │  ├─ db_backup_after_final_manual_clean_2026_05_04.sqlite3
│  │  ├─ db_backup_after_final_rbac_smoke_2026_04_29.sqlite3
│  │  ├─ db_backup_after_frontend_polish_ok_2026_05_03.sqlite3
│  │  ├─ db_backup_after_institution_inn_2026_05_07.sqlite3
│  │  ├─ db_backup_after_monthly_issues_inn_final_2026_05_07.sqlite3
│  │  ├─ db_backup_after_need_additions_final_2026_05_10.sqlite3
│  │  ├─ db_backup_after_need_rows_inn_final_2026_05_07.sqlite3
│  │  ├─ db_backup_after_operator_smoke_ok_2026_04_29.sqlite3
│  │  ├─ db_backup_after_price_drug_seed_fix_2026_05_01.sqlite3
│  │  ├─ db_backup_after_rbac_ok_2026_04_26.sqlite3
│  │  ├─ db_backup_after_requirements_tests_ok_2026_05_01.sqlite3
│  │  ├─ db_backup_after_stock_summary_inn_final_2026_05_09.sqlite3
│  │  ├─ db_backup_after_test_view_clean_2026_04_28.sqlite3
│  │  ├─ db_backup_before_audit_logs_2026_05_01.sqlite3
│  │  ├─ db_backup_before_dashboard_inn_2026_05_09.sqlite3
│  │  ├─ db_backup_before_final_fix_2026_05_01.sqlite3
│  │  ├─ db_backup_before_institution_inn_2026_05_06.sqlite3
│  │  ├─ db_backup_before_monthly_issues_inn_2026_05_07.sqlite3
│  │  ├─ db_backup_before_need_addition_fix_2026_05_11_02_39.sqlite3
│  │  ├─ db_backup_before_need_additions_2026_05_09.sqlite3
│  │  ├─ db_backup_before_need_rows_inn_2026_05_07.sqlite3
│  │  ├─ db_backup_before_need_rows_summary_inn_2026_05_09.sqlite3
│  │  ├─ db_backup_before_stock_summary_inn_2026_05_09.sqlite3
│  │  ├─ db_backup_before_validation_smoke_2026_05_11_04_47.sqlite3
│  │  ├─ db_backup_final_inn_all_pages_2026_05_09.sqlite3
│  │  ├─ db_backup_final_verified_2026_05_11_01_51.sqlite3
│  │  ├─ db_backup_release_2026_05_05.sqlite3
│  │  ├─ db_backup_release_2026_05_06.sqlite3
│  │  ├─ models_before_need_addition_fix_2026_05_11_02_39.py
│  │  ├─ serializers_before_need_addition_fix_2026_05_11_02_39.py
│  │  ├─ serializers_before_stage2_2026_05_11_03_00.py
│  │  ├─ urls_before_stage3_2026_05_11_03_11.py
│  │  ├─ views_backup_dashboard_summary_2026_04_26.py
│  │  ├─ views_before_need_addition_fix_2026_05_11_02_39.py
│  │  ├─ views_before_stage3_2026_05_11_03_11.py
│  │  └─ views_before_stock_summary_sum_fix_2026_05_11_15_26.py.bak
│  ├─ staticfiles/
│  │  ├─ admin/
│  │  │  ├─ css/
│  │  │  │  ├─ vendor/
│  │  │  │  │  └─ select2/
│  │  │  │  │     ├─ LICENSE-SELECT2.md
│  │  │  │  │     ├─ select2.css
│  │  │  │  │     └─ select2.min.css
│  │  │  │  ├─ autocomplete.css
│  │  │  │  ├─ base.css
│  │  │  │  ├─ changelists.css
│  │  │  │  ├─ dark_mode.css
│  │  │  │  ├─ dashboard.css
│  │  │  │  ├─ forms.css
│  │  │  │  ├─ login.css
│  │  │  │  ├─ nav_sidebar.css
│  │  │  │  ├─ responsive.css
│  │  │  │  ├─ responsive_rtl.css
│  │  │  │  ├─ rtl.css
│  │  │  │  ├─ unusable_password_field.css
│  │  │  │  └─ widgets.css
│  │  │  ├─ img/
│  │  │  │  ├─ calendar-icons.svg
│  │  │  │  ├─ icon-addlink.svg
│  │  │  │  ├─ icon-alert-dark.svg
│  │  │  │  ├─ icon-alert.svg
│  │  │  │  ├─ icon-calendar.svg
│  │  │  │  ├─ icon-changelink.svg
│  │  │  │  ├─ icon-clock.svg
│  │  │  │  ├─ icon-debug-dark.svg
│  │  │  │  ├─ icon-debug.svg
│  │  │  │  ├─ icon-deletelink.svg
│  │  │  │  ├─ icon-hidelink.svg
│  │  │  │  ├─ icon-info-dark.svg
│  │  │  │  ├─ icon-info.svg
│  │  │  │  ├─ icon-no-dark.svg
│  │  │  │  ├─ icon-no.svg
│  │  │  │  ├─ icon-unknown-alt.svg
│  │  │  │  ├─ icon-unknown.svg
│  │  │  │  ├─ icon-viewlink.svg
│  │  │  │  ├─ icon-yes-dark.svg
│  │  │  │  ├─ icon-yes.svg
│  │  │  │  ├─ inline-delete.svg
│  │  │  │  ├─ README.md
│  │  │  │  ├─ search.svg
│  │  │  │  ├─ selector-icons.svg
│  │  │  │  ├─ sorting-icons.svg
│  │  │  │  ├─ tooltag-add.svg
│  │  │  │  └─ tooltag-arrowright.svg
│  │  │  └─ js/
│  │  │     ├─ admin/
│  │  │     │  ├─ DateTimeShortcuts.js
│  │  │     │  └─ RelatedObjectLookups.js
│  │  │     ├─ vendor/
│  │  │     │  ├─ jquery/
│  │  │     │  │  ├─ jquery.js
│  │  │     │  │  ├─ jquery.min.js
│  │  │     │  │  └─ LICENSE.txt
│  │  │     │  ├─ select2/
│  │  │     │  │  ├─ i18n/
│  │  │     │  │  │  ├─ af.js
│  │  │     │  │  │  ├─ ar.js
│  │  │     │  │  │  ├─ az.js
│  │  │     │  │  │  ├─ bg.js
│  │  │     │  │  │  ├─ bn.js
│  │  │     │  │  │  ├─ bs.js
│  │  │     │  │  │  ├─ ca.js
│  │  │     │  │  │  ├─ cs.js
│  │  │     │  │  │  ├─ da.js
│  │  │     │  │  │  ├─ de.js
│  │  │     │  │  │  ├─ dsb.js
│  │  │     │  │  │  ├─ el.js
│  │  │     │  │  │  ├─ en.js
│  │  │     │  │  │  ├─ es.js
│  │  │     │  │  │  ├─ et.js
│  │  │     │  │  │  ├─ eu.js
│  │  │     │  │  │  ├─ fa.js
│  │  │     │  │  │  ├─ fi.js
│  │  │     │  │  │  ├─ fr.js
│  │  │     │  │  │  ├─ gl.js
│  │  │     │  │  │  ├─ he.js
│  │  │     │  │  │  ├─ hi.js
│  │  │     │  │  │  ├─ hr.js
│  │  │     │  │  │  ├─ hsb.js
│  │  │     │  │  │  ├─ hu.js
│  │  │     │  │  │  ├─ hy.js
│  │  │     │  │  │  ├─ id.js
│  │  │     │  │  │  ├─ is.js
│  │  │     │  │  │  ├─ it.js
│  │  │     │  │  │  ├─ ja.js
│  │  │     │  │  │  ├─ ka.js
│  │  │     │  │  │  ├─ km.js
│  │  │     │  │  │  ├─ ko.js
│  │  │     │  │  │  ├─ lt.js
│  │  │     │  │  │  ├─ lv.js
│  │  │     │  │  │  ├─ mk.js
│  │  │     │  │  │  ├─ ms.js
│  │  │     │  │  │  ├─ nb.js
│  │  │     │  │  │  ├─ ne.js
│  │  │     │  │  │  ├─ nl.js
│  │  │     │  │  │  ├─ pl.js
│  │  │     │  │  │  ├─ ps.js
│  │  │     │  │  │  ├─ pt-BR.js
│  │  │     │  │  │  ├─ pt.js
│  │  │     │  │  │  ├─ ro.js
│  │  │     │  │  │  ├─ ru.js
│  │  │     │  │  │  ├─ sk.js
│  │  │     │  │  │  ├─ sl.js
│  │  │     │  │  │  ├─ sq.js
│  │  │     │  │  │  ├─ sr-Cyrl.js
│  │  │     │  │  │  ├─ sr.js
│  │  │     │  │  │  ├─ sv.js
│  │  │     │  │  │  ├─ th.js
│  │  │     │  │  │  ├─ tk.js
│  │  │     │  │  │  ├─ tr.js
│  │  │     │  │  │  ├─ uk.js
│  │  │     │  │  │  ├─ vi.js
│  │  │     │  │  │  ├─ zh-CN.js
│  │  │     │  │  │  └─ zh-TW.js
│  │  │     │  │  ├─ LICENSE.md
│  │  │     │  │  ├─ select2.full.js
│  │  │     │  │  └─ select2.full.min.js
│  │  │     │  └─ xregexp/
│  │  │     │     ├─ LICENSE.txt
│  │  │     │     ├─ xregexp.js
│  │  │     │     └─ xregexp.min.js
│  │  │     ├─ actions.js
│  │  │     ├─ autocomplete.js
│  │  │     ├─ calendar.js
│  │  │     ├─ cancel.js
│  │  │     ├─ change_form.js
│  │  │     ├─ core.js
│  │  │     ├─ filters.js
│  │  │     ├─ inlines.js
│  │  │     ├─ jquery.init.js
│  │  │     ├─ nav_sidebar.js
│  │  │     ├─ popup_response.js
│  │  │     ├─ prepopulate.js
│  │  │     ├─ prepopulate_init.js
│  │  │     ├─ SelectBox.js
│  │  │     ├─ SelectFilter2.js
│  │  │     ├─ theme.js
│  │  │     └─ urlify.js
│  │  └─ rest_framework/
│  │     ├─ css/
│  │     │  ├─ bootstrap-theme.min.css
│  │     │  ├─ bootstrap-theme.min.css.map
│  │     │  ├─ bootstrap-tweaks.css
│  │     │  ├─ bootstrap.min.css
│  │     │  ├─ bootstrap.min.css.map
│  │     │  ├─ default.css
│  │     │  ├─ font-awesome-4.0.3.css
│  │     │  └─ prettify.css
│  │     ├─ docs/
│  │     │  ├─ css/
│  │     │  │  ├─ base.css
│  │     │  │  ├─ highlight.css
│  │     │  │  └─ jquery.json-view.min.css
│  │     │  ├─ img/
│  │     │  │  ├─ favicon.ico
│  │     │  │  └─ grid.png
│  │     │  └─ js/
│  │     │     ├─ api.js
│  │     │     ├─ highlight.pack.js
│  │     │     └─ jquery.json-view.min.js
│  │     ├─ fonts/
│  │     │  ├─ fontawesome-webfont.eot
│  │     │  ├─ fontawesome-webfont.svg
│  │     │  ├─ fontawesome-webfont.ttf
│  │     │  ├─ fontawesome-webfont.woff
│  │     │  ├─ glyphicons-halflings-regular.eot
│  │     │  ├─ glyphicons-halflings-regular.svg
│  │     │  ├─ glyphicons-halflings-regular.ttf
│  │     │  ├─ glyphicons-halflings-regular.woff
│  │     │  └─ glyphicons-halflings-regular.woff2
│  │     ├─ img/
│  │     │  ├─ glyphicons-halflings-white.png
│  │     │  ├─ glyphicons-halflings.png
│  │     │  └─ grid.png
│  │     └─ js/
│  │        ├─ ajax-form.js
│  │        ├─ bootstrap.min.js
│  │        ├─ coreapi-0.1.1.js
│  │        ├─ csrf.js
│  │        ├─ default.js
│  │        ├─ jquery-3.7.1.min.js
│  │        ├─ load-ajax-form.js
│  │        └─ prettify-min.js
│  ├─ .env
│  ├─ .env.example
│  ├─ .env.server.example
│  ├─ deploy_check.txt
│  ├─ manage.py
│  ├─ patch_dashboard_summary.py
│  ├─ requirements.txt
│  ├─ tmp_seed_drug_measure_units.py
│  ├─ tmp_tz_db_smoke.py
│  └─ tmp_tz_db_smoke_direct.py
├─ frontend/
│  ├─ manual_backups/
│  │  ├─ NeedRowsPage_before_final_utf8_replace_2026_05_11_04_01.jsx.bak
│  │  ├─ NeedRowsPage_before_stage12_export_print_2026_05_11_05_53.jsx.bak
│  │  ├─ NeedRowsPage_before_stage4_2026_05_11_03_21.jsx.bak
│  │  ├─ NeedRowsPage_before_stage4_fix1_2026_05_11_03_34.jsx.bak
│  │  ├─ NeedRowsPage_before_stage5_columns_2026_05_11_04_17.jsx.bak
│  │  ├─ NeedRowsPage_before_stage6_history_columns_2026_05_11_04_31.jsx.bak
│  │  ├─ NeedRowsPage_mojibake_before_fix_2026_05_11_03_54.jsx.bak
│  │  ├─ NeedRowsSummaryPage_before_stage10_collapsed_columns_2026_05_11_05_34.jsx.bak
│  │  ├─ NeedRowsSummaryPage_before_stage9_columns_2026_05_11_05_20.jsx.bak
│  │  └─ StockSummaryPage_before_stage11_columns_2026_05_11_05_43.jsx.bak
│  ├─ public/
│  │  └─ vite.svg
│  ├─ src/
│  │  ├─ api/
│  │  │  └─ client.js
│  │  ├─ assets/
│  │  │  └─ react.svg
│  │  ├─ pages/
│  │  │  ├─ access-management/
│  │  │  │  ├─ AccessManagementTop.jsx
│  │  │  │  ├─ AccessUi.jsx
│  │  │  │  ├─ helpers.js
│  │  │  │  ├─ OverridesSection.jsx
│  │  │  │  ├─ PermissionsSection.jsx
│  │  │  │  ├─ RolesSection.jsx
│  │  │  │  ├─ styles.js
│  │  │  │  ├─ useAccessManagementData.js
│  │  │  │  ├─ useOverrideActions.js
│  │  │  │  ├─ usePermissionActions.js
│  │  │  │  ├─ useRoleActions.js
│  │  │  │  ├─ UsersSection.jsx
│  │  │  │  └─ useUserActions.js
│  │  │  ├─ AccessDeniedPage.jsx
│  │  │  ├─ AccessManagementPage.jsx
│  │  │  ├─ DashboardPage.jsx
│  │  │  ├─ DashboardPage_before_total_need_label_fix_2026_05_10.jsx
│  │  │  ├─ DrugOptionsPage.jsx
│  │  │  ├─ DrugsPage.jsx
│  │  │  ├─ ExcelImportPage.jsx
│  │  │  ├─ InstitutionsPage.jsx
│  │  │  ├─ LoginPage.jsx
│  │  │  ├─ MonthlyIssuesPage.jsx
│  │  │  ├─ MonthlyIssuesPage_before_total_need_fix.jsx
│  │  │  ├─ MustChangePasswordPage.jsx
│  │  │  ├─ NeedRowsPage.jsx
│  │  │  ├─ NeedRowsSummaryPage.jsx
│  │  │  ├─ NeedRowsSummaryPage_before_total_need_fix_2026_05_10.jsx
│  │  │  ├─ NotFoundPage.jsx
│  │  │  ├─ pageRegistry.js
│  │  │  ├─ PricesPage.jsx
│  │  │  ├─ StockSummaryPage.jsx
│  │  │  └─ StockSummaryPage_before_total_need_fix_2026_05_10.jsx
│  │  ├─ routes/
│  │  │  ├─ MenuLink.jsx
│  │  │  ├─ ProtectedRoute.jsx
│  │  │  ├─ PublicOnlyRoute.jsx
│  │  │  └─ routeHelpers.js
│  │  ├─ utils/
│  │  │  ├─ drugLabel.js
│  │  │  └─ permission.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ .env
│  ├─ .env.example
│  ├─ .env.local
│  ├─ .env.production
│  ├─ .gitignore
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ README.md
│  ├─ tmp_fix_needrows_encoding.py
│  ├─ tmp_patch_needrows_stage4_fix1.py
│  ├─ tmp_patch_summary_columns_collapsed.py
│  └─ vite.config.js
├─ logs/
│  ├─ check_2026_04_28_16_04_15.txt
│  ├─ final_acceptance_2026_05_17_02_15.txt
│  ├─ final_acceptance_clean_2026_05_17_02_37.txt
│  ├─ tz_acceptance_final_2026_05_16_17_49.txt
│  ├─ tz_acceptance_resume_2026_05_16_17_15.txt
│  ├─ tz_acceptance_resume_2026_05_16_17_17.txt
│  ├─ tz_acceptance_resume_2026_05_16_17_19.txt
│  ├─ tz_acceptance_resume_2026_05_16_17_21.txt
│  └─ tz_acceptance_smoke_2026_05_16_17_10.txt
├─ manual_backups/
│  ├─ checkpoint_needrows_speed_ui_2026_05_17_10_10/
│  │  ├─ App.css.bak
│  │  ├─ db.sqlite3.bak
│  │  ├─ ExcelImportPage.jsx.bak
│  │  ├─ MonthlyIssuesPage.jsx.bak
│  │  ├─ NeedRowsPage.jsx.bak
│  │  ├─ serializers.py.bak
│  │  ├─ urls.py.bak
│  │  └─ views.py.bak
│  ├─ drugs_page_lint_fix_2026_05_16_17_41/
│  │  └─ DrugsPage.jsx.bak
│  ├─ fix_drug_options_duplicate_2026_05_16_16_35/
│  │  ├─ App.jsx
│  │  └─ pageRegistry.js
│  ├─ frontend/
│  │  ├─ NeedRowsPage_before_fix_duplicate_2026_05_17_08_34.bak
│  │  └─ NeedRowsPage_before_lint_undef_fix_2026_05_17_08_45.jsx
│  ├─ needrows_collapse_2026_05_17_09_31/
│  │  ├─ App.css.bak
│  │  └─ NeedRowsPage.jsx.bak
│  ├─ needrows_focus_mode_2026_05_17_10_02/
│  │  ├─ App.css.bak
│  │  └─ NeedRowsPage.jsx.bak
│  ├─ needrows_modes_2026_05_17_09_52/
│  │  ├─ App.css.bak
│  │  └─ NeedRowsPage.jsx.bak
│  ├─ optimize_2026_05_17_09_06/
│  │  ├─ excel_import.py.bak
│  │  └─ MonthlyIssuesPage.jsx.bak
│  ├─ restore_needrows_page_2026_05_16_16_24/
│  │  ├─ NeedRowsPage.current.jsx
│  │  └─ NeedRowsSummaryPage.current.jsx
│  ├─ tz_frontend_menu_columns_fix_2026_05_16_17_01/
│  │  ├─ App.jsx
│  │  ├─ NeedRowsPage.jsx
│  │  ├─ NeedRowsSummaryPage.jsx
│  │  └─ StockSummaryPage.jsx
│  ├─ tz_serializer_stable_fix_2026_05_16_16_48/
│  │  └─ serializers.py.bak
│  ├─ verify_2026_05_17_08_53/
│  │  ├─ db.sqlite3.bak
│  │  ├─ excel_import.py.bak
│  │  ├─ excel_import_api.py.bak
│  │  ├─ excel_need_matrix_import.py.bak
│  │  ├─ MonthlyIssuesPage.jsx.bak
│  │  ├─ NeedRowsPage.jsx.bak
│  │  ├─ serializers.py.bak
│  │  ├─ urls.py.bak
│  │  └─ views.py.bak
│  ├─ App_before_excel_import_2026_05_17_03_25.jsx
│  ├─ App_before_needrows_compact_sticky_2026_05_17_07_06.css
│  ├─ client_before_speed_patch_2026_05_17_06_30.js
│  ├─ db_after_tz_acceptance_2026_05_16_18_16.sqlite3
│  ├─ db_backup_before_drugs_group_bulk_2026_05_17_05_26.sqlite3
│  ├─ db_backup_before_excel_import_2026_05_17_03_25.sqlite3
│  ├─ db_backup_before_fast_bulk_delete_2026_05_17_07_52.sqlite3
│  ├─ db_backup_before_manual_excel_mapping_2026_05_17_04_06.sqlite3
│  ├─ db_backup_before_need_matrix_import_2026_05_17_05_45.sqlite3
│  ├─ db_backup_before_needrows_clean_delete_2026_05_17_07_23.sqlite3
│  ├─ db_backup_before_partial_excel_import_2026_05_17_06_09.sqlite3
│  ├─ db_backup_before_speed_patch_2026_05_17_06_30.sqlite3
│  ├─ db_backup_before_translit_2026_05_17_04_37.sqlite3
│  ├─ db_backup_final_real_data_2026_05_17_02_17.sqlite3
│  ├─ db_before_clean_activation_2026_05_16_19_30.sqlite3
│  ├─ db_before_fast_bulk_delete_2026_05_17_08_20.sqlite3
│  ├─ db_before_real_data_2026_05_16_19_37.sqlite3
│  ├─ db_before_tz_acceptance_resume_2026_05_16_17_15.sqlite3
│  ├─ db_before_tz_acceptance_resume_2026_05_16_17_17.sqlite3
│  ├─ db_before_tz_acceptance_resume_2026_05_16_17_19.sqlite3
│  ├─ db_before_tz_acceptance_resume_2026_05_16_17_21.sqlite3
│  ├─ db_clean_business_empty_2026_05_16_19_19.sqlite3
│  ├─ db_real_data_checkpoint_2026_05_17_02_09.sqlite3
│  ├─ DrugsPage_before_drugs_group_bulk_2026_05_17_05_26.jsx
│  ├─ excel_import_api_before_manual_mapping_2026_05_17_04_06.py
│  ├─ excel_import_before_manual_mapping_2026_05_17_04_06.py
│  ├─ excel_need_matrix_api_before_partial_2026_05_17_06_09.py
│  ├─ excel_need_matrix_import_before_partial_2026_05_17_06_09.py
│  ├─ ExcelImportPage_before_manual_mapping_2026_05_17_04_06.jsx
│  ├─ ExcelImportPage_before_need_matrix_import_2026_05_17_05_45.jsx
│  ├─ ExcelImportPage_before_partial_2026_05_17_06_09.jsx
│  ├─ InstitutionsPage_before_bulk_delete_2026_05_17_04_28.jsx
│  ├─ InstitutionsPage_before_translit_2026_05_17_04_37.jsx
│  ├─ InstitutionsPage_before_ui_label_fix_2026_05_17_04_50.jsx
│  ├─ models_before_drugs_group_bulk_2026_05_17_05_26.py
│  ├─ MonthlyIssuesPage_before_bulk_delete_2026_05_17_06_43.jsx
│  ├─ MonthlyIssuesPage_before_lint_fix_2026_05_17_06_56.jsx
│  ├─ NeedRowsPage_before_bulk_delete_2026_05_17_06_56.jsx
│  ├─ NeedRowsPage_before_compact_sticky_2026_05_17_07_06.jsx
│  ├─ NeedRowsPage_before_fast_bulk_delete_2026_05_17_07_52.jsx
│  ├─ NeedRowsPage_before_needrows_clean_delete_2026_05_17_07_23.jsx
│  ├─ PricesPage_before_bulk_delete_2026_05_17_06_43.jsx
│  ├─ PricesPage_before_lint_fix_2026_05_17_06_56.jsx
│  ├─ urls_before_excel_import_2026_05_17_03_25.py
│  ├─ urls_before_fast_bulk_delete_2026_05_17_07_52.py
│  ├─ urls_before_fast_bulk_delete_2026_05_17_08_20.py
│  ├─ urls_before_manual_excel_mapping_2026_05_17_04_06.py
│  ├─ urls_before_need_matrix_import_2026_05_17_05_45.py
│  ├─ views_before_fast_bulk_delete_2026_05_17_07_52.py
│  ├─ views_before_fast_bulk_delete_2026_05_17_08_20.py
│  ├─ views_before_needrows_clean_delete_2026_05_17_07_23.py
│  └─ views_before_speed_patch_2026_05_17_06_30.py
├─ project_docs/
│  ├─ archive/
│  │  └─ manual_patch_scripts_2026_04_29/
│  │     ├─ add_dashboard_summary_test.py
│  │     ├─ fix_changelog.py
│  │     ├─ fix_dashboard_cards_values.py
│  │     ├─ fix_dashboard_summary.py
│  │     ├─ fix_project_structure.py
│  │     ├─ fix_setup.py
│  │     ├─ fix_tests_date_import.py
│  │     ├─ patch_dashboard_cards.py
│  │     └─ PROJECT_STRUCTURE_root_old.md
│  ├─ TZ/
│  │  ├─ ТЗ Potrebnost_Dori_pasporti_TZ_v1_0.docx
│  │  ├─ ТЗ Potrebnost_Integrated_TZ_and_Audit_2026_05_12.docx
│  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-03-29.docx
│  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-13.docx
│  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-25.docx
│  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-26_v1_1.docx
│  │  ├─ ТЗ Потребност 30.03.2026.docx
│  │  └─ ТЗ_qoshimcha_ehtiyojlar_jurnali.docx
│  ├─ ADMIN_GUIDE.md
│  ├─ CHANGELOG.md
│  ├─ CHECKPOINT_INN_FINAL_2026_05_09.txt
│  ├─ CHECKPOINTS.md
│  ├─ DEPLOYMENT.md
│  ├─ FINAL_ACCEPTANCE_ACT_2026_05_17_02_23.md
│  ├─ FINAL_ACCEPTANCE_ACT_2026_05_17_02_37.md
│  ├─ FINAL_ACCEPTANCE_REPORT_2026_05_16_18_35.md
│  ├─ FINAL_HANDOVER_REPORT_2026_05_17_02_17.md
│  ├─ OPERATOR_GUIDE.md
│  ├─ README_LOCAL_RUN.txt
│  └─ SETUP.md
├─ release_package/
│  ├─ potrebnost_final_2026_05_16_18_24/
│  ├─ potrebnost_final_2026_05_16_18_35/
│  │  ├─ db_backup_final_2026_05_16_18_35.sqlite3
│  │  ├─ FINAL_ACCEPTANCE_REPORT_2026_05_16_18_35.md
│  │  └─ MANIFEST_2026_05_16_18_35.txt
│  ├─ POTREBNOST_FINAL_HANDOVER_2026_05_17_02_17/
│  │  ├─ db_backup_final_real_data_2026_05_17_02_17.sqlite3
│  │  ├─ FINAL_HANDOVER_REPORT_2026_05_17_02_17.md
│  │  └─ MANIFEST_2026_05_17_02_17.txt
│  └─ release_2026_05_11_16_48/
│     ├─ docs/
│     │  ├─ archive/
│     │  │  └─ manual_patch_scripts_2026_04_29/
│     │  │     ├─ add_dashboard_summary_test.py
│     │  │     ├─ fix_changelog.py
│     │  │     ├─ fix_dashboard_cards_values.py
│     │  │     ├─ fix_dashboard_summary.py
│     │  │     ├─ fix_project_structure.py
│     │  │     ├─ fix_setup.py
│     │  │     ├─ fix_tests_date_import.py
│     │  │     ├─ patch_dashboard_cards.py
│     │  │     └─ PROJECT_STRUCTURE_root_old.md
│     │  ├─ TZ/
│     │  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-03-29.docx
│     │  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-13.docx
│     │  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-25.docx
│     │  │  ├─ ТЗ Yangi_TZ_Potrebnost_2026-04-26_v1_1.docx
│     │  │  ├─ ТЗ Потребност 30.03.2026.docx
│     │  │  └─ ТЗ_qoshimcha_ehtiyojlar_jurnali.docx
│     │  ├─ ADMIN_GUIDE.md
│     │  ├─ CHANGELOG.md
│     │  ├─ CHECKPOINT_INN_FINAL_2026_05_09.txt
│     │  ├─ CHECKPOINTS.md
│     │  ├─ OPERATOR_GUIDE.md
│     │  ├─ README_LOCAL_RUN.txt
│     │  └─ SETUP.md
│     ├─ db_backup_2026_05_11_16_48.sqlite3
│     ├─ FINAL_RELEASE_NOTES.txt
│     ├─ MANIFEST.txt
│     └─ RELEASE_HASHES.txt
├─ scripts/
│  └─ update_project_structure.py
├─ .gitignore
├─ ADMIN_GUIDE.md
├─ CHANGELOG.md
├─ CHECKPOINTS.md
├─ collect_check.ps1
├─ DEPLOYMENT.md
├─ OPERATOR_GUIDE.md
├─ README_LOCAL_RUN.txt
├─ start_backend.bat
├─ start_frontend.bat
├─ test_excel_import_institutions.xlsx
├─ tmp_clean_final_acceptance.py
├─ tmp_final_handover.py
├─ tmp_fix_drug_options_duplicate.py
├─ tmp_fix_drugspage_lint.py
├─ tmp_fix_institutions_ui_labels.py
├─ tmp_fix_needrows_lint_no_undef.py
├─ tmp_make_clean_prod_db_copy.py
├─ tmp_make_excel_import_test.py
├─ tmp_make_release.py
├─ tmp_patch_api_timeout.py
├─ tmp_patch_bulk_delete_prices_monthly.py
├─ tmp_patch_drug_control_group.py
├─ tmp_patch_excel_frontend.py
├─ tmp_patch_excel_import_error_rows_ui.py
├─ tmp_patch_excel_urls.py
├─ tmp_patch_fast_bulk_delete.py
├─ tmp_patch_fast_bulk_delete_backend.py
├─ tmp_patch_institution_translit.py
├─ tmp_patch_monthly_excel_fast.py
├─ tmp_patch_need_matrix_urls.py
├─ tmp_patch_needrows_bulk_delete.py
├─ tmp_patch_needrows_clean_delete.py
├─ tmp_patch_needrows_collapsible_top.py
├─ tmp_patch_needrows_compact_sticky.py
├─ tmp_patch_needrows_focus_mode.py
├─ tmp_patch_needrows_modes_v2.py
├─ tmp_patch_partial_need_matrix_api.py
├─ tmp_patch_partial_need_matrix_import.py
├─ tmp_patch_performance_fast_reads.py
├─ tmp_remove_duplicate_handleDeleteCancelledAddition.py
├─ tmp_tz_frontend_menu_columns_fix.py
├─ tmp_tz_frontend_source_smoke.py
├─ tmp_tz_integrity_smoke.py
├─ tmp_tz_serializer_stable_fix.py
├─ tmp_verify_bulk_and_import.py
└─ tmp_verify_final_package.py
```
