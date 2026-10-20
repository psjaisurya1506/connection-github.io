import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

const TOKEN_KEY = "eec_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// An expired/invalid token anywhere signs the user out.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && getToken() && !url.includes("/auth/login")) {
      setToken(null);
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(err);
  }
);

const SERVER_DOWN = "Cannot reach the server. Make sure the backend is running and MongoDB is connected, then refresh.";
export const errMsg = (e) => {
  const status = e?.response?.status;
  // A proxy/host answers 500/502/503/504 with an HTML or empty body when the API process is down.
  const apiMessage = typeof e?.response?.data === "object" ? e.response.data?.message : null;
  if (apiMessage) return apiMessage;
  if (e?.code === "ERR_NETWORK" || [500, 502, 503, 504].includes(status)) return SERVER_DOWN;
  return e?.message || "Something went wrong";
};

export default api;
