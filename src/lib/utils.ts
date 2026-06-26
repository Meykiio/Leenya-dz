import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and merges Tailwind classes efficiently.
 * Uses tailwind-merge to resolve Tailwind CSS class conflicts (e.g., "px-2 px-4" → "px-4").
 * 
 * @param inputs - Array of class values (strings, objects, arrays, or falsy values)
 * @returns Merged Tailwind class string
 * 
 * @example
 * cn("px-2", "px-4") // → "px-4"
 * cn("text-red", { "text-blue": true }) // → "text-blue"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
