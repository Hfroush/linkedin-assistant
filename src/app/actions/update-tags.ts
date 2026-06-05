"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { posts } from "@/db/schema";

const tagUpdateSchema = z
  .object({
    hookType: z
      .enum(["question", "stat", "story", "hot_take", "confession", "contrast"])
      .nullable()
      .optional(),
    narrativeStructure: z
      .enum(["hook_insight", "story_arc", "essay", "list"])
      .nullable()
      .optional(),
    topicId: z.number().int().positive().nullable().optional(),
    scheduledTime: z.date().nullable().optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .strict();

type TagUpdate = z.infer<typeof tagUpdateSchema>;

export async function updateTags(
  postId: string,
  tags: TagUpdate
): Promise<void> {
  const parsedPostId = z.string().uuid().parse(postId);
  const parsedTags = tagUpdateSchema.parse(tags);

  await db
    .update(posts)
    .set({
      ...(parsedTags.hookType !== undefined && { hookType: parsedTags.hookType }),
      ...(parsedTags.narrativeStructure !== undefined && {
        narrativeStructure: parsedTags.narrativeStructure,
      }),
      ...(parsedTags.topicId !== undefined && { topicId: parsedTags.topicId }),
      ...(parsedTags.scheduledTime !== undefined && {
        scheduledTime: parsedTags.scheduledTime,
      }),
      ...(parsedTags.status !== undefined && {
        status: parsedTags.status,
        ...(parsedTags.status === "published" && { publishedAt: new Date() }),
      }),
    })
    .where(eq(posts.id, parsedPostId));
}
