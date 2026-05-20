
## 2026-05-11 16:05

### Added
- NeedRows модулида йил давомидаги қўшимча эҳтиёжлар журнали қўшилди.
- Қўшимча эҳтиёжлар учун сана, сабаб, ҳужжат рақами, ҳужжат санаси, изоҳ ва ҳолат майдонлари билан ишлаш қўшилди.
- NeedRowsPage жадвалида устунларни яшириш/очиш имконияти қўшилди.
- Қўшимча эҳтиёжлар тарихи жадвалида устунларни яшириш/очиш имконияти қўшилди.
- NeedRowsSummaryPage сводка жадвалларида устунларни яшириш/очиш имконияти қўшилди.
- StockSummaryPage жадвалида устунларни яшириш/очиш имконияти қўшилди.

### Changed
- NeedRow йил бошидаги асосий эҳтиёж сифатида сақланадиган қилиб мантиқ аниқлаштирилди.
- Қолдиқ ҳисоблари жами эҳтиёж асосида ишлайдиган қилинди.
- MonthlyIssue validation жами эҳтиёждан ошмаслик қоидасига мослаштирилди.
- StockSummary API жавобига нарх ва сумма майдонлари тўғри қўшилди.
- Excel export ва print экрандаги танланган устунлар билан мос ишлайдиган қилинди.

### Fixed
- /stock-summary саҳифасида сумма устунлари бўш чиқиши тузатилди.
- StockSummary Excel exportда нарх ва сумма майдонлари чиқиши тузатилди.
- StockSummary print previewда сумма устунлари чиқиши тузатилди.
- Frontend устунлар кўпайиб кетганда экранда ишлаш қийинлашиши устунларни бошқариш орқали енгиллаштирилди.

### Verified
- python manage.py check — OK
- python manage.py test core.tests -v 2 — OK, 74 tests
- npm run lint — OK
- npm run build — OK
- Browser smoke-test — OK
- Excel export — OK
- Print preview — OK


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


## 2026_05_17_02_17 - Final handover checkpoint

- Final handover package created.
- Real-data smoke stage completed.
- Main workflow confirmed: Institution -> Drug -> Price -> NeedRow -> MonthlyIssue -> Dashboard/StockSummary/NeedRowsSummary.
- AccessManagement confirmed.
- Further full institution list entry is operational data entry, not required for technical acceptance.
