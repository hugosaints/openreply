export const GITHUB_URL = "https://github.com/diwenne/openreply";
export const SETUP_DOCS_URL = `${GITHUB_URL}/blob/main/docs/setup.md`;
export const ZERNIO_DOCS_URL = `${GITHUB_URL}/blob/main/docs/zernio.md`;

export function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}

export async function getGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/diwenne/openreply", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
}
