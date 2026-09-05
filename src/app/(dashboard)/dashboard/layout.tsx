import { getProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <DashboardLayoutClient profile={profile}>{children}</DashboardLayoutClient>
  );
}
