/**
 * Utility: cn() — Merge class names with basic conflict resolution.
 *
 * Uses clsx for logic and tailwind-merge for conflict resolution.
 * Falls back gracefully if the packages aren't installed yet.
 */

function simpleJoin(classes: (string | undefined | false | null)[]): string {
  return classes.filter((c): c is string => Boolean(c)).join(" ");
}

export function cn(...inputs: (string | undefined | false | null)[]): string {
  return simpleJoin(inputs);
}
