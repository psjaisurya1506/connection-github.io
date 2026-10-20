import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({ role, title, subtitle, actions, children }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const out = () => { signOut(); nav("/"); };
  return (
    <div className="app-shell">
      <header className="site-nav">
        <div className="nav-inner">
          <Link to="/" className="brand"><span className="brand-mark">EA</span><span>EEC Alumni Connect</span></Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell />
            <span className="badge nav-user">● {user?.name?.split(" ")[0]} · {role}</span>
            <button className="btn btn-ghost" onClick={out}>Sign out</button>
          </div>
        </div>
      </header>
      <Sidebar role={role} mobile />
      <div className="layout-row">
        <Sidebar role={role} />
        <main className="dashboard-main" style={{ flex: 1, minWidth: 0 }}>
          <div className="page-heading">
            <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
            {actions && <div className="page-actions">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
