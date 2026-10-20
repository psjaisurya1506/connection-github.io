import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentDashboard from "./pages/StudentDashboard";
import AlumniDashboard from "./pages/AlumniDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Mentors from "./pages/Mentors";
import PeerMentors from "./pages/PeerMentors";
import Requests from "./pages/Requests";
import Jobs from "./pages/Jobs";
import Messages from "./pages/Messages";
import Sessions from "./pages/Sessions";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/AdminUsers";
import { roleHome, useAuth } from "./context/AuthContext";

const PAGES = {
  student: { dashboard: StudentDashboard, mentors: Mentors, requests: Requests, jobs: Jobs, messages: Messages, sessions: Sessions, profile: Profile },
  alumni: { dashboard: AlumniDashboard, mentors: PeerMentors, requests: Requests, jobs: Jobs, messages: Messages, sessions: Sessions, profile: Profile },
  admin: { dashboard: AdminDashboard, verification: AdminUsers, users: AdminUsers, jobs: Jobs, messages: Messages },
};

// Renders /:role/:page for the signed-in user's own role only.
function Workspace() {
  const { role, page } = useParams();
  const { user } = useAuth();
  const Page = PAGES[role]?.[page];
  if (!Page) return <Navigate to={user ? roleHome(user.role) : "/login"} replace />;
  return (
    <ProtectedRoute role={role}>
      <Page key={page} page={page} />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/:role/:page" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
