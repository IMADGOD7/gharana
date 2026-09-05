"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Send, RotateCcw, XCircle, Clock } from "lucide-react";

interface SubmissionHistoryEntry {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  reviewed_by: string | null;
  created_at: string;
}

interface SubmissionTimelineProps {
  history: SubmissionHistoryEntry[];
}

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  submit: {
    label: "Submitted for review",
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  approve: {
    label: "Approved",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  reject: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  request_changes: {
    label: "Changes requested",
    icon: RotateCcw,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  create: {
    label: "Draft created",
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};

export function SubmissionTimeline({ history }: SubmissionTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">No submission history yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gray-200" />

      <div className="space-y-6">
        {history.map((entry, index) => {
          const actionConfig = (ACTION_CONFIG[entry.action as keyof typeof ACTION_CONFIG] || ACTION_CONFIG.create)!;
          const Icon = actionConfig.icon;
          const isLast = index === history.length - 0;

          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", actionConfig.bgColor)}>
                <Icon className={cn("h-4 w-4", actionConfig.color)} />
              </div>

              {/* Content */}
              <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-medium", actionConfig.color)}>
                    {actionConfig.label}
                  </p>
                  {entry.to_status && (
                    <span className="text-xs text-gray-400">
                      → {entry.to_status.replace("_", " ")}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {entry.notes && (
                  <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                    <p className="text-sm text-gray-600">{entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
