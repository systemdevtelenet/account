"use client";

import { useState } from "react";
import Image from "next/image";

type UserAvatarProps = {
  avatarUrl: string;
  initials: string;
};

// Show the signed-in user's profile image, falling back to initials if it is
// missing or cannot be loaded. Remote avatars are served as-is because the
// auth API already validates their URL and protocol.
export default function UserAvatar({ avatarUrl, initials }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-avatar-fallback)] text-sm text-white sm:h-[37px] sm:w-[37px]">
      {showImage ? (
        <Image
          src={avatarUrl}
          alt=""
          width={37}
          height={37}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
