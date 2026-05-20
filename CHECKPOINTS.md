
## 2026-05-11 16:05 — Қўшимча эҳтиёжлар журнали ва сводка/омбор ҳисоблари checkpoint

Бажарилган ишлар:

- NeedRow йил бошидаги асосий эҳтиёж сифатида қолдирилди.
- Қўшимча эҳтиёжлар алоҳида NeedAddition журнали сифатида ишлайди.
- Жами эҳтиёж = йил бошидаги асосий эҳтиёж + фаол қўшимча эҳтиёжлар.
- MonthlyIssue validation жами эҳтиёждан ошиб кетмаслик бўйича текширилди.
- NeedRowsPage саҳифасида қўшимча эҳтиёж қўшиш, тарих, бекор қилиш ва устунларни яшириш/очиш имконияти қўшилди.
- NeedRowsPage Excel export ва print экрандаги танланган устунларга мос ишлаши текширилди.
- NeedRowsSummaryPage учун муассаса/дори кесимидаги сводка ва дори кесимидаги жами жадвалларига устунларни яшириш/очиш имконияти қўшилди.
- StockSummaryPage учун устунларни бошқариш имконияти қўшилди.
- StockSummary backend ҳисобида нарх ва сумма майдонлари тўлдирилди:
  - Нарх
  - Умумий эҳтиёж сумма
  - Берилган сумма
  - Қолдиқ сумма
- StockSummary Excel export ва printда сумма устунлари чиқиши қўлда текширилди.
- Dashboard Excel export ва print ишлаши қўлда текширилди.
- RBAC smoke-test бажарилди:
  - view рухсати бор user GET қила олади.
  - view йўқ user GET қила олмайди.
  - add рухсати POST учун текширилди.
  - override role permissionдан устун ишлаши текширилди.
  - manage_access рухсати access-management API учун текширилди.

Тест натижалари:

- python manage.py check — OK
- python manage.py test core.tests -v 2 — OK, 74 tests
- npm run lint — OK
- npm run build — OK
- Browser smoke-test:
  - /need-rows — OK
  - /need-rows-summary — OK
  - /stock-summary — OK
  - /dashboard — OK
  - Excel export — OK
  - Print preview — OK

Изоҳ:

Қўшимча эҳтиёжлар ҳисоб-китоби ТЗдаги қоидага мос:
Жами йиллик эҳтиёж = йил бошидаги асосий эҳтиёж + фаол қўшимча эҳтиёжлар.
Қолдиқ ва сумма ҳисоблари жами эҳтиёж асосида чиқарилади.


## 2026_05_16_18_16 — TZ acceptance ва UI smoke босқичи

- Backend system check: OK
- Backend tests: OK
- Frontend lint: OK
- Frontend build: OK
- DB/RBAC/source smoke: PASS
- PagePermission яхлитлиги: 3 role × 9 page = 27 permission
- DrugOptions: dosage_form=17, dosage_unit=8, measure_unit=8
- NeedRows: 11
- NeedAdditions: 2
- MonthlyIssues: 9
- Need limit violations: 0
- /drug-options duplicate route/menu guard: OK
- NeedRows / Summary / Stock / Dashboard total_yearly_need мантиғи: OK
- Кейинги босқич: браузер UI smoke-test натижаларига қараб final polish ёки documentation.


## 2026_05_16_18_35 - Final acceptance and release package

- Backend system check: OK
- Backend tests: OK, 74 tests passed
- Frontend lint: OK
- Frontend build: OK
- DB/RBAC/source smoke: PASS
- Browser UI smoke: OK
- Final acceptance report created.
- Deployment guide created.
- Release package created.

## 2026_05_16_19_43 - Real data entry bosqichi boshlandi

- Active DB real ma'lumot kiritish uchun tayyorlandi.
- Old DB backup olindi: manual_backups\db_before_real_data_*.sqlite3
- Endi tekshiruv emas, real ish boshlanadi.
- 1-bosqich: Muassasalar ro'yxatini kiritish.
- Keyingi tartib:
  1) Muassasalar
  2) Dori справочниклари
  3) Dori паспорти
  4) Narxlar
  5) Yil boshidagi ehtiyoj
  6) Qo'shimcha ehtiyojlar
  7) Berilgan miqdor
  8) Dashboard / Summary nazorati


## 2026_05_17_02_09 - Real data checkpoint
- уассаса, дори, нарх, эҳтиёж, берилган миқдор, Dashboard, StockSummary, NeedRowsSummary ва AccessManagement ишчи ҳолатда текширилди.


## 2026_05_17_02_17 - Final handover checkpoint

- Final handover package created.
- Real-data smoke stage completed.
- Main workflow confirmed: Institution -> Drug -> Price -> NeedRow -> MonthlyIssue -> Dashboard/StockSummary/NeedRowsSummary.
- AccessManagement confirmed.
- Further full institution list entry is operational data entry, not required for technical acceptance.
