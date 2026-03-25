CREATE TABLE `consultationMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultationId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultationMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productConsultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productConsultations_id` PRIMARY KEY(`id`)
);
