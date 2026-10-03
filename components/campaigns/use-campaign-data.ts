"use client";

import { useEffect, useState } from "react";
import type { AccountOption } from "@/components/account-select";
import { readCache, writeCache } from "@/lib/client-cache";

/**
 * Connected accounts for the builder. Uses the light accounts endpoint rather
 * than the dashboard stats aggregation. `defaultAccountId` is the first one.
 */
export function useCampaignAccounts() {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/accounts")
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload.success) setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { accounts, loaded, defaultAccountId: accounts[0]?.id ?? "" };
}

/**
 * The connected account's real avatar for the preview. Cache-first so it shows
 * instantly on a return visit instead of a blank circle.
 */
export function useAccountAvatar(accountId: string): string | null {
  const [state, setState] = useState<{ accountId: string; url: string | null }>({
    accountId: "",
    url: null,
  });

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    const cacheKey = `ig-avatar:${accountId}`;
    const cached = readCache<string | null>(cacheKey, 30 * 60 * 1000);
    // Hydrating state from cache is a legitimate effect use here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached.data !== null) setState({ accountId, url: cached.data });

    const params = new URLSearchParams({ instagramAccountId: accountId });
    fetch(`/api/instagram/profile?${params}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const url = payload.success ? (payload.data.profilePictureUrl ?? null) : null;
        setState({ accountId, url });
        writeCache(cacheKey, url);
      })
      .catch(() => {
        if (!cancelled && cached.data === null) setState({ accountId, url: null });
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return state.accountId === accountId ? state.url : null;
}

/**
 * postId → name of the campaign already using it on this account, so the
 * picker can flag double-assignments. `excludeId` (the campaign being edited)
 * is left out: its own post should read as selected, not "taken".
 *
 * `refreshKey` lets the wizard re-run the lookup after publishing a row of a
 * CSV import (the component stays mounted across rows).
 */
export function useUsedPosts(accountId: string, excludeId?: string, refreshKey = 0) {
  const [state, setState] = useState<{ key: string; map: Record<string, string> }>({
    key: "",
    map: {},
  });
  const key = `${accountId}|${excludeId ?? ""}|${refreshKey}`;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetch("/api/automations", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled || !payload.success) return;
        const map: Record<string, string> = {};
        for (const item of payload.data as {
          id: string;
          name: string;
          postId: string | null;
          instagramAccountId: string;
        }[]) {
          if (!item.postId || item.instagramAccountId !== accountId || item.id === excludeId) continue;
          map[item.postId] = item.name;
        }
        setState({ key, map });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, excludeId, key]);

  return state.key === key ? state.map : {};
}
