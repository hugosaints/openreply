"use server";

import { signOut } from "@/lib/auth";

/** Server action behind the "Sign out" item in the top bar user menu. */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
