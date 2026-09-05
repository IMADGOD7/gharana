"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Feather,
  Users,
  Image,
  Send,
  Save,
  Loader2,
} from "lucide-react";
import { createProduct, updateProduct } from "@/lib/products/actions";
import type { ProductFormData } from "@/lib/products/actions";

interface ProductWizardProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormData>;
}

const STEPS = [
  { key: "basics", label: "Product Basics", icon: FileText },
  { key: "story", label: "Craft Story", icon: Feather },
  { key: "maker", label: "Meet the Maker", icon: Users },
  { key: "review", label: "Review & Submit", icon: Send },
];

interface StoryState {
  inspiration: string;
  crafting_process: string;
  materials_used: string;
  time_to_create: string;
  cultural_significance: string;
}

interface MakerState {
  name: string;
  bio: string;
  craft_technique: string;
  years_of_experience: string;
  location: string;
}

export function ProductWizard({ mode, productId, initial }: ProductWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || "",
    tags: initial?.tags || "",
    price_min: initial?.price_min || "",
    price_max: initial?.price_max || "",
    currency: initial?.currency || "INR",
  });

  const [storyData, setStoryData] = useState<StoryState>({
    inspiration: "",
    crafting_process: "",
    materials_used: "",
    time_to_create: "",
    cultural_significance: "",
  });

  const [makerData, setMakerData] = useState<MakerState>({
    name: "",
    bio: "",
    craft_technique: "",
    years_of_experience: "",
    location: "",
  });

  const updateField = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canGoNext = () => {
    if (step === 0) return formData.title.trim().length > 0 && formData.description.trim().length > 0;
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);

    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fd.set(key, String(value));
      }
    });

    try {
      if (mode === "create") {
        const result = await createProduct(fd);
        if (result.ok) {
          router.push(`/dashboard/products/${(result as { ok: true; data: { id: string } }).data.id}`);
        } else {
          setError(result.error);
        }
      } else {
        const result = await updateProduct(productId!, fd);
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setSaving(true);
    setError(null);

    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fd.set(key, String(value));
      }
    });

    try {
      if (mode === "create") {
        const result = await createProduct(fd);
        if (result.ok) {
          const productId = (result as { ok: true; data: { id: string } }).data.id;
          router.push(`/dashboard/products/${productId}`);
        } else {
          setError(result.error);
        }
      } else {
        const result = await updateProduct(productId!, fd);
        if (result.ok) {
          router.refresh();
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;

          return (
            <button
              key={s.key}
              onClick={() => i <= step && setStep(i)}
              disabled={i > step}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : i < step
                  ? "text-gray-500 hover:bg-gray-50"
                  : "text-gray-300 cursor-not-allowed"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {step === 0 && (
          <BasicsStep formData={formData} updateField={updateField} />
        )}
        {step === 1 && (
          <StoryStep storyData={storyData} setStoryData={setStoryData} />
        )}
        {step === 2 && (
          <MakerStep makerData={makerData} setMakerData={setMakerData} />
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Media Gallery</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload photos and videos after creating your product.
              </p>
            </div>
            <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
              <Image className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">Photos and videos</p>
              <p className="text-xs text-gray-400 mt-1">
                Once your product is created, you&apos;ll be able to upload photos (up to 10MB) and videos (up to 100MB) from the product page.
              </p>
            </div>
          </div>
        )}
        {step === 4 && (
          <ReviewStep formData={formData} storyData={storyData} makerData={makerData} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="btn-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="btn-secondary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save as Draft
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => canGoNext() && setStep(step + 1)}
              disabled={!canGoNext()}
              className="btn-primary"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitForReview}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit for Curation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicsStep({
  formData,
  updateField,
}: {
  formData: ProductFormData;
  updateField: (field: keyof ProductFormData, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Product Basics</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start with the essential details about your product.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700">
            Product Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="input-focus"
            placeholder="e.g., Handwoven Silk Scarf — Madhubani Pattern"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="input-focus resize-none"
            placeholder="Describe your product in detail — materials, dimensions, care instructions..."
          />
        </div>

        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={(e) => updateField("category", e.target.value)}
            className="input-focus"
          >
            <option value="">Select a category</option>
            <option value="textiles">Textiles</option>
            <option value="pottery">Pottery</option>
            <option value="jewelry">Jewelry</option>
            <option value="paintings">Paintings</option>
            <option value="sculptures">Sculptures</option>
            <option value="furniture">Furniture</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-gray-700">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            type="text"
            value={formData.tags}
            onChange={(e) => updateField("tags", e.target.value)}
            className="input-focus"
            placeholder="handmade, silk, traditional (comma-separated)"
          />
          <p className="mt-1 text-xs text-gray-400">Separate tags with commas</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price_min" className="mb-1.5 block text-sm font-medium text-gray-700">
              Min Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
              <input
                id="price_min"
                name="price_min"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_min}
                onChange={(e) => updateField("price_min", e.target.value)}
                className="input-focus pl-8"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label htmlFor="price_max" className="mb-1.5 block text-sm font-medium text-gray-700">
              Max Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
              <input
                id="price_max"
                name="price_max"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_max}
                onChange={(e) => updateField("price_max", e.target.value)}
                className="input-focus pl-8"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-gray-700">
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              type="text"
              value={formData.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className="input-focus"
              placeholder="INR"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryStep({
  storyData,
  setStoryData,
}: {
  storyData: StoryState;
  setStoryData: React.Dispatch<React.SetStateAction<StoryState>>;
}) {
  const update = (field: keyof StoryState, value: string) => {
    setStoryData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">The Craft Story & Heritage</h3>
        <p className="mt-1 text-sm text-gray-500">
          Share the inspiration, process, and cultural significance behind your creation.
        </p>
      </div>

      <div className="space-y-5">
        <FieldWrapper label="What inspired this design or collection?" required>
          <textarea
            rows={3}
            value={storyData.inspiration}
            onChange={(e) => update("inspiration", e.target.value)}
            className="input-focus resize-none"
            placeholder="Describe the inspiration behind this piece..."
          />
        </FieldWrapper>

        <FieldWrapper label="Crafting Process">
          <textarea
            rows={4}
            value={storyData.crafting_process}
            onChange={(e) => update("crafting_process", e.target.value)}
            className="input-focus resize-none"
            placeholder="Step-by-step details on how it is handcrafted..."
          />
        </FieldWrapper>

        <FieldWrapper label="Materials Used">
          <input
            type="text"
            value={storyData.materials_used}
            onChange={(e) => update("materials_used", e.target.value)}
            className="input-focus"
            placeholder="Natural materials, fabrics, metals involved..."
          />
        </FieldWrapper>

        <FieldWrapper label="Time to Create">
          <input
            type="text"
            value={storyData.time_to_create}
            onChange={(e) => update("time_to_create", e.target.value)}
            className="input-focus"
            placeholder="e.g., 3-4 days of handcrafting"
          />
        </FieldWrapper>

        <FieldWrapper label="Cultural Significance">
          <textarea
            rows={3}
            value={storyData.cultural_significance}
            onChange={(e) => update("cultural_significance", e.target.value)}
            className="input-focus resize-none"
            placeholder="Regional heritage or traditional background..."
          />
        </FieldWrapper>
      </div>
    </div>
  );
}

function MakerStep({
  makerData,
  setMakerData,
}: {
  makerData: MakerState;
  setMakerData: React.Dispatch<React.SetStateAction<MakerState>>;
}) {
  const update = (field: keyof MakerState, value: string) => {
    setMakerData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Meet the Maker</h3>
        <p className="mt-1 text-sm text-gray-500">
          Introduce the artisan behind this craft.
        </p>
      </div>

      <div className="space-y-5">
        <FieldWrapper label="Artisan Name" required>
          <input
            type="text"
            value={makerData.name}
            onChange={(e) => update("name", e.target.value)}
            className="input-focus"
            placeholder="Full name of the artisan"
          />
        </FieldWrapper>

        <FieldWrapper label="Craft Technique / Specialization">
          <input
            type="text"
            value={makerData.craft_technique}
            onChange={(e) => update("craft_technique", e.target.value)}
            className="input-focus"
            placeholder="e.g., Block printing, Handloom weaving"
          />
        </FieldWrapper>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Years of Experience">
            <input
              type="number"
              min="0"
              value={makerData.years_of_experience}
              onChange={(e) => update("years_of_experience", e.target.value)}
              className="input-focus"
              placeholder="e.g., 15"
            />
          </FieldWrapper>
          <FieldWrapper label="Location">
            <input
              type="text"
              value={makerData.location}
              onChange={(e) => update("location", e.target.value)}
              className="input-focus"
              placeholder="Village / City / State"
            />
          </FieldWrapper>
        </div>

        <FieldWrapper label="Bio">
          <textarea
            rows={4}
            value={makerData.bio}
            onChange={(e) => update("bio", e.target.value)}
            className="input-focus resize-none"
            placeholder="Tell the artisan's story — their journey, tradition, and passion..."
          />
        </FieldWrapper>
      </div>
    </div>
  );
}

function MediaStep() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Media Gallery</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload photos and videos after creating your product.
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
        <Image className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Photos and videos</p>
        <p className="text-xs text-gray-400 mt-1">
          Once your product is created, you&apos;ll be able to upload photos (up to 10MB) and videos (up to 100MB) from the product page.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  formData,
  storyData,
  makerData,
}: {
  formData: ProductFormData;
  storyData: StoryState;
  makerData: MakerState;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>
        <p className="mt-1 text-sm text-gray-500">
          Preview what customers and curators will see.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6 space-y-6">
        {/* Product Preview */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Product Details</h4>
          <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">{formData.title || "Untitled Product"}</p>
            <p className="text-sm text-gray-500">{formData.description || "No description"}</p>
            {formData.category && (
              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {formData.category}
              </span>
            )}
            {(formData.price_min || formData.price_max) && (
              <p className="text-sm font-medium text-gray-700">
                ₹{formData.price_min || "0"} — ₹{formData.price_max || "0"} {formData.currency}
              </p>
            )}
          </div>
        </div>

        {/* Story Preview */}
        {storyData.inspiration && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Craft Story</h4>
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <p className="text-sm text-gray-600">{storyData.inspiration}</p>
              {storyData.crafting_process && (
                <p className="text-sm text-gray-500 mt-2">{storyData.crafting_process}</p>
              )}
            </div>
          </div>
        )}

        {/* Maker Preview */}
        {makerData.name && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Maker</h4>
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-900">{makerData.name}</p>
              {makerData.craft_technique && (
                <p className="text-sm text-gray-500">{makerData.craft_technique}</p>
              )}
              {makerData.location && (
                <p className="text-xs text-gray-400 mt-1">{makerData.location}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldWrapper({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
