"use client";

import Image from "next/image";

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

export function BookCover({ title, coverUrl, size = "md", className = "", priority = false }: BookCoverProps) {
  const { width, height, text } = sizes[size];
  const initials = title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
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
      className={`flex items-center justify-center rounded-sm bg-muted shadow-md ${text} font-serif text-muted-foreground ${className}`}
      style={{ width, height }}
    >
      {initials}
    </div>
  );
}
