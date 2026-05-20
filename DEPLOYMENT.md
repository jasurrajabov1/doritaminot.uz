# DEPLOYMENT.md - Potrebnost

## Backend

cd C:\atf\pharm_demand_system\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -X utf8 manage.py migrate
python -X utf8 manage.py collectstatic --noinput
python -X utf8 manage.py runserver

## Frontend dev

cd C:\atf\pharm_demand_system\frontend
npm install
npm run dev

## Frontend production build

cd C:\atf\pharm_demand_system\frontend
npm install
npm run lint
npm run build

## Acceptance checks

cd C:\atf\pharm_demand_system\backend
python -X utf8 manage.py check
python -X utf8 manage.py test core.tests -v 2

cd C:\atf\pharm_demand_system\frontend
npm run lint
npm run build

## Release notes

- Source zip excludes node_modules, venv/.venv, dist, db.sqlite3, real .env files, logs, old archives and backups.
- Database backup is stored separately as sqlite3.
- Frontend dist is stored separately as production artifact.
- Access is controlled by PagePermission and UserPagePermissionOverride, not by role name.
- NeedRows, NeedRowsSummary, StockSummary and Dashboard use total_yearly_need logic.
