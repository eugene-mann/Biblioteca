"use client";

import { useState, useRef, useEffect } from "react";

interface DescriptionSectionProps {
  description: string;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsClamped(el.scrollHeight > el.clientHeight);
    }
  }, [description]);

  return (
    <div>
      <h2 className="mb-2 font-serif text-lg font-semibold">Description</h2>
      <p
        ref={textRef}
        className={`font-sans text-sm leading-relaxed text-warm-gray ${
          !isExpanded ? "line-clamp-4" : ""
        }`}
      >
        {description}
      </p>
      {isClamped && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 font-sans text-xs text-amber hover:text-amber/80"
        >
          {isExpanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}
    </div>
  );
}
