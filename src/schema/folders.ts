import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { files } from "./files";

export const folders= sqliteTable('folder', {
    id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
    name: text('name').notNull().unique(),
    description: text('description'),
    chatId: text('chatId').notNull().unique(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
});
export const foldersRelations = relations(folders, ({ many }) => ({
	files: many(files),
}));

export type FolderSelect = typeof folders.$inferSelect