/**
 * Import books from a simple name,author CSV via the local dev server.
 * Usage: npx tsx scripts/import-csv.ts /path/to/file.csv
 */

import { readFileSync } from "fs";

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Usage: npx tsx scripts/import-csv.ts <path-to-csv>");
  process.exit(1);
}

const BASE = "http://localhost:3000";

interface SearchResult {
  title: string;
  authors: string[];
  cover_image_url: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
  amazon_link: string | null;
  [key: string]: unknown;
}

async function searchBook(title: string, author: string): Promise<SearchResult | null> {
  const query = `${title} ${author}`;
  const res = await fetch(`${BASE}/api/books/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return null;
  const results: SearchResult[] = await res.json();
  if (!results.length) return null;

  // Find best match — prefer exact title match
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = results.find(
    (r) => r.title.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
  );
  return match ?? results[0];
}

async function addBook(book: SearchResult): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${BASE}/api/books/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(book),
  });
  return { ok: res.ok, status: res.status };
}

async function main() {
  const csv = readFileSync(CSV_PATH, "utf-8");
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} books to import\n`);

  let imported = 0;
  let duplicates = 0;
  let notFound = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    // Parse CSV line (handles quoted fields with commas)
    let name: string, author: string;
    if (line.startsWith('"')) {
      const closeQuote = line.indexOf('"', 1);
      name = line.slice(1, closeQuote);
      author = line.slice(closeQuote + 2); // skip ",
    } else {
      const commaIdx = line.indexOf(",");
      name = line.slice(0, commaIdx);
      author = line.slice(commaIdx + 1);
    }

    if (!name) continue;

    process.stdout.write(`[${i + 1}/${dataLines.length}] ${name}... `);

    // Search Google Books
    const result = await searchBook(name, author);
    if (!result) {
      console.log("NOT FOUND");
      notFound++;
      errors.push(`Not found: "${name}" by ${author}`);
      continue;
    }

    // Add to library
    const { ok, status } = await addBook(result);
    if (ok) {
      console.log("OK");
      imported++;
    } else if (status === 409) {
      console.log("DUPLICATE");
      duplicates++;
    } else {
      console.log(`FAILED (${status})`);
      failed++;
      errors.push(`Failed: "${name}" (status ${status})`);
    }

    // Small delay to avoid hammering Google Books API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n--- Import Summary ---`);
  console.log(`Imported:   ${imported}`);
  console.log(`Duplicates: ${duplicates}`);
  console.log(`Not found:  ${notFound}`);
  console.log(`Failed:     ${failed}`);
  if (errors.length) {
    console.log(`\nIssues:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
