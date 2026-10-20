import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import { Avatar, Empty, ErrorBox, Loading, Status } from "../components/ui";
import { StatGrid } from "../components/StatGrid";

export default function AdminDashboard() {
  const stats = useFetch("/dashboard/stats");
  const queue = useFetch("/admin/users", { verified: "false", limit: 5 });
  const s = stats.data?.stats;
  return <DashboardLayout role="admin" title="Department overview" subtitle="Monitor the alumni-student community and moderation workflow.">
    <ErrorBox onRetry={stats.reload}>{stats.error}</ErrorBox>
    <StatGrid loading={stats.loading} items={s && [["Students", s.students], ["Verified alumni", s.alumni], ["Pending verification", s.pendingVerification], ["Active opportunities", s.jobs]]} />
    <div className="dashboard-grid">
      <section className="card card-pad">
        <div className="section-title row-between">Verification queue <Link to="/admin/verification" className="link-btn">Review →</Link></div>
        {queue.loading ? <Loading /> : (queue.data?.users || []).length === 0 ? <Empty icon="✓" title="Queue is clear" text="No accounts are waiting for verification." /> :
          queue.data.users.map((u) => <div className="list-item" key={u._id}><Avatar name={u.name} /><div><strong style={{ fontSize: 13 }}>{u.name} · {u.role} · {u.registerNumber || "No register number"}</strong><div className="muted" style={{ fontSize: 11 }}>{u.email}</div></div><Status value="pending" label="Review" /></div>)}
      </section>
      <section className="card card-pad"><div className="section-title">Platform health</div>
        <Metric label="Mentorship requests (30 days)" value={s?.requestsMonth} />
        <Metric label="Sessions completed" value={s?.sessionsDone} />
      </section>
    </div>
  </DashboardLayout>;
}
function Metric({ label, value }) { return <div style={{ padding: "12px 0", borderTop: "1px solid #edf1f6" }}><div className="muted" style={{ fontSize: 12 }}>{label}</div><strong style={{ fontSize: 25, color: "var(--navy)" }}>{value ?? "–"}</strong></div>; }
