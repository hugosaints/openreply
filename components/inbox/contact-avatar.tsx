"use client";

import { handleInitials, toneIndex } from "@/lib/inbox/thread";
import { useState } from "react";

const TONES = [
  "bg-[#eef0fe] text-[#4f46e5]",
  "bg-[#e3f6ef] text-[#1f8a66]",
  "bg-[#fdf3e3] text-[#b45f06]",
  "bg-[#fdecec] text-[#c42b2b]",
  "bg-[#e6f4fb] text-[#0e7aa8]",
  "bg-[#f3ecfd] text-[#7c3aed]",
];

interface ContactAvatarProps {
  username: string | null;
  name?: string | null;
  /** Profile picture URL. Instagram CDN links expire, so initials are the fallback. */
  picture?: string | null;
  seed: string;
  size?: "sm" | "md";
  /** Show the "awaiting reply" dot. */
  indicator?: boolean;
}

export default function ContactAvatar({
  username,
  name,
  picture,
  seed,
  size = "md",
  indicator = false,
}: ContactAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const dims = size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  const showPicture = Boolean(picture) && failedSrc !== picture;
  return (
    <span className="relative inline-flex shrink-0">
      {showPicture ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote, expiring CDN URL
        <img
          src={picture!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(picture!)}
          className={`rounded-full object-cover ${dims}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`flex items-center justify-center rounded-full font-semibold ${dims} ${TONES[toneIndex(seed, TONES.length)]}`}
        >
          {handleInitials(username ?? name ?? null)}
        </span>
      )}
      {indicator && (
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-accent" />
      )}
    </span>
  );
}
