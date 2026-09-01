import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await getProfile();

  if (profile) {
    redirect("/dashboard");
  }

  redirect("/login");
}