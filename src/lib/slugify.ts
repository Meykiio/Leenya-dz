/**
 * Generate a URL-safe slug from a business or service name.
 * 
 * Process:
 * 1. Convert to lowercase and trim whitespace
 * 2. Normalize Unicode characters (remove accents)
 * 3. Remove special characters (keep only a-z, 0-9, spaces, hyphens)
 * 4. Replace spaces with hyphens
 * 5. Collapse multiple hyphens
 * 6. Strip leading/trailing hyphens
 * 7. Append random 4-character suffix for uniqueness
 * 
 * @param name - The name to slugify (e.g., "Salon XYZ")
 * @returns URL-safe slug with random suffix (e.g., "salon-xyz-a1b2")
 * 
 * @example
 * generateSlug("Salon XYZ") // → "salon-xyz-x9k2" (random suffix)
 * generateSlug("Café & More") // → "cafe-more-a3b7"
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).substring(2, 6);
  return base ? `${base}-${suffix}` : suffix;
}
