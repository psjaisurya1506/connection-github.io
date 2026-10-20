import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api";

// Small data-loading hook: { data, loading, error, reload, setData }
// - `loading` is true while the first response for the current params is pending
// - `reload()` refetches in the background and keeps the current data on screen
export default function useFetch(url, params) {
  const key = JSON.stringify(params || {});
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    let alive = true;
    api.get(url, { params: JSON.parse(key) })
      .then((r) => alive && setState({ key, data: r.data, error: "" }))
      .catch((e) => alive && setState((s) => ({ ...s, key, error: errMsg(e) })));
    return () => { alive = false; };
  }, [url, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === "function" ? fn(s.data) : fn })), []);
  const current = state.key === key;
  return { data: state.data, loading: !current, error: current ? state.error : "", reload, setData };
}
