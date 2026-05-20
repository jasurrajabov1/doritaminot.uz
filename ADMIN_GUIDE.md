
## 2026-05-11 16:13 — Админ қўлланмаси: қўшимча эҳтиёжлар, устунлар ва RBAC

### 1. Асосий RBAC қоидаси

Тизимда ҳуқуқлар role номи билан эмас, ҳақиқий permission билан белгиланади.

Role номи фақат ном ҳисобланади. Масалан:

- Админ
- Оператор
- Кузатувчи
- Директор
- Менежер

Бу номлар автоматик равишда кўп ёки кам ҳуқуқ бермайди. Ҳар бир role учун ҳуқуқлар **PagePermission** орқали белгиланади.

Якуний ҳуқуқ қоидаси:

effective_permission = UserPagePermissionOverride, агар override қиймати null эмас бўлса; акс ҳолда PagePermission.

### 2. Permission action турлари

Ҳар бир саҳифа учун қуйидаги action ҳуқуқлари бор:

- view — саҳифани кўриш
- add — қўшиш
- edit — таҳрирлаш
- delete — ўчириш ёки бекор қилиш
- export — Excel юклаб олиш
- print — чоп этиш
- manage_access — фойдаланувчилар ва доступларни бошқариш

Frontend меню ва тугмаларни шу permissionларга қараб кўрсатади. Backend эса API даражасида ҳақиқий текширувни бажаради.

### 3. Муҳим page_codeлар

Асосий page_codeлар:

- dashboard
- institutions
- drugs
- prices
- need_rows
- monthly_issues
- stock_summary
- need_rows_summary
- access_management

Access-management саҳифаси учун оддий view етарли эмас. Бу саҳифага кириш учун ccess_management.manage_access ҳақиқий бўлиши керак.

### 4. Қўшимча эҳтиёжлар учун permission қоидаси

Қўшимча эҳтиёжлар алоҳида меню эмас, **need_rows** модулининг ичида бошқарилади.

Қўшимча эҳтиёжлар бўйича permission:

- Қўшимча эҳтиёжлар тарихини кўриш: need_rows.view
- Қўшимча эҳтиёж қўшиш: need_rows.add
- Қўшимча эҳтиёжни таҳрирлаш: need_rows.edit
- Қўшимча эҳтиёжни бекор қилиш: need_rows.delete
- Эҳтиёжлар Excel export: need_rows.export
- Эҳтиёжлар print: need_rows.print

Фақат frontendда тугмани яшириш етарли эмас. Backend API ҳам рухсатни текшириши шарт.

### 5. Қўшимча эҳтиёжлар бизнес қоидаси

NeedRow йил бошидаги асосий эҳтиёж сифатида қолади.

Қўшимча эҳтиёжлар алоҳида журналда сақланади.

Ҳисоб формуласи:

Жами эҳтиёж = NeedRow.yearly_need + active NeedAddition total

Қолдиқ = Жами эҳтиёж - MonthlyIssue.issued_qty

Сумма ҳисоблари:

- Умумий эҳтиёж сумма = Жами эҳтиёж × Нарх
- Берилган сумма = Берилган миқдор × Нарх
- Қолдиқ сумма = Қолдиқ × Нарх

### 6. NeedRow ўчириш safety қоидаси

Асосий эҳтиёж қатори ўчирилмаслиги мумкин, агар:

- унга MonthlyIssue боғланган бўлса;
- унга қўшимча эҳтиёж ёзувлари боғланган бўлса.

Бу ҳолатда backend тушунарли хато қайтаради.

### 7. Қўшимча эҳтиёжни бекор қилиш қоидаси

Қўшимча эҳтиёжни физик ўчириш ўрнига бекор қилинган ҳолатга ўтказиш тавсия қилинади.

Бекор қилинган қўшимча эҳтиёж:

- тарихда қолади;
- ҳисоб-китобга кирмайди;
- фаол қўшимча эҳтиёжлар суммасига қўшилмайди.

Агар бекор қилиш натижасида жами эҳтиёж берилган миқдордан кам бўлиб қолса, backend бекор қилишни блоклаши керак.

