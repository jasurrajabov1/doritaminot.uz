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
│  │  │  └─ __init__.py
│  │  ├─ __init__.py
│  │  ├─ admin.py
│  │  ├─ apps.py
│  │  ├─ models.py
│  │  ├─ serializers.py
│  │  ├─ tests.py
│  │  ├─ urls.py
│  │  └─ views.py
│  └─ manage.py
├─ frontend/
│  ├─ public/
│  │  └─ vite.svg
│  ├─ src/
│  │  ├─ api/
│  │  │  └─ client.js
│  │  ├─ assets/
│  │  │  └─ react.svg
│  │  ├─ pages/
│  │  │  ├─ DashboardPage.jsx
│  │  │  ├─ DrugsPage.jsx
│  │  │  ├─ InstitutionsPage.jsx
│  │  │  ├─ MonthlyIssuesPage.jsx
│  │  │  ├─ NeedRowsPage.jsx
│  │  │  ├─ NeedRowsSummaryPage.jsx
│  │  │  ├─ PricesPage.jsx
│  │  │  └─ StockSummaryPage.jsx
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ index.css
│  │  └─ main.jsx
│  ├─ .gitignore
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ README.md
│  └─ vite.config.js
├─ project_docs/
│  ├─ archive/
│  ├─ TZ/
│  ├─ CHANGELOG.md
│  └─ CHECKPOINTS.md
└─ scripts/
   └─ update_project_structure.py
```
