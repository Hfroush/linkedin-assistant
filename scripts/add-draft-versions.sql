CREATE TABLE IF NOT EXISTS "draft_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "post_id" text NOT NULL REFERENCES "posts"("id"),
  "draft_text" text NOT NULL,
  "label" text DEFAULT 'Draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "draft_versions_post_idx"
  ON "draft_versions" USING btree ("post_id");

CREATE INDEX IF NOT EXISTS "draft_versions_created_at_idx"
  ON "draft_versions" USING btree ("created_at");
