"use client";

import { useState, useEffect, useCallback } from "react";

interface Quote {
  text: string;
  author: string;
  source: string;
}

const QUOTES: Quote[] = [
  {
    text: "Between living and dreaming there is a third thing. Guess it.",
    author: "Antonio Machado",
    source: "from a scribbled note inside a secondhand copy of The Midnight Library",
  },
  {
    text: "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood.",
    author: "Theodore Roosevelt",
    source: "The Man in the Arena, 1910",
  },
  {
    text: "Here's to the crazy ones. The misfits. The rebels. The troublemakers. The round pegs in the square holes. The ones who see things differently.",
    author: "Steve Jobs",
    source: "Think Different, 1997",
  },
  {
    text: "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender.",
    author: "Winston Churchill",
    source: "Speech to the House of Commons, 1940",
  },
  {
    text: "If you are going through hell, keep going.",
    author: "Winston Churchill",
    source: "attributed",
  },
  {
    text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.",
    author: "George R.R. Martin",
    source: "A Dance with Dragons",
  },
  {
    text: "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.",
    author: "Steve Jobs",
    source: "Stanford Commencement Address, 2005",
  },
  {
    text: "In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move.",
    author: "Douglas Adams",
    source: "The Restaurant at the End of the Universe",
  },
  {
    text: "The measure of intelligence is the ability to change.",
    author: "Albert Einstein",
    source: "attributed",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Will Durant",
    source: "The Story of Philosophy, summarizing Aristotle",
  },
  {
    text: "The most dangerous phrase in the language is, 'We've always done it this way.'",
    author: "Grace Hopper",
    source: "attributed",
  },
  {
    text: "Any sufficiently advanced technology is indistinguishable from magic.",
    author: "Arthur C. Clarke",
    source: "Profiles of the Future, 1962",
  },
  {
    text: "Not all those who wander are lost.",
    author: "J.R.R. Tolkien",
    source: "The Fellowship of the Ring",
  },
  {
    text: "So it goes.",
    author: "Kurt Vonnegut",
    source: "Slaughterhouse-Five",
  },
  {
    text: "I have not failed. I've just found 10,000 ways that won't work.",
    author: "Thomas Edison",
    source: "attributed",
  },
  {
    text: "The best time to plant a tree was twenty years ago. The second best time is now.",
    author: "Chinese Proverb",
    source: "traditional",
  },
  {
    text: "History doesn't repeat itself, but it often rhymes.",
    author: "Mark Twain",
    source: "attributed",
  },
  {
    text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.",
    author: "Albert Einstein",
    source: "attributed",
  },
  {
    text: "The universe is under no obligation to make sense to you.",
    author: "Neil deGrasse Tyson",
    source: "Astrophysics for People in a Hurry",
  },
  {
    text: "Stay hungry, stay foolish.",
    author: "Stewart Brand",
    source: "The Whole Earth Catalog, later quoted by Steve Jobs",
  },
];

function shuffleQuotes(): Quote[] {
  const shuffled = [...QUOTES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuoteDivider() {
  const [shuffled, setShuffled] = useState<Quote[]>([]);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setShuffled(shuffleQuotes());
  }, []);

  const advance = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % QUOTES.length);
      setFade(true);
    }, 400);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, 12000);
    return () => clearInterval(timer);
  }, [advance]);

  if (shuffled.length === 0) return null;

  const quote = shuffled[index % shuffled.length];

  return (
    <div className="w-full py-2">
      <button
        onClick={advance}
        className="group relative w-full cursor-pointer rounded-sm border border-warm-border bg-card px-8 py-7 text-left shadow-sm transition-shadow hover:shadow-md md:px-12 md:py-9"
      >
        {/* Amber accent bar */}
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-amber" />

        <div
          className={`transition-opacity duration-400 ${fade ? "opacity-100" : "opacity-0"}`}
        >
          <blockquote className="font-serif text-lg leading-relaxed text-foreground/90 italic md:text-xl">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="mt-4 font-sans text-sm text-warm-gray">
            &mdash;{" "}
            <span className="font-medium text-amber">{quote.author}</span>
            , <span className="italic">{quote.source}</span>
          </p>
        </div>

        {/* Subtle progress dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {shuffled.map((_, i) => (
            <span
              key={i}
              className={`block h-1 rounded-full transition-all duration-300 ${
                i === index % shuffled.length
                  ? "w-4 bg-amber"
                  : "w-1 bg-warm-border group-hover:bg-warm-gray/40"
              }`}
            />
          ))}
        </div>
      </button>
    </div>
  );
}
