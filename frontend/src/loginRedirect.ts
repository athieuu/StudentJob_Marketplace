import type { Role } from "./types";

export function loginRedirect(role: Role, from: unknown): string {
  const home = role === "STUDENT" ? "/" : `/${role.toLowerCase()}/dashboard`;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(from)) return home;
  try {
    const base = "https://studentjob.invalid";
    const url = new URL(from, base);
    if (url.origin !== base || url.pathname !== from.split(/[?#]/, 1)[0]) return home;
    const path = url.pathname.toLowerCase();
    const roleRoot = `/${role.toLowerCase()}`;
    const publicPath = path === "/" || path === "/jobs" || path.startsWith("/jobs/") || path === "/companies";
    if (publicPath || path === roleRoot || path.startsWith(`${roleRoot}/`)) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Invalid URLs use the role home.
  }
  return home;
}
