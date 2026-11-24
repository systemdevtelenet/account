"use client";

import { useEffect, useState } from "react";

type ResourceState<T> = {
  data: T | null;
  error: string;
  loading: boolean;
};

const REFRESH_INTERVAL_MS = 30_000;

/** Keeps protected, server-fetched workforce data current without browser DB credentials. */
export default function useLiveWorkforceResource<T>(url: string) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({
    data: null,
    error: "",
    loading: true,
  });

  useEffect(() => {
    let timer: number | undefined;
    let activeController: AbortController | null = null;
    let active = true;

    const load = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        const result = await response.json() as T & { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load workforce data.");
        if (active) setState({ data: result, error: "", loading: false });
      } catch (error) {
        if (controller.signal.aborted || !active) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Could not load workforce data.",
          loading: false,
        }));
      } finally {
        if (active && !controller.signal.aborted && !document.hidden) {
          timer = window.setTimeout(load, REFRESH_INTERVAL_MS);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (!document.hidden) {
        if (timer !== undefined) window.clearTimeout(timer);
        void load();
      }
    };

    void load();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      activeController?.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [url, refreshToken]);

  return { ...state, refresh: () => setRefreshToken((value) => value + 1) };
}
