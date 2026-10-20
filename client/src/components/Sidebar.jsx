import { NavLink } from "react-router-dom";

export const NAV = {
  student: [["⌂", "Overview", "dashboard"], ["◎", "Find Mentors", "mentors"], ["⇄", "My Requests", "requests"], ["▣", "Jobs & Internships", "jobs"], ["◌", "Messages", "messages"], ["◷", "Sessions", "sessions"], ["♙", "Profile", "profile"]],
  alumni: [["⌂", "Overview", "dashboard"], ["◎", "Find a Mentor", "mentors"], ["⇄", "Mentorship Requests", "requests"], ["▣", "Jobs & Internships", "jobs"], ["◌", "Messages", "messages"], ["◷", "Sessions", "sessions"], ["♙", "Profile", "profile"]],
  admin: [["⌂", "Overview", "dashboard"], ["✓", "Verification", "verification"], ["☰", "All Users", "users"], ["▣", "Opportunities", "jobs"], ["◌", "Messages", "messages"]],
};

export default function Sidebar({ role = "student", mobile = false }) {
  return (
    <aside className={mobile ? "mobile-nav" : "sidebar"}>
      {!mobile && <div className="muted side-role">{role} workspace</div>}
      {(NAV[role] || []).map(([icon, label, path]) => (
        <NavLink key={path} to={`/${role}/${path}`} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
          <span>{icon}</span><span>{label}</span>
        </NavLink>
      ))}
    </aside>
  );
}
