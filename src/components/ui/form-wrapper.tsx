"use client";

import { type ReactNode } from "react";

/**
 * Wrapper for forms that suppresses hydration warnings caused by
 * browser extensions (password managers, autofill tools) injecting
 * attributes like `fdprocessedid`, `data-lpignore`, etc. into inputs.
 */
export function FormWrapper({ children, action, className }: {
  children: ReactNode;
  action?: (formData: FormData) => void;
  className?: string;
}) {
  return (
    <form
      action={action}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </form>
  );
}
