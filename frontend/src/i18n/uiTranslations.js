export const DEFAULT_LANGUAGE = "uz-Cyrl";
export const LANGUAGE_STORAGE_KEY = "pharm_ui_language";

export const LANGUAGES = [
  { code: "uz-Cyrl", label: "Ўзбек", shortLabel: "Ўз" },
  { code: "uz-Latn", label: "O‘zbek", shortLabel: "Uz" },
  { code: "ru", label: "Русский", shortLabel: "Ru" },
  { code: "en", label: "English", shortLabel: "En" },
];

// Асосий UI, меню, жадвал устунлари ва амаллар учун frontend таржима луғати.
// Калитлар дастурдаги default ўзбек кирилл матнларидир.
export const UI_TRANSLATIONS = {
  "Потребност": { "uz-Latn": "Potrebnost", ru: "Потребность", en: "Demand" },
  "Дори эҳтиёжи назорати": { "uz-Latn": "Dori ehtiyoji nazorati", ru: "Контроль потребности лекарств", en: "Medicine demand control" },
  "Тизимга кириш": { "uz-Latn": "Tizimga kirish", ru: "Вход в систему", en: "Sign in" },
  "Логин ва паролингизни киритинг": { "uz-Latn": "Login va parolingizni kiriting", ru: "Введите логин и пароль", en: "Enter your username and password" },
  "Тил": { "uz-Latn": "Til", ru: "Язык", en: "Language" },
  "Меню": { "uz-Latn": "Menyu", ru: "Меню", en: "Menu" },
  "Менюни ёпиш": { "uz-Latn": "Menyuni yopish", ru: "Закрыть меню", en: "Close menu" },
  "Логин": { "uz-Latn": "Login", ru: "Логин", en: "Username" },
  "Парол": { "uz-Latn": "Parol", ru: "Пароль", en: "Password" },
  "Кириш": { "uz-Latn": "Kirish", ru: "Войти", en: "Sign in" },
  "Кириляпти...": { "uz-Latn": "Kirilmoqda...", ru: "Вход...", en: "Signing in..." },
  "Чиқиш": { "uz-Latn": "Chiqish", ru: "Выход", en: "Logout" },
  "Юкланмоқда...": { "uz-Latn": "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },

  "Бош саҳифа": { "uz-Latn": "Bosh sahifa", ru: "Главная", en: "Dashboard" },
  "Муассасалар": { "uz-Latn": "Muassasalar", ru: "Учреждения", en: "Institutions" },
  "Дорилар": { "uz-Latn": "Dorilar", ru: "Лекарства", en: "Drugs" },
  "Нархлар": { "uz-Latn": "Narxlar", ru: "Цены", en: "Prices" },
  "Эҳтиёж": { "uz-Latn": "Ehtiyoj", ru: "Потребность", en: "Demand" },
  "Берилган миқдор": { "uz-Latn": "Berilgan miqdor", ru: "Выданное количество", en: "Issued quantity" },
  "Омбор қолдиғи": { "uz-Latn": "Ombor qoldig‘i", ru: "Остаток склада", en: "Stock balance" },
  "Эҳтиёжлар сводкаси": { "uz-Latn": "Ehtiyojlar svodkasi", ru: "Сводка потребностей", en: "Demand summary" },
  "Фойдаланувчилар ва доступ": { "uz-Latn": "Foydalanuvchilar va dostup", ru: "Пользователи и доступ", en: "Users and access" },
  "Дори справочниклари": { "uz-Latn": "Dori spravochniklari", ru: "Справочники лекарств", en: "Drug directories" },
  "Excel import": { "uz-Latn": "Excel import", ru: "Импорт Excel", en: "Excel import" },

  "Маълумотнома": { "uz-Latn": "Ma’lumotnoma", ru: "Справочник", en: "Reference" },
  "Муассаса + дори + йил": { "uz-Latn": "Muassasa + dori + yil", ru: "Учреждение + лекарство + год", en: "Institution + drug + year" },
  "Назорат талаб қилади": { "uz-Latn": "Nazorat talab qiladi", ru: "Требует контроля", en: "Needs control" },
  "Сўмда": { "uz-Latn": "So‘mda", ru: "В сумах", en: "In UZS" },

  "№": { "uz-Latn": "№", ru: "№", en: "No." },
  "ИНН": { "uz-Latn": "STIR", ru: "ИНН", en: "TIN" },
  "Дори": { "uz-Latn": "Dori", ru: "Лекарство", en: "Drug" },
  "Йил": { "uz-Latn": "Yil", ru: "Год", en: "Year" },
  "Йил бошидаги эҳтиёж": { "uz-Latn": "Yil boshidagi ehtiyoj", ru: "Потребность на начало года", en: "Base yearly need" },
  "Чораклик асосий": { "uz-Latn": "Choraklik asosiy", ru: "Основная квартальная", en: "Base quarterly" },
  "ДПМ асосий": { "uz-Latn": "DPM asosiy", ru: "Основная ДПМ", en: "Base DPM" },
  "Амб. асосий": { "uz-Latn": "Amb. asosiy", ru: "Основная амб.", en: "Base outpatient" },
  "Қўшимча ДПМ": { "uz-Latn": "Qo‘shimcha DPM", ru: "Доп. ДПМ", en: "Additional DPM" },
  "Қўшимча амб.": { "uz-Latn": "Qo‘shimcha amb.", ru: "Доп. амб.", en: "Additional outpatient" },
  "Қўшимча эҳтиёж": { "uz-Latn": "Qo‘shimcha ehtiyoj", ru: "Доп. потребность", en: "Additional need" },
  "Қўшимча жами": { "uz-Latn": "Qo‘shimcha jami", ru: "Итого доп.", en: "Additional total" },
  "Қўшимча %": { "uz-Latn": "Qo‘shimcha %", ru: "Доп. %", en: "Additional %" },
  "Қўшимча сони": { "uz-Latn": "Qo‘shimcha soni", ru: "Кол-во доп.", en: "Additional count" },
  "Охирги қўшимча": { "uz-Latn": "Oxirgi qo‘shimcha", ru: "Последнее доп.", en: "Last addition" },
  "Охирги қўшимча сана": { "uz-Latn": "Oxirgi qo‘shimcha sana", ru: "Дата последнего доп.", en: "Last addition date" },
  "Қўшимча хавф": { "uz-Latn": "Qo‘shimcha xavf", ru: "Риск доп.", en: "Addition risk" },
  "Умумий эҳтиёж": { "uz-Latn": "Umumiy ehtiyoj", ru: "Общая потребность", en: "Total need" },
  "Жами эҳтиёж": { "uz-Latn": "Jami ehtiyoj", ru: "Итоговая потребность", en: "Total need" },
  "Жами чораклик": { "uz-Latn": "Jami choraklik", ru: "Общая квартальная", en: "Total quarterly" },
  "Умумий чораклик эҳтиёж": { "uz-Latn": "Umumiy choraklik ehtiyoj", ru: "Общая квартальная потребность", en: "Total quarterly need" },
  "Берилган": { "uz-Latn": "Berilgan", ru: "Выдано", en: "Issued" },
  "Берилган / қолдиқ": { "uz-Latn": "Berilgan / qoldiq", ru: "Выдано / остаток", en: "Issued / remaining" },
  "Қолдиқ": { "uz-Latn": "Qoldiq", ru: "Остаток", en: "Remaining" },
  "Қолдиқ %": { "uz-Latn": "Qoldiq %", ru: "Остаток %", en: "Remaining %" },
  "Статус": { "uz-Latn": "Status", ru: "Статус", en: "Status" },
  "Амал": { "uz-Latn": "Amal", ru: "Действие", en: "Action" },
  "Асосий": { "uz-Latn": "Asosiy", ru: "Основное", en: "Base" },
  "Қўшимча": { "uz-Latn": "Qo‘shimcha", ru: "Дополнительно", en: "Additional" },
  "Ҳисоб-китоб": { "uz-Latn": "Hisob-kitob", ru: "Расчёты", en: "Calculation" },
  "Суммалар": { "uz-Latn": "Summalar", ru: "Суммы", en: "Amounts" },
  "Нарх": { "uz-Latn": "Narx", ru: "Цена", en: "Price" },
  "Нарх йўқ": { "uz-Latn": "Narx yo‘q", ru: "Нет цены", en: "No price" },
  "Турли нархлар": { "uz-Latn": "Turli narxlar", ru: "Разные цены", en: "Different prices" },
  "Йил бошидаги сумма": { "uz-Latn": "Yil boshidagi summa", ru: "Сумма на начало года", en: "Base need amount" },
  "Қўшимча сумма": { "uz-Latn": "Qo‘shimcha summa", ru: "Доп. сумма", en: "Additional amount" },
  "Умумий эҳтиёж сумма": { "uz-Latn": "Umumiy ehtiyoj summa", ru: "Сумма общей потребности", en: "Total need amount" },
  "Берилган сумма": { "uz-Latn": "Berilgan summa", ru: "Сумма выданного", en: "Issued amount" },
  "Қолдиқ сумма": { "uz-Latn": "Qoldiq summa", ru: "Сумма остатка", en: "Remaining amount" },
  "Ортиқча": { "uz-Latn": "Ortiqcha", ru: "Превышение", en: "Over" },
  "Ортиқча %": { "uz-Latn": "Ortiqcha %", ru: "Превышение %", en: "Over %" },
  "Ортиқча сумма": { "uz-Latn": "Ortiqcha summa", ru: "Сумма превышения", en: "Over amount" },
  "Асосий сабаблар": { "uz-Latn": "Asosiy sabablar", ru: "Основные причины", en: "Main reasons" },
  "Кўрсаткич": { "uz-Latn": "Ko‘rsatkich", ru: "Показатель", en: "Indicator" },
  "Қиймат": { "uz-Latn": "Qiymat", ru: "Значение", en: "Value" },
  "Жами": { "uz-Latn": "Jami", ru: "Итого", en: "Total" },
  "Жами қаторлар": { "uz-Latn": "Jami qatorlar", ru: "Всего строк", en: "Total rows" },
  "Жами йиллик сумма": { "uz-Latn": "Jami yillik summa", ru: "Итоговая годовая сумма", en: "Total yearly amount" },
  "Жами берилган сумма": { "uz-Latn": "Jami berilgan summa", ru: "Итоговая сумма выданного", en: "Total issued amount" },
  "Жами қолдиқ сумма": { "uz-Latn": "Jami qoldiq summa", ru: "Итоговая сумма остатка", en: "Total remaining amount" },

  "Ортиқча берилган": { "uz-Latn": "Ortiqcha berilgan", ru: "Выдано сверх потребности", en: "Over-issued" },
  "Эҳтиёждан ошган": { "uz-Latn": "Ehtiyojdan oshgan", ru: "Превышает потребность", en: "Above need" },
  "Критик": { "uz-Latn": "Kritik", ru: "Критично", en: "Critical" },
  "Паст": { "uz-Latn": "Past", ru: "Низко", en: "Low" },
  "Огоҳлантириш": { "uz-Latn": "Ogohlantirish", ru: "Предупреждение", en: "Warning" },
  "Норма": { "uz-Latn": "Norma", ru: "Норма", en: "Normal" },
  "Юқори хавф": { "uz-Latn": "Yuqori xavf", ru: "Высокий риск", en: "High risk" },
  "Тушунарли": { "uz-Latn": "Tushunarli", ru: "Допустимо", en: "Understandable" },
  "Қўшимча йўқ": { "uz-Latn": "Qo‘shimcha yo‘q", ru: "Нет доп. потребности", en: "No additions" },
  "Номаълум": { "uz-Latn": "Noma’lum", ru: "Неизвестно", en: "Unknown" },
  "Номаълум дори": { "uz-Latn": "Noma’lum dori", ru: "Неизвестное лекарство", en: "Unknown drug" },
  "Маълумот йўқ": { "uz-Latn": "Ma’lumot yo‘q", ru: "Нет данных", en: "No data" },
  "Маълумот топилмади": { "uz-Latn": "Ma’lumot topilmadi", ru: "Данные не найдены", en: "No records found" },

  "Қўшиш": { "uz-Latn": "Qo‘shish", ru: "Добавить", en: "Add" },
  "Таҳрирлаш": { "uz-Latn": "Tahrirlash", ru: "Редактировать", en: "Edit" },
  "Ўчириш": { "uz-Latn": "O‘chirish", ru: "Удалить", en: "Delete" },
  "Сақлаш": { "uz-Latn": "Saqlash", ru: "Сохранить", en: "Save" },
  "Янгилаш": { "uz-Latn": "Yangilash", ru: "Обновить", en: "Refresh" },
  "Фаол қилиш": { "uz-Latn": "Faol qilish", ru: "Активировать", en: "Activate" },
  "Нофаол қилиш": { "uz-Latn": "Nofaol qilish", ru: "Деактивировать", en: "Deactivate" },
  "Чоп этиш": { "uz-Latn": "Chop etish", ru: "Печать", en: "Print" },
  "Экспорт": { "uz-Latn": "Eksport", ru: "Экспорт", en: "Export" },
  "Excel юклаб олиш": { "uz-Latn": "Excel yuklab olish", ru: "Скачать Excel", en: "Download Excel" },
  "Устунларни яшириш": { "uz-Latn": "Ustunlarni yashirish", ru: "Скрыть столбцы", en: "Hide columns" },
  "Кўриш": { "uz-Latn": "Ko‘rish", ru: "Просмотр", en: "View" },
  "Доступни бошқариш": { "uz-Latn": "Dostupni boshqarish", ru: "Управление доступом", en: "Manage access" },
  "Рухсат қўшиш": { "uz-Latn": "Ruxsat qo‘shish", ru: "Добавить разрешение", en: "Add permission" },
  "Роль қўшиш": { "uz-Latn": "Rol qo‘shish", ru: "Добавить роль", en: "Add role" },
  "Фойдаланувчи қўшиш": { "uz-Latn": "Foydalanuvchi qo‘shish", ru: "Добавить пользователя", en: "Add user" },
  "Override қўшиш": { "uz-Latn": "Override qo‘shish", ru: "Добавить override", en: "Add override" },
  "Пароль янгилаш": { "uz-Latn": "Parol yangilash", ru: "Обновить пароль", en: "Update password" },
  "Янги пароль": { "uz-Latn": "Yangi parol", ru: "Новый пароль", en: "New password" },
  "Жорий пароль": { "uz-Latn": "Joriy parol", ru: "Текущий пароль", en: "Current password" },
  "Паролни алмаштириш": { "uz-Latn": "Parolni almashtirish", ru: "Сменить пароль", en: "Change password" },
  "Ҳа": { "uz-Latn": "Ha", ru: "Да", en: "Yes" },
  "Йўқ": { "uz-Latn": "Yo‘q", ru: "Нет", en: "No" },
  "Мерос": { "uz-Latn": "Meros", ru: "Наследуется", en: "Inherited" },
  "—": { "uz-Latn": "—", ru: "—", en: "—" },

  "Оддий": { "uz-Latn": "Oddiy", ru: "Обычный", en: "Simple" },
  "Ўртача": { "uz-Latn": "O‘rtacha", ru: "Средний", en: "Medium" },
  "Кучли": { "uz-Latn": "Kuchli", ru: "Сильный", en: "Strong" },
  "Ролсиз": { "uz-Latn": "Rolsiz", ru: "Без роли", en: "No role" },
  "Исм": { "uz-Latn": "Ism", ru: "Имя", en: "First name" },
  "Фамилия": { "uz-Latn": "Familiya", ru: "Фамилия", en: "Last name" },

  "Доза бирлиги": { "uz-Latn": "Doza birligi", ru: "Единица дозы", en: "Dose unit" },
  "Дори тури": { "uz-Latn": "Dori turi", ru: "Форма лекарства", en: "Drug form" },
  "Ўлчов бирлиги": { "uz-Latn": "O‘lchov birligi", ru: "Единица учёта", en: "Accounting unit" },
  "Гуруҳ": { "uz-Latn": "Guruh", ru: "Группа", en: "Group" },
  "Асосий эҳтиёж": { "uz-Latn": "Asosiy ehtiyoj", ru: "Основная потребность", en: "Base need" },
  "Хато": { "uz-Latn": "Xato", ru: "Ошибка", en: "Error" },
  "Хато сабаби": { "uz-Latn": "Xato sababi", ru: "Причина ошибки", en: "Error reason" },

  "Қидириш: муассаса, ИНН ёки дори": { "uz-Latn": "Qidirish: muassasa, STIR yoki dori", ru: "Поиск: учреждение, ИНН или лекарство", en: "Search: institution, TIN or drug" },
  "Қидириш: муассаса, дори, йил": { "uz-Latn": "Qidirish: muassasa, dori, yil", ru: "Поиск: учреждение, лекарство, год", en: "Search: institution, drug, year" },
  "Қидириш: дори номи": { "uz-Latn": "Qidirish: dori nomi", ru: "Поиск: название лекарства", en: "Search: drug name" },
  "Қидириш: ном ёки алиас": { "uz-Latn": "Qidirish: nom yoki alias", ru: "Поиск: название или алиас", en: "Search: name or alias" },
  "Фильтр: ИНН": { "uz-Latn": "Filtr: STIR", ru: "Фильтр: ИНН", en: "Filter: TIN" },
  "Кўринаётганлар танланган": { "uz-Latn": "Ko‘rinayotganlar tanlangan", ru: "Видимые выбраны", en: "Visible selected" },
  "Одатий": { "uz-Latn": "Odatiy", ru: "Обычный", en: "Normal" },
  "Ихчам": { "uz-Latn": "Ixcham", ru: "Компактный", en: "Compact" },
  "Жадвал режими": { "uz-Latn": "Jadval rejimi", ru: "Режим таблицы", en: "Table mode" },
  "режим: юқори блокларни очиб/яшириш": { "uz-Latn": "rejim: yuqori bloklarni ochib/yashirish", ru: "режим: показать/скрыть верхние блоки", en: "mode: show/hide top panels" },

  "Йил бошида кам ҳисобланган": { "uz-Latn": "Yil boshida kam hisoblangan", ru: "Недооценено в начале года", en: "Underestimated at year start" },
  "Янги бўлим очилди": { "uz-Latn": "Yangi bo‘lim ochildi", ru: "Открыто новое отделение", en: "New department opened" },
  "Беморлар сони ошди": { "uz-Latn": "Bemorlar soni oshdi", ru: "Увеличилось число пациентов", en: "Patient count increased" },
  "Янги клиника иш бошлади": { "uz-Latn": "Yangi klinika ish boshladi", ru: "Начала работу новая клиника", en: "New clinic started" },
  "ССВ топшириғи / қайта тақсимот": { "uz-Latn": "SSV topshirig‘i / qayta taqsimot", ru: "Поручение МЗ / перераспределение", en: "MoH order / redistribution" },
  "Ҳисоб-китобни тузатиш": { "uz-Latn": "Hisob-kitobni tuzatish", ru: "Корректировка расчёта", en: "Calculation correction" },
  "Бошқа": { "uz-Latn": "Boshqa", ru: "Другое", en: "Other" },
};

const CANONICAL_BY_ANY_LANGUAGE = new Map();

for (const [source, translations] of Object.entries(UI_TRANSLATIONS)) {
  CANONICAL_BY_ANY_LANGUAGE.set(source, source);
  for (const value of Object.values(translations)) {
    CANONICAL_BY_ANY_LANGUAGE.set(value, source);
  }
}

function preserveSpacing(original, translated) {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

export function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.some((item) => item.code === stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setStoredLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // localStorage йўқ бўлса ҳам интерфейс ишлайди.
  }
}

export function translateText(value, language = DEFAULT_LANGUAGE) {
  if (value === null || value === undefined) return value;

  const original = String(value);
  const trimmed = original.trim();
  if (!trimmed) return original;

  const canonical = CANONICAL_BY_ANY_LANGUAGE.get(trimmed);
  if (!canonical) return original;

  const translated = language === DEFAULT_LANGUAGE
    ? canonical
    : UI_TRANSLATIONS[canonical]?.[language] || canonical;

  return preserveSpacing(original, translated);
}

function shouldSkipNode(node) {
  const parent = node?.parentElement;
  if (!parent) return true;

  const tagName = parent.tagName?.toLowerCase();
  return ["script", "style", "noscript", "svg", "code", "pre"].includes(tagName);
}

export function applyUiTranslations(root = document.body, language = DEFAULT_LANGUAGE) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue || "";
      return CANONICAL_BY_ANY_LANGUAGE.has(text.trim())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    const nextValue = translateText(node.nodeValue, language);
    if (nextValue !== node.nodeValue) {
      node.nodeValue = nextValue;
    }
  }

  const attributeNames = ["placeholder", "title", "aria-label", "alt"];
  const elements = root.querySelectorAll?.("input, textarea, select, button, [title], [aria-label], img") || [];
  for (const element of elements) {
    for (const attr of attributeNames) {
      const currentValue = element.getAttribute?.(attr);
      if (!currentValue) continue;
      const nextValue = translateText(currentValue, language);
      if (nextValue !== currentValue) {
        element.setAttribute(attr, nextValue);
      }
    }
  }
}
