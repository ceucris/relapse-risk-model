"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createDefaultData, type DashboardData } from "@/lib/types";

type DashboardContextValue = {
  data: DashboardData;
  setData: (updater: (prev: DashboardData) => DashboardData) => void;
  loading: boolean;
  saving: boolean;
  configured: boolean;
  source: "neon" | "memory" | null;
  error: string | null;
  saveNow: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<DashboardData>(createDefaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [source, setSource] = useState<"neon" | "memory" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const persist = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataRef.current }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const json = await res.json();
      setSource(json.source);
      setError(null);
    } catch (err) {
      dirtyRef.current = true;
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist();
    }, 650);
  }, [persist]);

  const setData = useCallback(
    (updater: (prev: DashboardData) => DashboardData) => {
      startTransition(() => {
        setDataState((prev) => {
          const next = updater(prev);
          dataRef.current = next;
          return next;
        });
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        if (cancelled) return;
        setDataState(json.data);
        dataRef.current = json.data;
        setConfigured(Boolean(json.configured));
        setSource(json.source);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const onUnload = () => {
      if (!dirtyRef.current) return;
      navigator.sendBeacon?.(
        "/api/data",
        new Blob([JSON.stringify({ data: dataRef.current })], {
          type: "application/json",
        }),
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const value = useMemo(
    () => ({
      data,
      setData,
      loading,
      saving,
      configured,
      source,
      error,
      saveNow: persist,
    }),
    [data, setData, loading, saving, configured, source, error, persist],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
