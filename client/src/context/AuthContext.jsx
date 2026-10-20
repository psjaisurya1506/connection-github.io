import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getToken, setToken } from "../api";
import { connectSocket, disconnectSocket } from "../socket";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const roleHome = (role) => `/${role}/dashboard`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    disconnectSocket();
    setSocket(null);
  }, []);

  // Set the user and open the realtime connection together.
  const startSession = useCallback((u) => {
    setUser(u);
    setSocket(connectSocket(getToken()));
  }, []);

  // Restore session on refresh
  useEffect(() => {
    if (!getToken()) return;
    api.get("/auth/me")
      .then((r) => startSession(r.data.user))
      .catch((e) => { if (e?.response?.status === 401 || e?.response?.status === 403) setToken(null); })
      .finally(() => setLoading(false));
  }, [startSession]);

  useEffect(() => {
    window.addEventListener("auth:expired", signOut);
    return () => window.removeEventListener("auth:expired", signOut);
  }, [signOut]);

  const signIn = useCallback((data) => {
    setToken(data.token);
    startSession(data.user);
  }, [startSession]);

  const value = useMemo(() => ({ user, setUser, loading, signIn, signOut, socket }), [user, loading, signIn, signOut, socket]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
