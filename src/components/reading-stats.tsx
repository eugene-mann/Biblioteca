"use client";

import type { Book } from "@/types/database";

interface ReadingStatsProps {
  books: Book[];
}

function calculateCurrentStreak(books: Book[]): number {
  const finished = books
    .filter((b) => b.date_finished)
    .map((b) => new Date(b.date_finished!));

  if (finished.length === 0) return 0;

  // Get unique months with a finished book (YYYY-MM)
  const months = new Set(
    finished.map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  );

  let streak = 0;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  // Count consecutive months backwards from current month
  while (true) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (months.has(key)) {
      streak++;
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
    } else {
      // Allow current month to not have a book yet — check previous
      if (streak === 0) {
        month--;
        if (month === 0) {
          month = 12;
          year--;
        }
        const prevKey = `${year}-${String(month).padStart(2, "0")}`;
        if (months.has(prevKey)) {
          streak++;
          month--;
          if (month === 0) {
            month = 12;
            year--;
          }
          continue;
        }
      }
      break;
    }
  }

  return streak;
}

export function ReadingStats({ books }: ReadingStatsProps) {
  const booksRead = books.filter((b) => b.status === "read").length;

  if (booksRead < 3) return null;

  const ratedBooks = books.filter((b) => b.rating != null);
  const avgRating =
    ratedBooks.length > 0
      ? (ratedBooks.reduce((sum, b) => sum + (b.rating ?? 0), 0) / ratedBooks.length).toFixed(1)
      : "—";

  const currentYear = new Date().getFullYear();
  const booksThisYear = books.filter((b) => {
    if (!b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === currentYear;
  }).length;

  const currentStreak = calculateCurrentStreak(books);

  const stats = [
    { value: String(booksRead), label: "Books Read" },
    { value: avgRating === "—" ? "—" : `${avgRating} ★`, label: "Avg Rating" },
    { value: String(booksThisYear), label: "This Year" },
    { value: `${currentStreak} mo`, label: "Streak" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-warm-border rounded-lg p-4 text-center"
        >
          <div className="font-serif text-2xl font-bold text-foreground">
            {stat.value}
          </div>
          <div className="text-xs uppercase tracking-widest text-warm-gray font-sans mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
