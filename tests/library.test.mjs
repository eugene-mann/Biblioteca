import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

// Execute the actual TypeScript modules with isolated database dependencies.
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const { filterBooks } = load("src/lib/library-view.ts");
const base = {
  status: "all",
  favorites: false,
  category: "all",
  query: "",
  sort: "default",
  collectionIds: null,
};
const books = [
  {
    id: "a",
    title: "Dune",
    authors: ["Frank Herbert"],
    category: "Sci-Fi",
    status: "read",
    rating: 5,
    external_rating: 4.5,
    is_favorite: true,
  },
  {
    id: "b",
    title: "Foundation",
    authors: ["Isaac Asimov"],
    category: "Sci-Fi",
    status: "reading",
    rating: null,
    external_rating: 4.9,
    is_favorite: false,
  },
  {
    id: "c",
    title: "History",
    authors: ["A Writer"],
    category: "History",
    status: "read",
    rating: 4,
    external_rating: 4,
    is_favorite: true,
  },
];
test("shelf filters intersect and search matches author without case sensitivity", () => {
  assert.deepEqual(
    filterBooks(books, {
      ...base,
      status: "read",
      favorites: true,
      category: "Sci-Fi",
      query: " HERBERT ",
      collectionIds: new Set(["a", "c"]),
    }).map((b) => b.id),
    ["a"],
  );
});
test("an empty collection stays empty; clearing filters restores the shelf", () => {
  assert.equal(
    filterBooks(books, { ...base, collectionIds: new Set() }).length,
    0,
  );
  assert.equal(filterBooks(books, base).length, 3);
});
test("sorting respects personal ratings and does not mutate source order", () => {
  assert.deepEqual(
    filterBooks(books, base).map((b) => b.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(
    filterBooks(books, { ...base, sort: "rating" }).map((b) => b.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    books.map((b) => b.id),
    ["a", "b", "c"],
  );
});
function fixture(fail = false) {
  let record = {
    id: "a",
    slug: "dune",
    title: "Dune",
    status: "read",
    notes: "Old note",
    date_finished: "2025-01-01",
  };
  let writes = [];
  const supabase = {
    from() {
      let patch;
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        update(value) {
          patch = value;
          writes.push(value);
          return chain;
        },
        async single() {
          if (patch && fail)
            return { data: null, error: { message: "Database unavailable" } };
          if (patch) record = { ...record, ...patch };
          return { data: { ...record }, error: null };
        },
      };
      return chain;
    },
  };
  const api = load("src/app/api/books/[id]/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase": { supabase },
    "@/lib/changelog": { logChange: async () => {} },
  });
  return {
    writes,
    async patch(body) {
      return api.PATCH(
        new Request("http://localhost/api/books/dune", {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: "dune" }) },
      );
    },
  };
}
test("notes are persisted and returned in the saved book", async () => {
  const f = fixture();
  const response = await f.patch({ notes: "A useful reflection" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).notes, "A useful reflection");
  assert.equal(f.writes[0].notes, "A useful reflection");
});
test("invalid notes never reach the database", async () => {
  for (const notes of [42, {}, "x".repeat(50001)]) {
    const f = fixture();
    assert.equal((await f.patch({ notes })).status, 400);
    assert.equal(f.writes.length, 0);
  }
});
test("a failed notes write returns failure rather than saved", async () => {
  assert.equal((await fixture(true).patch({ notes: "Draft" })).status, 500);
});
test("reselecting a reading status preserves original finish date", async () => {
  const f = fixture();
  const response = await f.patch({ status: "read" });
  assert.equal((await response.json()).date_finished, "2025-01-01");
  assert.equal("date_finished" in f.writes[0], false);
});
