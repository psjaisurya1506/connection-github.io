import { Navigate, useLocation } from "react-router-dom";
import { roleHome, useAuth } from "../context/AuthContext";
import { Loading } from "./ui";

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading full />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (role && user.role !== role) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}
