"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Sparkles, Clock, User, Search } from "lucide-react";
import { SearchBar } from "./search-bar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
const items = [
  { href: "/", label: "Library", icon: BookOpen },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/activity", label: "Activity", icon: Clock },
  { href: "/profile", label: "Profile", icon: User },
];
export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("biblioteca:search", show);
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("biblioteca:search", show);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  const active = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/library")
      : pathname.startsWith(href);
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="wordmark">
            <span className="brand-seal">
              <BookOpen className="h-4 w-4" />
            </span>
            Biblioteca<span className="brand-period">.</span>
          </Link>
          <nav aria-label="Main navigation" className="desktop-nav">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setOpen(true)}
            className="nav-search"
            aria-label="Search books"
          >
            <Search className="h-4 w-4" />
            <span>Search books</span>
            <kbd>⌘ K</kbd>
          </button>
          <Link
            href="/profile"
            className="nav-avatar"
            aria-label="Your reading profile"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href) ? "page" : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-xl !p-6">
          <DialogTitle className="!font-serif !text-2xl">
            Find your next chapter.
          </DialogTitle>
          <DialogDescription>
            Search your library or find a new book to add.
          </DialogDescription>
          <SearchBar onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
