CREATE TABLE `fast_day` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`limit_kcal` real NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "fast_day_date_format" CHECK("fast_day"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "fast_day_limit_non_negative" CHECK("fast_day"."limit_kcal" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fast_day_date_unique` ON `fast_day` (`date`);--> statement-breakpoint
CREATE TABLE `food` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_ref` text,
	`barcode` text,
	`name` text NOT NULL,
	`brand` text,
	`energy_kcal` real,
	`energy_basis` text,
	`serving_amount` real,
	`serving_unit` text,
	`serving_label` text,
	`preparation_state` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`user_override_json` text,
	`fetched_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	CONSTRAINT "food_source" CHECK(source IN ('user', 'off', 'fineli')),
	CONSTRAINT "food_energy_non_negative" CHECK("food"."energy_kcal" IS NULL OR "food"."energy_kcal" >= 0),
	CONSTRAINT "food_energy_basis" CHECK(energy_basis IS NULL OR energy_basis IN ('per_100g', 'per_100ml', 'per_serving')),
	CONSTRAINT "food_serving_unit" CHECK(serving_unit IS NULL OR serving_unit IN ('g', 'ml')),
	CONSTRAINT "food_serving_positive" CHECK("food"."serving_amount" IS NULL OR "food"."serving_amount" > 0),
	CONSTRAINT "food_preparation_state" CHECK(preparation_state IS NULL OR preparation_state IN ('raw', 'cooked', 'prepared', 'unprepared'))
);
--> statement-breakpoint
CREATE INDEX `food_barcode_idx` ON `food` (`barcode`);--> statement-breakpoint
CREATE INDEX `food_source_ref_idx` ON `food` (`source`,`source_ref`);--> statement-breakpoint
CREATE TABLE `log_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`fast_day_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`name` text,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`energy_kcal_per_basis` real,
	`energy_basis` text,
	`kcal` real NOT NULL,
	`origin_type` text NOT NULL,
	`origin_id` text,
	`meal_fraction` real,
	FOREIGN KEY (`fast_day_id`) REFERENCES `fast_day`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "log_entry_amount_non_negative" CHECK("log_entry"."amount" >= 0),
	CONSTRAINT "log_entry_kcal_non_negative" CHECK("log_entry"."kcal" >= 0),
	CONSTRAINT "log_entry_unit" CHECK(unit IN ('g', 'ml', 'serving', 'kcal')),
	CONSTRAINT "log_entry_origin_type" CHECK(origin_type IN ('quick', 'food', 'meal')),
	CONSTRAINT "log_entry_energy_basis" CHECK(energy_basis IS NULL OR energy_basis IN ('per_100g', 'per_100ml', 'per_serving')),
	CONSTRAINT "log_entry_energy_per_basis_non_negative" CHECK("log_entry"."energy_kcal_per_basis" IS NULL OR "log_entry"."energy_kcal_per_basis" >= 0),
	CONSTRAINT "log_entry_meal_fraction_positive" CHECK("log_entry"."meal_fraction" IS NULL OR "log_entry"."meal_fraction" > 0)
);
--> statement-breakpoint
CREATE INDEX `log_entry_fast_day_idx` ON `log_entry` (`fast_day_id`);--> statement-breakpoint
CREATE TABLE `meal` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `meal_item` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`food_id` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meal`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "meal_item_amount_positive" CHECK("meal_item"."amount" > 0),
	CONSTRAINT "meal_item_unit" CHECK(unit IN ('g', 'ml', 'serving'))
);
--> statement-breakpoint
CREATE INDEX `meal_item_meal_idx` ON `meal_item` (`meal_id`);--> statement-breakpoint
CREATE TABLE `publish_job` (
	`id` text PRIMARY KEY NOT NULL,
	`food_id` text NOT NULL,
	`barcode` text NOT NULL,
	`state` text DEFAULT 'draft' NOT NULL,
	`payload_json` text,
	`image_paths_json` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`consented_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "publish_job_state" CHECK(state IN ('draft', 'awaiting_consent', 'queued', 'sending', 'published', 'failed', 'exists_already')),
	CONSTRAINT "publish_job_attempts_non_negative" CHECK("publish_job"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `publish_job_state_idx` ON `publish_job` (`state`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_limit_kcal` real,
	`onboarding_done` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "settings_singleton" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_limit_non_negative" CHECK("settings"."default_limit_kcal" IS NULL OR "settings"."default_limit_kcal" >= 0)
);
