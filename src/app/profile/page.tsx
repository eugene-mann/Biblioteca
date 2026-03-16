"use client";

import { useState, useRef } from "react";
import { Upload, FileText, BookOpen, CheckCircle2, AlertCircle, Download } from "lucide-react";

type ImportType = "csv" | "kindle";

interface ImportResult {
  imported: number;
  skipped_duplicates: number;
  errors: string[];
  total: number;
}

async function exportLibrary() {
  const res = await fetch("/api/books");
  if (!res.ok) return;
  const books = await res.json();

  const headers = [
    "title",
    "authors",
    "category",
    "status",
    "rating",
    "isbn_13",
    "date_added",
    "date_finished",
  ];
  const csvRows = [headers.join(",")];
  for (const book of books) {
    const row = [
      `"${(book.title || "").replace(/"/g, '""')}"`,
      `"${(book.authors || []).join("; ")}"`,
      `"${book.category || ""}"`,
      `"${book.status || ""}"`,
      book.rating ?? "",
      `"${book.isbn_13 || ""}"`,
      `"${book.date_added || ""}"`,
      `"${book.date_finished || ""}"`,
    ];
    csvRows.push(row.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biblioteca-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ImportType>("csv");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setIsImporting(true);
    setResult(null);

    const content = await file.text();
    const res = await fetch("/api/books/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeTab, content }),
    });

    const data: ImportResult = await res.json();
    setResult(data);
    setIsImporting(false);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl font-bold">Profile</h1>
        <p className="font-sans text-sm text-warm-gray tracking-wider mt-1">
          Manage your library and preferences
        </p>
      </div>

      {/* Export section */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold mb-2">Export Library</h2>
        <p className="font-sans text-sm text-warm-gray mb-4">
          Download your entire library as a CSV file.
        </p>
        <button
          onClick={exportLibrary}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-warm-border rounded-sm font-sans text-sm font-medium text-foreground hover:border-foreground/30 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export as CSV
        </button>
      </section>

      <div className="h-px bg-warm-border mb-10" />

      {/* Import section */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold mb-2">Import Books</h2>
        <p className="font-sans text-sm text-warm-gray mb-4">
          Import your books from other platforms.
        </p>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 rounded-sm border border-warm-border p-1 w-fit">
          <button
            onClick={() => { setActiveTab("csv"); setResult(null); }}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 font-sans text-sm font-medium transition-colors ${
              activeTab === "csv"
                ? "bg-foreground text-background"
                : "text-warm-gray hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            CSV Import
          </button>
          <button
            onClick={() => { setActiveTab("kindle"); setResult(null); }}
            className={`flex items-center gap-2 rounded-sm px-4 py-2 font-sans text-sm font-medium transition-colors ${
              activeTab === "kindle"
                ? "bg-foreground text-background"
                : "text-warm-gray hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Kindle Import
          </button>
        </div>

        {/* Import area */}
        <div className="mt-6">
          {activeTab === "csv" ? (
            <div>
              <h3 className="font-serif text-base font-semibold">Import from Goodreads CSV</h3>
              <p className="mt-1 font-sans text-sm text-warm-gray">
                Export your Goodreads library as CSV (My Books → Import/Export → Export Library),
                then upload the file here. Books will be enriched with cover art and metadata.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-serif text-base font-semibold">Import from Kindle</h3>
              <p className="mt-1 font-sans text-sm text-warm-gray">
                Upload a text file with one book title per line. Each title will be
                matched via Google Books to pull in full metadata and covers.
              </p>
            </div>
          )}

          {/* Upload zone */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="mt-4 flex w-full flex-col items-center gap-3 rounded-sm border-2 border-dashed border-warm-border bg-card py-12 transition-colors hover:border-amber/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <div className="flex w-full flex-col items-center gap-4 px-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-warm-gray border-t-foreground" />
                <span className="font-sans text-sm text-warm-gray">
                  Importing books... This may take a moment.
                </span>
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-sm bg-muted">
                  <div className="h-full animate-progress-indeterminate rounded-sm bg-amber" />
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-warm-gray" />
                <span className="font-sans text-sm font-medium">
                  Click to upload {activeTab === "csv" ? "a .csv file" : "a .txt file"}
                </span>
                <span className="font-sans text-xs text-warm-gray">
                  {activeTab === "csv"
                    ? "Supports Goodreads CSV export format"
                    : "Plain text, one book title per line"}
                </span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={activeTab === "csv" ? ".csv" : ".txt,.text"}
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6 rounded-sm border border-warm-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
              {result.imported > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              )}
              <div className="flex-1">
                <p className="font-sans text-sm">
                  Imported <span className="font-semibold text-foreground">{result.imported}</span> of <span className="font-semibold text-foreground">{result.total}</span> books
                </p>
                {result.skipped_duplicates > 0 && (
                  <p className="mt-1 font-sans text-sm text-warm-gray">
                    {result.skipped_duplicates} duplicate{result.skipped_duplicates !== 1 ? "s" : ""} skipped
                  </p>
                )}
                {result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-sans text-sm text-warm-gray hover:text-foreground">
                      {result.errors.length} issue{result.errors.length !== 1 ? "s" : ""} — click to expand
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm text-burgundy">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="h-px bg-warm-border mb-10" />

      {/* Reading preferences (placeholder) */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold mb-2">Reading Preferences</h2>
        <p className="font-sans text-sm text-warm-gray mb-4">
          Set reading goals and notification preferences.
        </p>
        <div className="rounded-sm border border-dashed border-warm-border bg-card p-8 text-center">
          <p className="font-sans text-sm text-warm-gray">
            Coming soon — reading goals, notification preferences, and more.
          </p>
        </div>
      </section>
    </div>
  );
}
