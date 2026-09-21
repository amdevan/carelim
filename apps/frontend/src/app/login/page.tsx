import { redirect } from "next/navigation";

// The login screen lives on the root page; /login is kept as a valid alias
// (referenced by api.ts / api-client.ts session-expiry redirects and bookmarks).
export default function LoginPage() {
  redirect("/");
}
