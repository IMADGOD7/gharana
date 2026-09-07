"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Feather,
  Users,
  Image as ImageLucide,
  Send,
  Save,
  Loader2,
} from "lucide-react";
import {
  submitProduct,
  upsertProductDraft,
  type AutosaveStatus,
} from "@/lib/products/actions";
import type { ProductFormData } from "@/lib/products/actions";

const STORAGE_KEY = "pandaverse-wizard-recovery";

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

interface ProductWizardProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormData>;
}

const STEPS = [
  { key: "basics", label: "Product Basics", icon: FileText },
  { key: "story", label: "Craft Story", icon: Feather },
  { key: "maker", label: "Meet the Maker", icon: Users },
  { key: "media", label: "Media Gallery", icon: ImageLucide },
  { key: "review", label: "Review & Submit", icon: Send },
];

interface SavedDraftState {
  formData: ProductFormData;
  storyData: StoryState;
  makerData: MakerState;
  productId?: string;
  savedAt: number;
}

function loadRecoveryState(): SavedDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraftState;
    if (!parsed?.formData || !parsed?.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearRecoveryState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function saveRecoveryState(state: SavedDraftState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function buildFormData(formData: ProductFormData): FormData {
  const fd = new FormData();
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      fd.set(key, String(value));
    }
  });
  return fd;
}

