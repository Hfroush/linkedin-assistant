"use server";

import { db } from "@/db/client";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteDraft(postId: string): Promise<void> {
  if (!postId) throw new Error("postId required");
  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath("/");
}
