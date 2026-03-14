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
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CollectionWithCovers } from "@/types/database";

interface CollectionCarouselProps {
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onCollectionChange: () => void;
}

function CoverStack({ coverUrls }: { coverUrls: (string | null)[] }) {
  const covers = coverUrls.slice(0, 3);
  const placeholderColors = ["bg-amber/30", "bg-secondary", "bg-warm-border"];

  if (covers.length === 0) {
    return (
      <div className="relative mx-auto h-[72px] w-[60px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`absolute rounded-sm shadow-sm ${placeholderColors[i]}`}
            style={{
              width: 40,
              height: 56,
              left: 10 + i * 4,
              top: 8 - i * 4,
              transform: `rotate(${(i - 1) * 5}deg)`,
              zIndex: i,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[72px] w-[60px]">
      {covers.map((url, i) => (
        <div
          key={i}
          className="absolute overflow-hidden rounded-sm shadow-sm"
          style={{
            width: 40,
            height: 56,
            left: 10 + i * 4,
            top: 8 - i * 4,
            transform: `rotate(${(i - 1) * 5}deg)`,
            zIndex: i,
          }}
        >
          {url ? (
            <Image
              src={url}
              alt=""
              width={40}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`h-full w-full ${placeholderColors[i] ?? "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SortableCollectionCard({
  collection,
  isSelected,
  onSelect,
  onDelete,
}: {
  collection: CollectionWithCovers;
  isSelected: boolean;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative w-[140px] flex-shrink-0 rounded-sm border text-center transition-colors bg-card ${
        isSelected ? "border-2 border-amber" : "border-warm-border"
      }`}
    >
      {confirmDelete ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
          <p className="font-sans text-xs text-warm-gray">Delete?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(collection.id)}
              className="rounded-sm bg-destructive px-2 py-1 text-xs font-medium text-white"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-sm border border-warm-border px-2 py-1 text-xs font-medium"
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
            className="absolute right-1 top-1 z-10 rounded-full p-0.5 text-warm-gray opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            {...attributes}
            {...listeners}
            onClick={onSelect}
            className="w-full cursor-pointer p-2"
          >
            <CoverStack coverUrls={collection.cover_urls} />
            <p className="mt-1.5 truncate font-serif text-sm font-medium">{collection.name}</p>
            <p className="text-xs text-warm-gray">
              {collection.book_count} {collection.book_count === 1 ? "book" : "books"}
            </p>
          </button>
        </>
      )}
    </div>
  );
}

export function CollectionCarousel({
  selectedCollectionId,
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
        setCollections((prev) => prev.filter((c) => c.id !== id));
        if (selectedCollectionId === id) {
          onSelectCollection(null);
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
      <div className="flex items-center gap-4">
        <span className="flex-shrink-0 font-serif text-sm font-medium uppercase tracking-wider text-warm-gray">
          Collections
        </span>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {/* All Books card */}
          <button
            onClick={() => onSelectCollection(null)}
            className={`w-[140px] flex-shrink-0 cursor-pointer rounded-sm border p-2 text-center transition-colors bg-card ${
              selectedCollectionId === null ? "border-2 border-amber" : "border-warm-border"
            }`}
          >
            <div className="relative mx-auto flex h-[72px] w-[60px] items-center justify-center">
              <Book className="h-8 w-8 text-warm-gray" />
            </div>
            <p className="mt-1.5 truncate font-serif text-sm font-medium">All Books</p>
            <p className="text-xs text-warm-gray">&nbsp;</p>
          </button>

          {/* Sortable collection cards */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={collections.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {collections.map((collection) => (
                <SortableCollectionCard
                  key={collection.id}
                  collection={collection}
                  isSelected={selectedCollectionId === collection.id}
                  onSelect={() => onSelectCollection(collection.id)}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* New Collection card */}
          {isCreating ? (
            <div className="flex w-[140px] flex-shrink-0 flex-col items-center justify-center rounded-sm border border-dashed border-warm-border p-2">
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
                className="w-full rounded-sm border border-warm-border bg-background px-2 py-1 text-center text-sm focus:border-amber focus:outline-none"
                disabled={isSubmitting}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isSubmitting}
                className="mt-2 text-xs font-medium text-amber hover:text-amber/80 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex w-[140px] flex-shrink-0 flex-col items-center justify-center rounded-sm border border-dashed border-warm-border p-2 text-center transition-colors hover:border-amber hover:bg-card"
            >
              <div className="flex h-[72px] w-[60px] items-center justify-center">
                <Plus className="h-6 w-6 text-warm-gray" />
              </div>
              <p className="mt-1.5 text-sm text-warm-gray">New Collection</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
