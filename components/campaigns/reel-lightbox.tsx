"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";

export interface PlayingReel {
  url: string;
  postUrl: string | null;
}

/** Full-screen reel player used by campaign thumbnails. */
export default function ReelLightbox({
  reel,
  onClose,
}: {
  reel: PlayingReel | null;
  onClose: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!reel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reel, onClose]);

  if (!reel) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Play reel preview")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-w-full flex-col items-end gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-4 text-sm">
          {reel.postUrl && (
            <a
              href={reel.postUrl}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white"
            >
              {t("Open on Instagram")}
            </a>
          )}
          <button type="button" onClick={onClose} className="text-zinc-300 hover:text-white">
            {t("Close")}
          </button>
        </div>
        <video
          src={reel.url}
          controls
          autoPlay
          loop
          playsInline
          className="max-h-[80vh] max-w-full rounded-lg"
        />
      </div>
    </div>
  );
}
