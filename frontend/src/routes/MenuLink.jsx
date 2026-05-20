import { NavLink } from "react-router-dom";
import { canViewPage } from "../utils/permission";

export default function MenuLink({ to, children, pageCode }) {

  if (pageCode && !canViewPage(pageCode)) {
    return null;
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? "menu-link active" : "menu-link"
      }
    >
      {children}
    </NavLink>
  );
}

