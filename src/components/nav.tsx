"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Settings, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchBar } from "./search-bar";

const navItems = [
  { href: "/", label: "Library", icon: BookOpen },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About", icon: Info },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top nav — sticky frosted glass */}
      <nav className="hidden md:flex items-center gap-6 sticky top-0 z-50 border-b border-warm-border bg-background/92 backdrop-blur-md px-8 py-3">
        <Link
          href="/"
          className="shrink-0 font-serif italic text-xl font-semibold text-amber"
        >
          Biblioteca
        </Link>
        <SearchBar />
        <div className="flex shrink-0 items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/library")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "font-sans uppercase tracking-[0.15em] text-xs font-medium py-1 transition-colors border-b-2",
                  isActive
                    ? "text-foreground border-amber"
                    : "text-warm-gray hover:text-foreground border-transparent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav — fixed frosted glass */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-warm-border bg-background/92 backdrop-blur-md py-2 md:hidden">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/library")
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 font-sans uppercase tracking-[0.15em] text-[10px] font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-warm-gray"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-amber" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
