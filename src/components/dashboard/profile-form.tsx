"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { User, Store, Lock, Save, Loader2 } from "lucide-react";

type Tab = "personal" | "brand" | "security";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string | null;
}

interface ProfileFormProps {
  profile: ProfileData;
}

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "personal", label: "Personal Details", icon: User },
  { key: "brand", label: "Brand & Workshop", icon: Store },
  { key: "security", label: "Security", icon: Lock },
];

export function ProfileForm({ profile }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
          {profile.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
          <p className="text-sm text-gray-500">{profile.email}</p>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 mt-1">
            Verified Partner
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setMessage(null);
                setError(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {activeTab === "personal" && (
          <PersonalTab profile={profile} onSuccess={(msg) => setMessage(msg)} onError={(err) => setError(err)} />
        )}
        {activeTab === "brand" && (
          <BrandTab onSuccess={(msg) => setMessage(msg)} onError={(err) => setError(err)} />
        )}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}

function PersonalTab({ profile, onSuccess, onError }: {
  profile: ProfileData;
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}) {
  async function handleSubmit(formData: FormData) {
    onError("");
    const result = await updateProfile(null, formData);
    if (result.ok) {
      onSuccess("Profile updated successfully");
    } else {
      onError(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
        <p className="mt-1 text-sm text-gray-500">Update your personal information</p>
      </div>

      <form action={handleSubmit} className="space-y-5" suppressHydrationWarning>
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            defaultValue={profile.full_name}
            suppressHydrationWarning
            className="input-focus"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="input-focus bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            suppressHydrationWarning
            className="input-focus"
            placeholder="+91 98765 43210"
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

function BrandTab({ onSuccess, onError }: {
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}) {
  async function handleSubmit(formData: FormData) {
    onError("");
    // TODO: Implement brand profile update server action
    onSuccess("Brand profile updated successfully");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Brand & Workshop Profile</h3>
        <p className="mt-1 text-sm text-gray-500">Tell customers about your brand and workshop</p>
      </div>

      <form action={handleSubmit} className="space-y-5" suppressHydrationWarning>
        <div>
          <label htmlFor="brand_name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Brand Name
          </label>
          <input
            id="brand_name"
            name="brand_name"
            type="text"
            className="input-focus"
            placeholder="Your brand or studio name"
          />
        </div>

        <div>
          <label htmlFor="brand_tagline" className="mb-1.5 block text-sm font-medium text-gray-700">
            Brand Tagline
          </label>
          <input
            id="brand_tagline"
            name="brand_tagline"
            type="text"
            className="input-focus"
            placeholder="A short tagline for your brand"
          />
        </div>

        <div>
          <label htmlFor="brand_bio" className="mb-1.5 block text-sm font-medium text-gray-700">
            Workshop Story / Bio
          </label>
          <textarea
            id="brand_bio"
            name="brand_bio"
            rows={4}
            className="input-focus resize-none"
            placeholder="Tell the story of your craft and workshop..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              className="input-focus"
              placeholder="Street address"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              className="input-focus"
              placeholder="City"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              id="state"
              name="state"
              type="text"
              className="input-focus"
              placeholder="State"
            />
          </div>
          <div>
            <label htmlFor="postal_code" className="mb-1.5 block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              id="postal_code"
              name="postal_code"
              type="text"
              className="input-focus"
              placeholder="PIN code"
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            className="input-focus"
            placeholder="https://your-website.com"
          />
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Security</h3>
        <p className="mt-1 text-sm text-gray-500">Manage your account security</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Password</h4>
          <p className="text-xs text-gray-500 mt-1">Change your account password</p>
          <button
            type="button"
            className="btn-secondary mt-3 text-xs"
          >
            Change Password
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Active Sessions</h4>
          <p className="text-xs text-gray-500 mt-1">You have 1 active session</p>
        </div>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save Changes
        </>
      )}
    </button>
  );
}
