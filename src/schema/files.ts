import { createId } from '@paralleldrive/cuid2'
import { relations, sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { folders } from './folders';

export const files = sqliteTable('files', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  chatId: text('chatId').notNull().references(() => folders.chatId),
  fileId: text('fileId').notNull(),
  folderId: text('folderId').notNull(),
  type: text('type'),
  messageId: text('messageId'),
  mimeType: text('mimeType'),
  size: text('size'),
  newChatId: text('newChatId'),
  newMessageId: text('newMessageId'),
  newFileId: text('newFileId'),
  duration: text('duration'),
  fileReference: text('fileReference'),
  thumbOriginal: text('thumbOriginal'),
  thumbAnimated: text('thumbAnimated'),
  thumbWhitHeader : text('thumbWhitHeader'),
  liteCached: text('liteCached'),
  originalCached: text('originalCached'),
  thumbGrid: text('thumbGrid'),
  original: integer('original', { mode: 'boolean' }).default(false),
  originalSize: text('originalSize'),
  version: integer('version').default(1),
  info: text('info', { mode: 'json' }),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
})

export const filesRelations = relations(files, ({ one }) => ({
	files: one(folders, {
		fields: [files.folderId],
		references: [folders.id],
	}),
}));

export const filesSelect =  files.$inferSelect