import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { LibraryProvider } from "@/components/library-provider";
import { Playfair_Display, Libre_Franklin } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const libreFranklin = Libre_Franklin({
  variable: "--font-libre",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biblioteca",
  description: "Your personal reading curator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZGN9YJX936"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZGN9YJX936');
          `}
        </Script>
      </head>
      <body
        className={`${playfair.variable} ${libreFranklin.variable} antialiased`}
      >
        <LibraryProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Nav />
          <main id="main-content" className="app-main">
            {children}
          </main>
          <footer className="hidden md:block border-t border-warm-border px-8 py-10 text-warm-gray">
            <div className="mx-auto max-w-6xl flex items-start justify-between gap-12">
              <div className="flex flex-col gap-2">
                <span className="font-serif text-lg font-semibold text-foreground">
                  Biblioteca
                </span>
                <p className="max-w-xs font-sans text-xs leading-relaxed">
                  Organize your books. Enrich them with meaning. Discover what
                  to read next.
                </p>
              </div>
              <div className="flex gap-12">
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">
                    Navigate
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    <Link
                      href="/"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Library
                    </Link>
                    <Link
                      href="/connections"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Connections
                    </Link>
                    <Link
                      href="/discover"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Discover
                    </Link>
                    <Link
                      href="/activity"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Activity
                    </Link>
                    <Link
                      href="/profile"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Settings
                    </Link>
                  </nav>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">
                    Project
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    <a
                      href="https://github.com/eugene-mann/Biblioteca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-xs transition-colors hover:text-foreground"
                    >
                      Contribute
                    </a>
                  </nav>
                </div>
              </div>
            </div>
          </footer>
        </LibraryProvider>
      </body>
    </html>
  );
}
