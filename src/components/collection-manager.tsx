"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Check } from "lucide-react";
import type { Collection } from "@/types/database";

interface CollectionManagerProps {
  bookId: string;
}

export function CollectionManager({ bookId }: CollectionManagerProps) {
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const [collectionsRes, membershipRes] = await Promise.all([
      fetch("/api/collections"),
      fetch(`/api/books/${bookId}/collections`),
    ]);
    if (collectionsRes.ok) {
      const data = await collectionsRes.json();
      setAllCollections(data);
    }
    if (membershipRes.ok) {
      const data: Collection[] = await membershipRes.json();
      setMemberIds(new Set(data.map((c) => c.id)));
    }
  }, [bookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Click-outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewName("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  async function toggleMembership(collectionId: string) {
    const isMember = memberIds.has(collectionId);

    // Optimistic update
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (isMember) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });

    const res = isMember
      ? await fetch(`/api/collections/${collectionId}/books/${bookId}`, {
          method: "DELETE",
        })
      : await fetch(`/api/collections/${collectionId}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });

    if (!res.ok) {
      // Revert on failure
      setMemberIds((prev) => {
        const next = new Set(prev);
        if (isMember) {
          next.add(collectionId);
        } else {
          next.delete(collectionId);
        }
        return next;
      });
    }
  }

  async function removeMembership(collectionId: string) {
    // Optimistic update
    setMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(collectionId);
      return next;
    });

    const res = await fetch(`/api/collections/${collectionId}/books/${bookId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setMemberIds((prev) => {
        const next = new Set(prev);
        next.add(collectionId);
        return next;
      });
    }
  }

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const created: Collection = await res.json();
        setAllCollections((prev) => [...prev, created]);
        setNewName("");
        setIsCreating(false);

        // Auto-add book to the new collection
        const addRes = await fetch(`/api/collections/${created.id}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId }),
        });
        if (addRes.ok) {
          setMemberIds((prev) => {
            const next = new Set(prev);
            next.add(created.id);
            return next;
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const memberCollections = allCollections.filter((c) => memberIds.has(c.id));

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-2">
        {memberCollections.map((collection) => (
          <span
            key={collection.id}
            className="inline-flex items-center gap-1.5 rounded-sm border border-warm-border bg-card px-2.5 py-1 text-sm"
          >
            {collection.name}
            <button
              onClick={() => removeMembership(collection.id)}
              className="text-xs text-warm-gray transition-colors hover:text-foreground"
              aria-label={`Remove from ${collection.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-sm border border-dashed border-warm-border px-2.5 py-1 text-sm text-warm-gray transition-colors hover:border-amber hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-56 rounded-sm border border-warm-border bg-card p-2 shadow-lg">
          {allCollections.length === 0 && !isCreating && (
            <p className="px-2 py-1.5 text-sm text-warm-gray">No collections yet</p>
          )}

          {allCollections.map((collection) => {
            const isMember = memberIds.has(collection.id);
            return (
              <button
                key={collection.id}
                onClick={() => toggleMembership(collection.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors cursor-pointer hover:bg-secondary"
              >
                <span className="w-4 flex-shrink-0 text-amber">
                  {isMember && <Check className="h-4 w-4" />}
                </span>
                <span className="truncate">{collection.name}</span>
              </button>
            );
          })}

          <div className="mt-1 border-t border-warm-border pt-1">
            {isCreating ? (
              <div className="px-2 py-1.5">
                <input
                  ref={createInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Collection name..."
                  className="w-full rounded-sm border border-warm-border bg-background px-2 py-1 text-sm focus:border-amber focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full cursor-pointer px-2 py-1.5 text-left text-sm text-amber transition-colors hover:bg-secondary rounded-sm"
              >
                Create new collection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
