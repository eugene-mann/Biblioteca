import type { Metadata } from "next";
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
      <body
        className={`${playfair.variable} ${libreFranklin.variable} antialiased`}
      >
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 pb-20 md:px-8 md:pb-6">
          {children}
        </main>
      </body>
    </html>
  );
}
