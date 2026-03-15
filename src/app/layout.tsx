import type { Metadata } from "next";
import Script from "next/script";
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
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-20 md:px-8 md:pb-6">
          {children}
        </main>
        <footer className="hidden md:block border-t border-warm-border px-8 py-10 text-warm-gray">
          <div className="mx-auto max-w-6xl flex items-start justify-between gap-12">
            <div className="flex flex-col gap-2">
              <span className="font-serif text-lg font-semibold text-foreground">Biblioteca</span>
              <p className="max-w-xs font-sans text-xs leading-relaxed">
                Organize your books. Enrich them with meaning. Discover what to read next.
              </p>
            </div>
            <div className="flex gap-12">
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">Navigate</span>
                <nav className="flex flex-col gap-1.5">
                  <a href="/" className="font-sans text-xs transition-colors hover:text-foreground">Library</a>
                  <a href="/explore" className="font-sans text-xs transition-colors hover:text-foreground">Explore</a>
                  <a href="/discover" className="font-sans text-xs transition-colors hover:text-foreground">Discover</a>
                  <a href="/about" className="font-sans text-xs transition-colors hover:text-foreground">About</a>
                  <a href="/settings" className="font-sans text-xs transition-colors hover:text-foreground">Settings</a>
                </nav>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">Project</span>
                <nav className="flex flex-col gap-1.5">
                  <a href="https://github.com/eugene-mann/Biblioteca" target="_blank" rel="noopener noreferrer" className="font-sans text-xs transition-colors hover:text-foreground">Contribute</a>
                </nav>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
