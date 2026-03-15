"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookPlus,
  BookMinus,
  Star,
  Tag,
  BookOpen,
  Heart,
  ChevronDown,
} from "lucide-react";
import type { BookChangelog, ChangelogAction } from "@/types/database";

type ChangelogEntry = BookChangelog & { book_slug: string | null };

const ACTION_CONFIG: Record<
  ChangelogAction,
  { icon: typeof BookPlus; label: string; color: string; bgColor: string }
> = {
  added: {
    icon: BookPlus,
    label: "Added to library",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  removed: {
    icon: BookMinus,
    label: "Removed from library",
    color: "text-red-700",
    bgColor: "bg-red-50",
  },
  rating_changed: {
    icon: Star,
    label: "Rating changed",
    color: "text-amber",
    bgColor: "bg-amber/10",
  },
  category_changed: {
    icon: Tag,
    label: "Category changed",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  status_changed: {
    icon: BookOpen,
    label: "Status changed",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
  favorite_changed: {
    icon: Heart,
    label: "Favorite updated",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function groupByDate(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function ChangeDescription({ entry }: { entry: BookChangelog }) {
  const config = ACTION_CONFIG[entry.action];

  switch (entry.action) {
    case "rating_changed": {
      const stars = (val: string | null) =>
        val ? `${"★".repeat(Number(val))}${"☆".repeat(5 - Number(val))}` : "unrated";
      return (
        <span className="text-warm-gray">
          {stars(entry.old_value)} → {stars(entry.new_value)}
        </span>
      );
    }
    case "status_changed": {
      const fmt = (v: string | null) =>
        v?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "none";
      return (
        <span className="text-warm-gray">
          {fmt(entry.old_value)} → {fmt(entry.new_value)}
        </span>
      );
    }
    case "category_changed":
      return (
        <span className="text-warm-gray">
          {entry.old_value || "Uncategorized"} → {entry.new_value || "Uncategorized"}
        </span>
      );
    case "favorite_changed":
      return (
        <span className="text-warm-gray">
          {entry.new_value === "true" ? "Marked as favorite" : "Removed from favorites"}
        </span>
      );
    default:
      return <span className="text-warm-gray">{config.label}</span>;
  }
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchEntries = useCallback(async (offset = 0) => {
    const res = await fetch(`/api/changelog?limit=50&offset=${offset}`);
    if (!res.ok) return [];
    return res.json() as Promise<ChangelogEntry[]>;
  }, []);

  useEffect(() => {
    fetchEntries().then((data) => {
      setEntries(data);
      setHasMore(data.length === 50);
      setLoading(false);
    });
  }, [fetchEntries]);

  const loadMore = async () => {
    const more = await fetchEntries(entries.length);
    setEntries((prev) => [...prev, ...more]);
    setHasMore(more.length === 50);
  };

  const grouped = groupByDate(entries);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl font-bold">Library Changelog</h1>
        <p className="font-sans text-sm text-warm-gray tracking-wider mt-1">
          A record of every change to your library
        </p>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-warm-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-warm-border rounded w-3/4" />
                <div className="h-3 bg-warm-border rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 mx-auto text-warm-gray mb-3" />
          <p className="text-warm-gray">No changes recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="font-sans text-xs font-semibold tracking-[0.15em] uppercase text-warm-gray">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-warm-border" />
                <span className="font-sans text-xs text-warm-gray">
                  {items.length} {items.length === 1 ? "change" : "changes"}
                </span>
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {items.map((entry) => {
                  const config = ACTION_CONFIG[entry.action];
                  const Icon = config.icon;
                  const href = entry.book_slug && entry.action !== "removed"
                    ? `/library/${entry.book_slug}`
                    : null;
                  const Wrapper = href
                    ? ({ children, className }: { children: React.ReactNode; className: string }) => (
                        <Link href={href} className={className}>{children}</Link>
                      )
                    : ({ children, className }: { children: React.ReactNode; className: string }) => (
                        <div className={className}>{children}</div>
                      );
                  return (
                    <Wrapper
                      key={entry.id}
                      className={`flex items-start gap-3 py-3 px-3 -mx-3 rounded-sm transition-colors hover:bg-card ${href ? "cursor-pointer" : ""}`}
                    >
                      {/* Icon */}
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}
                      >
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Cover thumbnail */}
                      {entry.book_cover_url && (
                        <div className="shrink-0 w-8 h-12 rounded-sm overflow-hidden shadow-sm">
                          <Image
                            src={entry.book_cover_url}
                            alt=""
                            width={32}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-semibold truncate">
                          {entry.book_title}
                        </p>
                        <div className="text-xs mt-0.5">
                          <ChangeDescription entry={entry} />
                        </div>
                      </div>

                      {/* Time */}
                      <span className="shrink-0 font-sans text-[10px] text-warm-gray mt-0.5">
                        {formatDate(entry.created_at)}
                      </span>
                    </Wrapper>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                className="inline-flex items-center gap-2 px-6 py-2 border border-warm-border font-sans text-xs font-medium tracking-wider uppercase text-warm-gray hover:text-foreground hover:border-foreground transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
