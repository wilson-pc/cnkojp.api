PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_files` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`chatId` text NOT NULL,
	`fileId` text NOT NULL,
	`folderId` text NOT NULL,
	`type` text,
	`messageId` text,
	`mimeType` text,
	`size` text,
	`newChatId` text,
	`newMessageId` text,
	`newFileId` text,
	`duration` text,
	`delete` integer DEFAULT false,
	`fileReference` text,
	`thumbOriginal` text,
	`thumbAnimated` text,
	`thumbWhitHeader` text,
	`liteCached` text,
	`originalCached` text,
	`thumbGrid` text,
	`original` integer DEFAULT false,
	`originalSize` text,
	`version` integer DEFAULT 1,
	`info` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `folder`(`chatId`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_files`("id", "name", "description", "chatId", "fileId", "folderId", "type", "messageId", "mimeType", "size", "newChatId", "newMessageId", "newFileId", "duration", "delete", "fileReference", "thumbOriginal", "thumbAnimated", "thumbWhitHeader", "liteCached", "originalCached", "thumbGrid", "original", "originalSize", "version", "info", "createdAt", "updatedAt") SELECT "id", "name", "description", "chatId", "fileId", "folderId", "type", "messageId", "mimeType", "size", "newChatId", "newMessageId", "newFileId", "duration", "delete", "fileReference", "thumbOriginal", "thumbAnimated", "thumbWhitHeader", "liteCached", "originalCached", "thumbGrid", "original", "originalSize", "version", "info", "createdAt", "updatedAt" FROM `files`;--> statement-breakpoint
DROP TABLE `files`;--> statement-breakpoint
ALTER TABLE `__new_files` RENAME TO `files`;--> statement-breakpoint
PRAGMA foreign_keys=ON;