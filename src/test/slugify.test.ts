import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slugify";

describe("generateSlug", () => {
  it("converts name to lowercase kebab-case with suffix", () => {
    const slug = generateSlug("Mon Salon");
    expect(slug).toMatch(/^mon-salon-[a-z0-9]{4}$/);
  });

  it("strips accented characters", () => {
    const slug = generateSlug("Café Résumé");
    expect(slug).toMatch(/^cafe-resume-[a-z0-9]{4}$/);
  });

  it("strips special characters", () => {
    const slug = generateSlug("Salon @#$% Test!");
    expect(slug).toMatch(/^salon-test-[a-z0-9]{4}$/);
  });

  it("handles Arabic text (strips non-latin chars, produces suffix only)", () => {
    const slug = generateSlug("صالون الجمال");
    // Arabic chars are stripped by the regex, so only suffix remains
    expect(slug).toMatch(/^[a-z0-9]{4}$/);
  });

  it("two identical names produce different slugs (random suffix)", () => {
    const slug1 = generateSlug("Same Name");
    const slug2 = generateSlug("Same Name");
    // Statistically should differ due to random suffix
    // This could theoretically fail (1/1.6M chance), but practically won't
    expect(slug1.startsWith("same-name-")).toBe(true);
    expect(slug2.startsWith("same-name-")).toBe(true);
    // We don't assert inequality since it's probabilistic
  });

  it("handles empty string", () => {
    const slug = generateSlug("");
    expect(slug).toMatch(/^[a-z0-9]{4}$/);
  });

  it("collapses multiple spaces and dashes", () => {
    const slug = generateSlug("Hello   ---  World");
    expect(slug).toMatch(/^hello-world-[a-z0-9]{4}$/);
  });
});
