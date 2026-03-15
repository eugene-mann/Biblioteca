"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Book, Plus, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CollectionWithCovers } from "@/types/database";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface CollectionCarouselProps {
  selectedCollectionSlug: string | null;
  onSelectCollection: (slug: string | null, id: string | null) => void;
  onCollectionChange: () => void;
}

const CARD_GRADIENTS = [
  "from-[#2C2416] to-[#4A3828]",
  "from-[#1A2030] to-[#2A3548]",
  "from-[#1A2E20] to-[#2A4A30]",
  "from-[#2E1A20] to-[#4A2A30]",
  "from-[#2A2A2E] to-[#3E3E44]",
  "from-[#3A2810] to-[#5A4020]",
  "from-[#1A2A3A] to-[#2A4050]",
  "from-[#2A1A2E] to-[#4A3050]",
];

function GalleryCovers({ coverUrls }: { coverUrls: (string | null)[] }) {
  const covers = coverUrls.slice(0, 3);
  const placeholderColors = ["bg-amber/40", "bg-amber/25", "bg-amber/15"];
  const rotations = ["-rotate-[10deg]", "rotate-[3deg]", "-rotate-[4deg]"];

  return (
    <div className="absolute right-3 top-3 flex items-start">
      {(covers.length > 0 ? covers : [null, null]).map((url, i) => (
        <div
          key={i}
          className={`h-[40px] w-[28px] overflow-hidden rounded-[3px] border border-white/15 shadow-md ${rotations[i]} ${i > 0 ? "-ml-2" : ""}`}
          style={{ zIndex: i + 1 }}
        >
          {url ? (
            <Image
              src={url}
              alt=""
              width={28}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`h-full w-full ${placeholderColors[i] ?? "bg-amber/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SortableGalleryCard({
  collection,
  isSelected,
  gradientIndex,
  onSelect,
  onDelete,
}: {
  collection: CollectionWithCovers;
  isSelected: boolean;
  gradientIndex: number;
  onSelect: () => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const gradient = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative h-[120px] overflow-hidden rounded-xl bg-gradient-to-br ${gradient} transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isSelected ? "ring-2 ring-amber ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {confirmDelete ? (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <p className="font-sans text-xs text-white/70">Delete?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(collection.id)}
              className="rounded-md bg-destructive px-3 py-1 text-xs font-medium text-white"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-md border border-white/20 px-3 py-1 text-xs font-medium text-white/70"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            className="absolute right-1.5 top-1.5 z-10 rounded-full p-0.5 text-white/40 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            {...attributes}
            {...listeners}
            onClick={onSelect}
            className="flex h-full w-full cursor-pointer flex-col justify-end p-4"
          >
            <GalleryCovers coverUrls={collection.cover_urls} />
            <p className="relative z-[2] truncate font-serif text-[15px] font-semibold text-white">
              {collection.name}
            </p>
            <p className="relative z-[2] text-[11px] text-amber">
              {collection.book_count} {collection.book_count === 1 ? "book" : "books"}
            </p>
          </button>
          {/* Bottom gradient overlay for text readability */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </>
      )}
    </div>
  );
}

export function CollectionCarousel({
  selectedCollectionSlug,
  onSelectCollection,
  onCollectionChange,
}: CollectionCarouselProps) {
  const [collections, setCollections] = useState<CollectionWithCovers[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Resolve slug → ID on initial load for URL-based navigation
  useEffect(() => {
    if (selectedCollectionSlug && collections.length > 0) {
      const match = collections.find((c) => toSlug(c.name) === selectedCollectionSlug);
      if (match) {
        onSelectCollection(selectedCollectionSlug, match.id);
      }
    }
  }, [collections, selectedCollectionSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = collections.findIndex((c) => c.id === active.id);
    const newIndex = collections.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(collections, oldIndex, newIndex);
    setCollections(reordered);

    const orderedIds = reordered.map((c) => c.id);
    await fetch("/api/collections/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (res.ok) {
        const deleted = collections.find((c) => c.id === id);
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (deleted && selectedCollectionSlug === toSlug(deleted.name)) {
          onSelectCollection(null, null);
        }
        onCollectionChange();
      }
    } catch {
      // silent
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
        setNewName("");
        setIsCreating(false);
        await fetchCollections();
        onCollectionChange();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-3 font-serif text-[11px] uppercase tracking-[2.5px] text-warm-gray">
        Collections
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* All Books card */}
        <button
          onClick={() => onSelectCollection(null, null)}
          className={`relative flex h-[120px] cursor-pointer flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-[#2C2416] to-[#4A3828] p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
            selectedCollectionSlug === null
              ? "ring-2 ring-amber ring-offset-2 ring-offset-background"
              : ""
          }`}
        >
          <div className="absolute right-3 top-3">
            <Book className="h-6 w-6 text-white/20" />
          </div>
          <p className="relative z-[2] font-serif text-[15px] font-semibold text-white">
            All Books
          </p>
          <p className="relative z-[2] text-[11px] text-amber">&nbsp;</p>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </button>

        {/* Sortable collection cards */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={collections.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            {collections.map((collection, i) => (
              <SortableGalleryCard
                key={collection.id}
                collection={collection}
                isSelected={selectedCollectionSlug === toSlug(collection.name)}
                gradientIndex={i + 1}
                onSelect={() => onSelectCollection(toSlug(collection.name), collection.id)}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* New Collection card */}
        {isCreating ? (
          <div className="flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-warm-border p-3">
            <input
              ref={inputRef}
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
              onBlur={() => {
                if (!newName.trim()) {
                  setIsCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Name..."
              className="w-full rounded-md border border-warm-border bg-background px-2 py-1.5 text-center font-sans text-sm focus:border-amber focus:outline-none"
              disabled={isSubmitting}
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isSubmitting}
              className="text-xs font-medium text-amber hover:text-amber/80 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex h-[120px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-warm-border transition-all hover:border-amber hover:text-amber"
          >
            <Plus className="h-5 w-5 text-warm-gray" />
            <span className="font-sans text-xs text-warm-gray">New Collection</span>
          </button>
        )}
      </div>
    </div>
  );
}
