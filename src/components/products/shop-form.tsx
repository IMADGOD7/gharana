"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { upsertShop } from "@/lib/shops/actions";
import type { ShopRow } from "@/lib/shops/actions";

interface ShopFormProps {
  allShops?: ShopRow[];
  productId?: string;
  initial?: ShopRow | null;
}

function toDate(val: string | null | undefined): string {
  return val ?? "";
}

export function ShopFormClient({ productId, initial, allShops: _allShops }: ShopFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleAction(formData: FormData) {
    setError(null);
    setSuccess(false);

    if (initial?.id) {
      formData.set("shopId", initial.id);
    }

    const result = await upsertShop(formData);
    if (result.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "Failed to save shop");
    }
  }

  if (success) {
    return <Alert variant="success">Shop saved successfully.</Alert>;
  }

  return (
    <form action={handleAction} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      {initial?.id && <input type="hidden" name="shopId" value={initial.id} />}
      {productId && <input type="hidden" name="productId" value={productId} />}

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Shop Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={toDate(initial?.name)}
          className={cn("input-focus", "w-full")}
          placeholder="e.g. Gharana Crafts"
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={toDate(initial?.description)}
          className={cn("input-focus", "w-full")}
          placeholder="Brief description of your shop or brand"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={toDate(initial?.address)}
            className={cn("input-focus", "w-full")}
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
            defaultValue={toDate(initial?.city)}
            className={cn("input-focus", "w-full")}
            placeholder="City"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-gray-700">
            State / Province
          </label>
          <input
            id="state"
            name="state"
            type="text"
            defaultValue={toDate(initial?.state)}
            className={cn("input-focus", "w-full")}
            placeholder="State"
          />
        </div>
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            defaultValue={initial?.country ?? "India"}
            className={cn("input-focus", "w-full")}
            placeholder="Country"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={toDate(initial?.phone)}
            className={cn("input-focus", "w-full")}
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Shop Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={toDate(initial?.email)}
            className={cn("input-focus", "w-full")}
            placeholder="shop@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={toDate(initial?.website)}
            className={cn("input-focus", "w-full")}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label htmlFor="established_year" className="mb-1.5 block text-sm font-medium text-gray-700">
            Established Year
          </label>
          <input
            id="established_year"
            name="established_year"
            type="number"
            min="1800"
            max={new Date().getFullYear()}
            defaultValue={initial?.established_year ?? ""}
            className={cn("input-focus", "w-full")}
            placeholder="2020"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_primary"
          name="is_primary"
          type="checkbox"
          defaultChecked={initial?.is_primary}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_primary" className="text-sm text-gray-700">
          Set as primary shop
        </label>
      </div>

      <Button type="submit">{initial ? "Update shop" : "Add shop"}</Button>
    </form>
  );
}
