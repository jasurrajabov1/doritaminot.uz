import DashboardPage from "./DashboardPage";
import InstitutionsPage from "./InstitutionsPage";
import DrugsPage from "./DrugsPage";
import PricesPage from "./PricesPage";
import NeedRowsPage from "./NeedRowsPage";
import MonthlyIssuesPage from "./MonthlyIssuesPage";
import StockSummaryPage from "./StockSummaryPage";
import NeedRowsSummaryPage from "./NeedRowsSummaryPage";
import AccessManagementPage from "./AccessManagementPage";

export const PAGE_REGISTRY = [
  {
    code: "dashboard",
    path: "/dashboard",
    label: "Бош саҳифа",
    component: DashboardPage,
  },
  {
    code: "institutions",
    path: "/institutions",
    label: "Муассасалар",
    component: InstitutionsPage,
  },
  {
    code: "drugs",
    path: "/drugs",
    label: "Дорилар",
    component: DrugsPage,
  },
  {
    code: "prices",
    path: "/prices",
    label: "Нархлар",
    component: PricesPage,
  },
  {
    code: "need_rows",
    path: "/need-rows",
    label: "Эҳтиёж",
    component: NeedRowsPage,
  },
  {
    code: "monthly_issues",
    path: "/monthly-issues",
    label: "Берилган миқдор",
    component: MonthlyIssuesPage,
  },
  {
    code: "stock_summary",
    path: "/stock-summary",
    label: "Омбор қолдиғи",
    component: StockSummaryPage,
  },
  {
    code: "need_rows_summary",
    path: "/need-rows-summary",
    label: "Эҳтиёжлар сводкаси",
    component: NeedRowsSummaryPage,
  },
  {
    code: "access_management",
    path: "/access-management",
    label: "Фойдаланувчилар ва доступ",
    component: AccessManagementPage,
  },
];

export const PAGE_PATH_MAP = Object.fromEntries(
  PAGE_REGISTRY.map((item) => [item.code, item.path])
);
