import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, ErrorBox, Loading, Pagination, Status, fmtDay } from "../components/ui";
import Button from "../components/Button";

// Serves two sidebar entries: "verification" (accounts awaiting approval) and "users" (everyone).
export default function AdminUsers({ page: mode }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const verification = mode === "verification";
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  const params = verification ? { verified: "false", active: undefined, page, limit: 10 } : { role: role || undefined, search: debounced, page, limit: 15 };
  const { data, loading, error, reload } = useFetch("/admin/users", params);

  const verify = async (u, verified) => {
    try { await api.patch(`/admin/users/${u._id}/verify`, { verified }); toast(verified ? `${u.name} verified` : `Verification revoked for ${u.name}`); reload(); }
    catch (e) { toast(errMsg(e), "error"); }
  };
  const changeRole = async (u) => {
    const newRole = u.role === "student" ? "alumni" : "student";
    if (!window.confirm(`Change ${u.name}'s account type to ${newRole}?`)) return;
    try { await api.patch(`/admin/users/${u._id}/role`, { role: newRole }); toast(`${u.name} changed to ${newRole}`); reload(); }
    catch (e) { toast(errMsg(e), "error"); }
  };
  const setActive = async (u, active) => {
    if (!active && !window.confirm(`Deactivate ${u.name}? They will no longer be able to sign in.`)) return;
    try { await api.patch(`/admin/users/${u._id}/active`, { active }); toast(active ? "User reactivated" : "User deactivated"); reload(); }
    catch (e) { toast(errMsg(e), "error"); }
  };

  return <DashboardLayout role="admin" title={verification ? "Account verification" : "All users"} subtitle={verification ? "Check each college register number against current or former college records before approval." : "Search and manage every account on the platform."}>
    {!verification && (
      <div className="card card-pad filters" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <input className="input" placeholder="Search name, email, department…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="student">Students</option><option value="alumni">Alumni</option><option value="admin">Admins</option></select>
      </div>
    )}
    <ErrorBox onRetry={reload}>{error}</ErrorBox>
    {loading ? <Loading /> : (data?.users || []).length === 0 ? <Empty icon="✓" title={verification ? "Queue is clear" : "No users found"} text={verification ? "No accounts are waiting for verification." : undefined} /> : (
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>User</th><th>Register number</th><th>Role</th><th>Department</th><th>Joined</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u._id}>
                <td><div className="row-gap"><Avatar name={u.name} size={34} /><div><strong>{u.name}</strong><div className="muted" style={{ fontSize: 11 }}>{u.email}</div></div></div></td>
                <td>{u.registerNumber || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                <td>{u.department || "—"}{u.batch ? ` · ${u.batch}` : ""}</td>
                <td>{fmtDay(u.createdAt)}</td>
                <td>{!u.isActive ? <Status value="inactive" label="Deactivated" /> : ["student", "alumni"].includes(u.role) ? <Status value={u.isVerified ? "verified" : "unverified"} label={u.isVerified ? "Verified" : "Pending"} /> : <Status value="active" label="Active" />}</td>
                <td>
                  <div className="btn-row" style={{ margin: 0, justifyContent: "flex-end" }}>
                    {["student", "alumni"].includes(u.role) && !u.isVerified && <Button onClick={() => verify(u, true)}>Verify</Button>}
                    {["student", "alumni"].includes(u.role) && u.isVerified && !verification && <Button variant="secondary" onClick={() => verify(u, false)}>Revoke</Button>}
                    {!verification && ["student", "alumni"].includes(u.role) && u._id !== me.id && <Button variant="ghost" onClick={() => changeRole(u)}>{u.role === "student" ? "Make alumni" : "Make student"}</Button>}
                    {u._id !== me.id && (u.isActive ? <Button variant="ghost" onClick={() => setActive(u, false)}>Deactivate</Button> : <Button variant="secondary" onClick={() => setActive(u, true)}>Reactivate</Button>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <Pagination page={data?.page} pages={data?.pages} onPage={setPage} />
  </DashboardLayout>;
}
