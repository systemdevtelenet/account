"use client";

import { useEffect, useState } from "react";

type AccessResponse = {
  role: string;
  accountCode: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function buildInitials(name: string | null, email: string | null, fallback: string) {
  const source = name?.trim()
    || email?.split("@")[0]?.replace(/[._-]+/g, " ").trim()
    || "";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (source.length >= 2) return source.slice(0, 2).toUpperCase();
  return fallback;
}

export default function useCurrentRole() {
  const [roleLabel, setRoleLabel] = useState("Account User");
  const [displayName, setDisplayName] = useState("Account User");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [initials, setInitials] = useState("CT");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/access", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<AccessResponse>;
      })
      .then((access) => {
        if (!access) {
          setLoaded(true);
          return;
        }

        const nextRoleLabel = access.role === "admin"
          ? "Administrator"
          : access.accountCode
            ? `Team Lead · ${access.accountCode}`
            : "Team Lead";
        const nextEmail = access.email?.trim() ?? "";
        const nextDisplayName = access.name?.trim() || nextEmail.split("@")[0] || nextRoleLabel;
        const fallbackInitials = access.role === "admin" ? "AD" : "TL";

        setRoleLabel(nextRoleLabel);
        setDisplayName(nextDisplayName);
        setEmail(nextEmail);
        setAvatarUrl(access.avatarUrl ?? "");
        setInitials(buildInitials(access.name, nextEmail || null, fallbackInitials));
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });

    return () => controller.abort();
  }, []);

  return { roleLabel, displayName, email, avatarUrl, initials, loaded };
}