function CheckSvg({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertSvg({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function ProductWizard({ mode, productId, initial }: ProductWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [touched, setTouched] = useState(false);

  const productIdRef = useRef<string | undefined>(productId);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);

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

  // Restore from local recovery on mount
  useEffect(() => {
    const recovery = loadRecoveryState();
    if (!recovery) return;

    const isStale = Date.now() - recovery.savedAt > 24 * 60 * 60 * 1000;
    if (isStale) {
      clearRecoveryState();
      return;
    }

    // If the user returned with a valid productId in recovery, use it.
    if (recovery.productId && !productIdRef.current) {
      productIdRef.current = recovery.productId;
    }

    setFormData(recovery.formData);
    setStoryData(recovery.storyData);
    setMakerData(recovery.makerData);
    setTouched(true);
    setAutosaveStatus("error");
    setError("You have unsaved local changes. They have been restored from your last session.");
  }, []);

  // Persist to localStorage whenever local state changes
  const persistLocalState = useCallback(() => {
    const state: SavedDraftState = {
      formData,
      storyData,
      makerData,
      productId: productIdRef.current,
      savedAt: Date.now(),
    };
    saveRecoveryState(state);
  }, [formData, storyData, makerData]);

  // Debounced autosave: fires 2 seconds after last change
  useEffect(() => {
    if (isSubmittingRef.current) return;

    // Don't autosave an untouched blank form
    if (!touched) return;

    setAutosaveStatus("idle");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const fd = buildFormData(formData);
      try {
        setAutosaveStatus("saving");
        const result = await upsertProductDraft(productIdRef.current, fd);
        if (result.ok) {
          if (result.productId && !productIdRef.current) {
            productIdRef.current = result.productId;
          }
          setAutosaveStatus("saved");
          clearRecoveryState();
        } else {
          setAutosaveStatus("error");
          setError(result.error || "Autosave failed. Your changes are saved locally.");
          persistLocalState();
        }
      } catch {
        setAutosaveStatus("error");
        setError("Network error. Your changes are saved locally.");
        persistLocalState();
      }
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, storyData, makerData, touched, persistLocalState]);

  const updateField = (field: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched(true);
  };

  const canGoNext = () => {
    if (step === 0) {
      if (formData.title.trim().length > 0 || formData.description.trim().length > 0) {
        setTouched(true);
      }
      return formData.title.trim().length > 0 && formData.description.trim().length > 0;
    }
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);

    const fd = buildFormData(formData);

    try {
      const result = await upsertProductDraft(productIdRef.current, fd);
      if (result.ok) {
        if (result.productId && !productIdRef.current) {
          productIdRef.current = result.productId;
        }
        clearRecoveryState();
        setAutosaveStatus("saved");
      } else {
        setError(result.error ?? "Autosave failed. Your changes are saved locally.");
        setAutosaveStatus("error");
        persistLocalState();
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setAutosaveStatus("error");
      persistLocalState();
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError(null);

    // First ensure the latest draft is persisted
    const fd = buildFormData(formData);
    try {
      const draftResult = await upsertProductDraft(productIdRef.current, fd);
      if (!draftResult.ok) {
        setError(draftResult.error || "Could not save draft before submission.");
        setSaving(false);
        isSubmittingRef.current = false;
        return;
      }
      if (draftResult.productId && !productIdRef.current) {
        productIdRef.current = draftResult.productId;
      }
      clearRecoveryState();
    } catch {
      setError("Could not save draft before submission. Please try again.");
      setSaving(false);
      isSubmittingRef.current = false;
      return;
    }

    if (!productIdRef.current) {
      setError("Could not determine product ID. Please save as draft first.");
      setSaving(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const submitResult = await submitProduct(productIdRef.current);
      if (!submitResult.ok) {
        setError(submitResult.error);
        setSaving(false);
        isSubmittingRef.current = false;
        return;
      }
      router.push(`/dashboard/products/${productIdRef.current}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  // Before unload: persist to localStorage so we don't lose work
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      persistLocalState();
      if (autosaveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [autosaveStatus, persistLocalState]);

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
      {error && touched && (
        <div role="alert" aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Autosave Status */}
      {autosaveStatus === "saving" && (
        <div className="flex items-center gap-2 text-sm text-gray-500" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving draft...
        </div>
      )}
      {autosaveStatus === "saved" && (
        <div className="flex items-center gap-2 text-sm text-emerald-600" aria-live="polite">
          <CheckSvg className="h-4 w-4" />
          Draft saved
        </div>
      )}
      {autosaveStatus === "error" && !error && (
        <div className="flex items-center gap-2 text-sm text-amber-600" role="status" aria-live="polite">
          <AlertSvg className="h-4 w-4" />
          Changes saved locally — will sync when connection restores
        </div>
      )}

      {/* Split-Screen Layout: Form (left) + Live Preview (right, sticky) */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Left Column: Step Content + Navigation */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {step === 0 && (
              <BasicsStep formData={formData} updateField={updateField} />
            )}
            {step === 1 && (
              <StoryStep storyData={storyData} setStoryData={setStoryData} setTouched={setTouched} />
            )}
            {step === 2 && (
              <MakerStep makerData={makerData} setMakerData={setMakerData} setTouched={setTouched} />
            )}
            {step === 3 && (
              <MediaGalleryStep productId={productId} mode={mode} />
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
                  title={!canGoNext() ? "Please fill in the required fields before continuing" : undefined}
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

        {/* Right Column: Live Preview Panel (sticky on desktop) */}
        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-6">
            <LivePreviewPanel
              step={step}
              formData={formData}
              storyData={storyData}
              makerData={makerData}
            />
          </div>
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
  setTouched,
}: {
  storyData: StoryState;
  setStoryData: React.Dispatch<React.SetStateAction<StoryState>>;
  setTouched: (v: boolean) => void;
}) {
  const update = (field: keyof StoryState, value: string) => {
    setStoryData((prev) => ({ ...prev, [field]: value }));
    setTouched(true);
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
  setTouched,
}: {
  makerData: MakerState;
  setMakerData: React.Dispatch<React.SetStateAction<MakerState>>;
  setTouched: (v: boolean) => void;
}) {
  const update = (field: keyof MakerState, value: string) => {
    setMakerData((prev) => ({ ...prev, [field]: value }));
    setTouched(true);
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

/* ============================================================
 * Step 4: Media Gallery
 * Placeholder for now — full integration with MediaGallery
 * component requires productId to be available on creation mode.
 * ============================================================ */
function MediaGalleryStep({ productId: _productId, mode }: { productId?: string; mode: "create" | "edit" }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Media Gallery</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload photos and videos to showcase your product.
        </p>
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
        <ImageLucide className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Photos and videos</p>
        <p className="text-xs text-gray-400 mt-1">
          {mode === "create"
            ? "Save your product as a draft first, then upload photos and videos from the product page."
            : "Once your product is saved, you can upload photos (up to 10MB) and videos (up to 100MB)."}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Live Preview Panel (Right Column, Sticky)
 * Consumes wizard state directly — adapts to current step.
 * ============================================================ */
function LivePreviewPanel({
  step,
  formData,
  storyData,
  makerData,
}: {
  step: number;
  formData: ProductFormData;
  storyData: StoryState;
  makerData: MakerState;
}) {
  const hasProduct = formData.title.trim().length > 0;
  const hasStory = storyData.inspiration.trim().length > 0 || storyData.crafting_process.trim().length > 0;
  const hasMaker = makerData.name.trim().length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Preview Header */}
      <div className="border-b border-gray-100 px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Customer Preview</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Product Card */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Product Details</h4>
          {hasProduct ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">{formData.title || "Untitled Product"}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{formData.description || "No description"}</p>
              <div className="flex flex-wrap gap-1.5">
                {formData.category && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {formData.category}
                  </span>
                )}
                {(formData.tags || "")
                  .split(",")
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((tag) => (
                    <span key={tag.trim()} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {tag.trim()}
                    </span>
                  ))}
              </div>
              {(formData.price_min || formData.price_max) && (
                <p className="text-sm font-medium text-gray-700">
                  ₹{formData.price_min || "0"} — ₹{formData.price_max || "0"} {formData.currency}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Fill in product details to see a preview</p>
          )}
        </div>

        {/* Story Card */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Craft Story</h4>
          {hasStory ? (
            <div className="space-y-2">
              {storyData.inspiration && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inspiration</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{storyData.inspiration}</p>
                </div>
              )}
              {storyData.crafting_process && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Crafting Process</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{storyData.crafting_process}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Add your craft story to see it here</p>
          )}
        </div>

        {/* Maker Card */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Maker</h4>
          {hasMaker ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">{makerData.name}</p>
              {makerData.craft_technique && (
                <p className="text-xs text-gray-500">{makerData.craft_technique}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                {makerData.years_of_experience && <span>{makerData.years_of_experience} years exp.</span>}
                {makerData.location && <span>{makerData.location}</span>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Add artisan details to see a preview</p>
          )}
        </div>

        {/* Step indicator */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Step {step + 1} of {STEPS.length} — {STEPS[step]?.label ?? ""}
          </p>
        </div>
      </div>
    </div>
  );
}
