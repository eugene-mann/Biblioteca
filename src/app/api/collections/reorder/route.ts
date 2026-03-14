import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
  }

  const updates = orderedIds.map((id: string, index: number) =>
    supabase
      .from("collections")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", DEFAULT_USER_ID)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);

  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