### 8. Устунларни бошқариш

NeedRowsPage, NeedRowsSummaryPage ва StockSummaryPage жадвалларида устунларни яшириш/очиш имконияти бор.

Ушбу танлов frontendда browser storage орқали сақланади.

Одатда:

- **Ихчам** — кундалик иш учун керакли устунлар.
- **Стандарт** — асосий ҳисобот устунлари.
- **Ҳаммаси** — барча техник ва сумма устунлари.

Устунлар панели жой эгалламаслиги учун айрим саҳифаларда ёпиқ ҳолатда туради. Оператор **Устунлар** тугмаси орқали очади.

### 9. Excel ва print permission

Excel ва print тугмалари фақат тегишли permission бўлса кўринади.

Керакли permissionлар:

- Dashboard Excel: dashboard.export
- Dashboard print: dashboard.print
- NeedRows Excel: need_rows.export
- NeedRows print: need_rows.print
- NeedRowsSummary Excel: need_rows_summary.export
- NeedRowsSummary print: need_rows_summary.print
- StockSummary Excel: stock_summary.export
- StockSummary print: stock_summary.print

Экранда танланган устунлар Excel ва print натижасига таъсир қилади.

### 10. Role ва override текшириш

Role permissionни текшириш учун:

1. Фойдаланувчи role’ини кўринг.
2. Шу role учун PagePermission борлигини текширинг.
3. Кейин UserPagePermissionOverride бор-йўқлигини текширинг.
4. Override қиймати null эмас бўлса, role permission устидан ишлайди.

Мисол:

Role: prices.delete = true  
Override: prices.delete = false  
Натижа: user нархни ўчира олмайди.

Role: prices.add = false  
Override: prices.add = true  
Натижа: user нарх қўша олади.

### 11. Safety қоидалари

Тизимда қуйидаги safety қоидалар сақланиши керак:

- User ўзини-ўзи ўчира олмасин.
- User ўзини-ўзи нофаол қила олмасин.
- Охирги active superuser ўчирилмасин.
- Охирги active superuser нофаол қилинмасин.
- Тизимда камида битта active manage_access user қолиши шарт.
- Role user’га бириккан бўлса, role ўчириш блокланади.
- Access-management ҳуқуқи тўлиқ йўқолиб қолишига йўл қўйилмайди.

### 12. Админ учун smoke-test checklist

Катта ўзгаришдан кейин қуйидагилар текширилади:

Backend:

- python manage.py check
- python manage.py test core.tests -v 2

Frontend:

- npm run lint
- npm run build

Browser:

- /dashboard очилади
- /need-rows очилади
- /need-rows-summary очилади
- /stock-summary очилади
- /prices очилади
- Excel export ишлайди
- Print preview ишлайди
- View-only user учун қўшиш/таҳрирлаш/ўчириш тугмалари чиқмайди
- Доступ йўқ user учун AccessDeniedPage чиқади

### 13. Қўшимча эҳтиёжлар бўйича smoke-test

1. Битта NeedRow танланади.
2. Қўшимча эҳтиёж қўшилади.
3. Жами эҳтиёж ошгани текширилади.
4. Асосий NeedRow.yearly_need ўзгармагани текширилади.
5. MonthlyIssue жами эҳтиёждан ошиб кетмаслиги текширилади.
6. NeedRowsSummaryда сумма тўғри чиқиши текширилади.
7. StockSummaryда нарх ва сумма чиқиши текширилади.
8. Dashboardда қўшимча эҳтиёж карточкалари ва топ позициялар текширилади.
9. Excel exportда танланган устунлар чиқиши текширилади.
10. Print previewда танланган устунлар чиқиши текширилади.

### 14. Техник қайд

Жорий версияда тасдиқланган ҳолат:

- python manage.py check — OK
- python manage.py test core.tests -v 2 — OK, 74 tests
- npm run lint — OK
- npm run build — OK
- NeedRows browser smoke-test — OK
- NeedRowsSummary browser smoke-test — OK
- StockSummary browser smoke-test — OK
- Dashboard browser smoke-test — OK
- Excel export — OK
- Print preview — OK

