"use client";

import Image from "next/image";
import { useState } from "react";

interface BookCoverProps {
  title: string;
  coverUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const sizes = {
  sm: { width: 80, height: 120, text: "text-xs" },
  md: { width: 128, height: 192, text: "text-sm" },
  lg: { width: 200, height: 300, text: "text-base" },
};

export function BookCover({
  title,
  coverUrl,
  size = "md",
  className = "",
  priority = false,
}: BookCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const { width, height, text } = sizes[size];
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (coverUrl && coverUrl !== failedUrl && /^https?:\/\//.test(coverUrl)) {
    return (
      <Image
        src={coverUrl}
        onError={() => setFailedUrl(coverUrl)}
        unoptimized={
          !/^https:\/\/(books\.google\.com|covers\.openlibrary\.org|[a-z0-9-]+\.supabase\.co)\//.test(
            coverUrl,
          )
        }
        alt={title}
        width={width}
        height={height}
        className={`rounded-sm object-cover shadow-md ${className}`}
        style={{ width, height }}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${title} — cover unavailable`}
      className={`book-fallback flex items-center justify-center rounded-sm bg-muted shadow-md ${text} font-serif text-muted-foreground ${className}`}
      style={{ width, height }}
    >
      <span className="px-3 text-center">
        <span className="block text-3xl opacity-50">{initials}</span>
        <span className="mt-3 block line-clamp-3 text-[10px] leading-relaxed">
          {title}
        </span>
      </span>
    </div>
  );
}
