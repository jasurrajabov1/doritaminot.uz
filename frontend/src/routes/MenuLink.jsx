import { NavLink } from "react-router-dom";
import { canViewPage } from "../utils/permission";

export default function MenuLink({ to, children, pageCode, className = "", ...rest }) {
  if (pageCode && !canViewPage(pageCode)) {
    return null;
  }

  return (
    <NavLink
      to={to}
      {...rest}
      className={({ isActive }) => {
        const baseClass = isActive ? "menu-link active" : "menu-link";
        return className ? `${baseClass} ${className}` : baseClass;
      }}
    >
      {children}
    </NavLink>
  );
}
