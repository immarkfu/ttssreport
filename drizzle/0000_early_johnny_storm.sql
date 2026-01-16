CREATE TABLE `user_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`b1JValueThreshold` int NOT NULL DEFAULT 13,
	`b1MacdCondition` varchar(32) NOT NULL DEFAULT 'MACD>0',
	`b1VolumeRatio` varchar(32) NOT NULL DEFAULT '1.0',
	`b1RedGreenCondition` boolean NOT NULL DEFAULT true,
	`s1WhiteLineBreak` boolean NOT NULL DEFAULT true,
	`s1LongYangFly` boolean NOT NULL DEFAULT true,
	`s1JValueHigh` int NOT NULL DEFAULT 85,
	`s1VolumeCondition` boolean NOT NULL DEFAULT true,
	`watchlistStocks` text,
	`excludedIndustries` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
