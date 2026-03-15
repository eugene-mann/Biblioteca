const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

// Order matters for foreign keys
const DELETE_ORDER = ["collection_books", "book_insights", "recommendations", "recommendation_topics", "collections", "library_metadata", "books"];
const INSERT_ORDER = ["books", "collections", "collection_books", "book_insights", "recommendation_topics", "recommendations", "library_metadata"];

async function restore(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  
  console.log("Deleting existing data...");
  for (const table of DELETE_ORDER) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !error.message.includes("id")) {
      // For tables without 'id' column, delete all
      await supabase.from(table).delete().gte("added_at", "1970-01-01");
    }
    console.log("  Cleared", table);
  }

  console.log("\nRestoring data...");
  for (const table of INSERT_ORDER) {
    const rows = data[table];
    if (!rows || rows.length === 0) { console.log("  " + table + ": 0 rows (skip)"); continue; }
    const { error } = await supabase.from(table).upsert(rows);
    if (error) console.error("  " + table + ": ERROR -", error.message);
    else console.log("  " + table + ":", rows.length, "rows restored");
  }
  console.log("\nDone!");
}

const file = process.argv[2];
if (!file) { console.error("Usage: node restore.js <checkpoint-file>"); process.exit(1); }
restore(file);
