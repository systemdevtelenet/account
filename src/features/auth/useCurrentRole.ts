"use client";

import { useEffect, useState } from "react";

export default function useCurrentRole() {
  const [roleLabel, setRoleLabel] = useState("Account User");
  const [initials, setInitials] = useState("CT");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/access", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ role: string; accountCode: string | null }>;
      })
      .then((access) => {
        if (!access) return;
        if (access.role === "admin") {
          setRoleLabel("Administrator");
          setInitials("AD");
        } else {
          setRoleLabel(access.accountCode ? `Team Lead · ${access.accountCode}` : "Team Lead");
          setInitials("TL");
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return { roleLabel, initials };
}
