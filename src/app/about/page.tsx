"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Github } from "lucide-react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    el.querySelectorAll("[data-animate]").forEach((child) =>
      observer.observe(child)
    );

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function AboutPage() {
  const revealRef = useScrollReveal();

  return (
    <div ref={revealRef} className="-mx-4 -mt-6 md:-mx-8">
      {/* Hero */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(200,149,108,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(122,46,46,0.05) 0%, transparent 70%)"
        }} />
        <p className="font-sans text-[0.7rem] font-semibold tracking-[0.35em] uppercase text-amber mb-8 animate-[fadeUp_0.8s_ease_0.2s_both]">
          A Personal Reading Curator
        </p>
        <h1 className="font-serif font-black text-[clamp(3.5rem,10vw,9rem)] leading-[0.9] tracking-tight text-[#1A1408] mb-8 animate-[fadeUp_1s_ease_0.4s_both]">
          Biblio<em className="font-normal not-italic font-serif italic text-amber">teca</em>
        </h1>
        <p className="font-sans text-[clamp(1rem,2vw,1.25rem)] font-light text-warm-gray max-w-[480px] leading-relaxed animate-[fadeUp_1s_ease_0.7s_both]">
          Organize your books. Enrich them with meaning.
          <br />
          Discover what to read next.
        </p>
      </section>

      {/* Manifesto */}
      <section className="py-20 md:py-32 px-6 max-w-[900px] mx-auto">
        <p
          data-animate
          className="about-anim font-serif text-[clamp(1.8rem,4vw,3rem)] leading-snug font-normal text-[#1A1408] mb-12"
        >
          We believe your bookshelf is a{" "}
          <span className="text-amber italic">portrait of your mind</span>{" "}
          &mdash; a curated gallery of the ideas that shaped you.
        </p>
        <div
          data-animate
          className="about-anim about-divider w-[60px] h-[2px] bg-amber my-12 md:my-16"
        />
        <p
          data-animate
          className="about-anim font-serif text-[clamp(1.8rem,4vw,3rem)] leading-snug font-normal text-[#1A1408] mb-12"
        >
          Yet most reading tools treat books like inventory. A title. A date. A
          checkbox.{" "}
          <span className="text-amber italic">Where&rsquo;s the depth?</span>
        </p>
        <div
          data-animate
          className="about-anim about-divider w-[60px] h-[2px] bg-amber my-12 md:my-16"
        />
        <p
          data-animate
          className="about-anim font-serif text-[clamp(1.8rem,4vw,3rem)] leading-snug font-normal text-[#1A1408]"
        >
          Biblioteca is built for readers who care about{" "}
          <span className="text-amber italic">
            beauty, discovery, and meaning
          </span>{" "}
          in equal measure.
        </p>
      </section>

      {/* Features Strip */}
      <section className="bg-[#1A1408] text-background py-16 md:py-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="max-w-[1100px] mx-auto relative z-10">
          <p className="font-sans text-[0.65rem] font-semibold tracking-[0.4em] uppercase text-amber mb-12 md:mb-16">
            Core Surfaces
          </p>

          {[
            {
              num: "01",
              title: "Add",
              desc: "Smart search powered by Google Books. Import your Kindle highlights, upload a CSV, or add books one by one. Your library, your way in.",
            },
            {
              num: "02",
              title: "Library",
              desc: "A grid gallery of covers, organized into collections you define. Filter by status, sort by rating, search instantly. Every book exactly where you left it.",
            },
            {
              num: "03",
              title: "Book Detail",
              desc: "Full metadata, key quotes, and insights enriched automatically. Rate, track status, and link directly to purchase. The full picture of every read.",
            },
            {
              num: "04",
              title: "Discover",
              desc: "An LLM-powered recommendation engine that knows your taste. Steer by topic, explore curated lists, and find your next obsession.",
            },
          ].map((feature) => (
            <div
              key={feature.num}
              data-animate
              className="about-anim grid grid-cols-[60px_1fr] md:grid-cols-[80px_1fr] gap-4 md:gap-8 py-6 md:py-10 border-t border-white/[0.08]"
            >
              <span className="font-serif text-2xl md:text-[2.5rem] font-black text-amber/30 leading-none">
                {feature.num}
              </span>
              <div>
                <h3 className="font-serif text-lg md:text-2xl font-bold text-background mb-2 md:mb-3">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm font-light leading-relaxed text-background/60 max-w-[500px]">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="py-20 md:py-32 px-6 max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <div
          data-animate
          className="about-anim p-8 md:p-12 border border-warm-border relative"
        >
          <div className="absolute top-[-1px] left-0 w-[60px] h-[3px] bg-amber" />
          <p className="font-sans text-[0.6rem] font-semibold tracking-[0.35em] uppercase text-amber mb-6">
            Now &mdash; v1
          </p>
          <h3 className="font-serif text-xl md:text-2xl font-bold mb-4 leading-tight">
            Personal Curator
          </h3>
          <p className="font-sans text-sm font-light leading-relaxed text-warm-gray">
            <em className="not-italic text-foreground">
              Beauty, discovery, and depth in equal measure.
            </em>{" "}
            Smart search ingestion, a gallery display that makes browsing a
            pleasure, and LLM-powered topic-steered recommendations that surface
            books you didn&rsquo;t know you needed.
          </p>
        </div>
        <div
          data-animate
          className="about-anim p-8 md:p-12 border border-warm-border relative"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="absolute top-[-1px] left-0 w-[60px] h-[3px] bg-amber" />
          <p className="font-sans text-[0.6rem] font-semibold tracking-[0.35em] uppercase text-amber mb-6">
            Next &mdash; v2
          </p>
          <h3 className="font-serif text-xl md:text-2xl font-bold mb-4 leading-tight">
            Social Library
          </h3>
          <p className="font-sans text-sm font-light leading-relaxed text-warm-gray">
            <em className="not-italic text-foreground">
              Share libraries, see what friends are reading.
            </em>{" "}
            Recommend books to each other, extract quotes from Kindle clippings,
            and build a bookshelf view that feels like visiting a friend&rsquo;s
            home.
          </p>
        </div>
      </section>

      {/* Contribute CTA */}
      <section className="py-20 md:py-32 px-6 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-warm-border to-transparent" />
        <h2 className="font-serif text-[clamp(2rem,5vw,4rem)] font-black leading-none mb-6 text-[#1A1408]">
          Join the shelf.
        </h2>
        <p className="font-sans text-base font-light text-warm-gray max-w-[420px] mx-auto mb-10 leading-relaxed">
          Biblioteca is open source. Whether you&rsquo;re a reader, a designer,
          or a developer &mdash; there&rsquo;s room on this shelf for you.
        </p>
        <Link
          href="https://github.com/eugene-mann/Biblioteca"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#1A1408] text-background font-sans text-[0.8rem] font-semibold tracking-[0.15em] uppercase transition-colors hover:bg-foreground relative overflow-hidden group"
        >
          <span className="absolute bottom-0 left-0 w-full h-[2px] bg-amber scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          <Github className="w-[18px] h-[18px]" />
          Contribute on GitHub
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-6 text-center border-t border-warm-border">
        <p className="font-sans text-[0.7rem] tracking-[0.2em] uppercase text-warm-gray">
          Biblioteca &mdash; A project by{" "}
          <Link
            href="https://github.com/eugene-mann"
            target="_blank"
            rel="noopener"
            className="text-amber hover:underline"
          >
            Eugene Mann
          </Link>
        </p>
      </footer>
    </div>
  );
}
