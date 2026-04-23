import { NavLink } from "react-router-dom";

export default function MenuLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
    >
      {children}
    </NavLink>
  );
}