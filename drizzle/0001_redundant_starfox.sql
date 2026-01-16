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
	`watchlistStocks` json NOT NULL DEFAULT ('[]'),
	`excludedIndustries` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_configs_id` PRIMARY KEY(`id`)
);
