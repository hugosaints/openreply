/**
 * Telling the connected account's own comments apart from everyone else's.
 *
 * Instagram identifies the same account by more than one id. A Zernio
 * connection stores the app-scoped `platformUserId` as `instagramId`, but a
 * comment written by the account arrives with its professional-account id
 * (1784...). Comparing only against `instagramId` misses every one of them, so
 * the account's own public replies were processed as new comments: each one
 * triggered another public reply, which triggered another, in a loop.
 *
 * An author is the account itself when its id is any known id of the account,
 * or — the only signal available the first time an unknown id shows up — when
 * its username is the account's username. Instagram usernames are unique, so
 * the username match cannot collide with another person.
 */

export interface AccountIdentity {
  instagramId: string;
  username?: string | null;
  instagramUserIds?: string[] | null;
}

export interface CommentAuthor {
  id?: string | null;
  username?: string | null;
}

export function normalizeUsername(username: string | null | undefined): string {
  return (username ?? "").trim().replace(/^@/, "").toLowerCase();
}

export function isOwnAccount(
  account: AccountIdentity,
  author: CommentAuthor
): boolean {
  if (author.id) {
    if (author.id === account.instagramId) return true;
    if (account.instagramUserIds?.includes(author.id)) return true;
  }
  const accountUsername = normalizeUsername(account.username);
  return accountUsername !== "" && normalizeUsername(author.username) === accountUsername;
}

/**
 * The author id to remember for the account: set when the author is the
 * account (matched by username) but its id is not one we already know.
 */
export function unknownOwnId(
  account: AccountIdentity,
  author: CommentAuthor
): string | null {
  if (!author.id || !isOwnAccount(account, author)) return null;
  if (author.id === account.instagramId) return null;
  if (account.instagramUserIds?.includes(author.id)) return null;
  return author.id;
}
