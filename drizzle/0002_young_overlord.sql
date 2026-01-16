CREATE TABLE `observation_pool` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(64) NOT NULL,
	`industry` varchar(64) NOT NULL,
	`addedDate` varchar(16) NOT NULL,
	`addedPrice` int NOT NULL,
	`displayFactors` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `observation_pool_id` PRIMARY KEY(`id`)
);
