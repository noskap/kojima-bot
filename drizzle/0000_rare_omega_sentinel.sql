CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text,
	`spawn_enabled` integer DEFAULT true,
	`next_spawn_time` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`count_fine` integer DEFAULT 0,
	`count_nice` integer DEFAULT 0,
	`count_good` integer DEFAULT 0,
	`count_rare` integer DEFAULT 0,
	`count_wild` integer DEFAULT 0,
	`count_baby` integer DEFAULT 0,
	`count_epic` integer DEFAULT 0,
	`count_sus` integer DEFAULT 0,
	`count_brave` integer DEFAULT 0,
	`count_rickroll` integer DEFAULT 0,
	`count_reverse` integer DEFAULT 0,
	`count_superior` integer DEFAULT 0,
	`count_trash` integer DEFAULT 0,
	`count_legendary` integer DEFAULT 0,
	`count_mythic` integer DEFAULT 0,
	`count_8bit` integer DEFAULT 0,
	`count_corrupt` integer DEFAULT 0,
	`count_professor` integer DEFAULT 0,
	`count_divine` integer DEFAULT 0,
	`count_real` integer DEFAULT 0,
	`count_ultimate` integer DEFAULT 0,
	`count_egirl` integer DEFAULT 0,
	`last_catch_time` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`total_catches` integer DEFAULT 0
);
