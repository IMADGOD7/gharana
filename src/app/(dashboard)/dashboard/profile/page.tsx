import { getProfile } from "@/lib/auth/session";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="mt-1 text-gray-500">Manage your account settings</p>
      <div className="mt-8 max-w-xl">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}