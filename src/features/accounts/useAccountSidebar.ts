"use client";

import { useState, useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 64rem)";

// Subscribe to viewport changes so the sidebar switches modes after resizing.
function subscribeToDesktop(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getDesktopServerSnapshot() {
  // The server has no viewport; start with the mobile-safe state during hydration.
  return false;
}

export default function useAccountSidebar() {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () => {
    if (isDesktop) {
      setCollapsed((value) => !value);
      return;
    }

    setMobileOpen((value) => !value);
  };

  const closeMobile = () => setMobileOpen(false);

  // Keep the same toggle action while choosing desktop collapse or mobile open state.
  return {
    collapsed,
    mobileOpen,
    expanded: isDesktop ? !collapsed : mobileOpen,
    toggle,
    closeMobile,
  };
}