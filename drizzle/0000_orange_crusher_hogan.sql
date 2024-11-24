CREATE TABLE `files` (
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
	`fileReference` text,
	`thumbOriginal` text,
	`thumbAnimated` text,
	`thumbWhitHeader` text,
	`thumbGrid` text,
	`original` integer DEFAULT false,
	`originalSize` text,
	`version` integer DEFAULT 1,
	`info` text,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `folder`(`chatId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `folder` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`chatId` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `folder_name_unique` ON `folder` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `folder_chatId_unique` ON `folder` (`chatId`);--> statement-breakpoint
CREATE TABLE `whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`fileId` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whitelist_fileId_unique` ON `whitelist` (`fileId`);