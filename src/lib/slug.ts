export function generateSlug(title: string, authors: string[], id: string): string {
  const base = [title, ...authors]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");

  // Append short hash from UUID (first 6 chars)
  const shortHash = id.replace(/-/g, "").slice(0, 6);
  return `${base}-${shortHash}`;
}
