import { supabase } from "./supabase";
import type { ChangelogAction } from "@/types/database";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function logChange(params: {
  bookId: string | null;
  bookTitle: string;
  bookCoverUrl: string | null;
  action: ChangelogAction;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  await supabase.from("book_changelog").insert({
    book_id: params.bookId,
    book_title: params.bookTitle,
    book_cover_url: params.bookCoverUrl,
    action: params.action,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    user_id: DEFAULT_USER_ID,
  });
}
