PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_log_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`fast_day_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`name` text,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`energy_kcal_per_basis` real,
	`energy_basis` text,
	`serving_amount` real,
	`serving_unit` text,
	`serving_label` text,
	`kcal` real NOT NULL,
	`origin_type` text NOT NULL,
	`origin_id` text,
	`meal_fraction` real,
	FOREIGN KEY (`fast_day_id`) REFERENCES `fast_day`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "log_entry_amount_non_negative" CHECK("__new_log_entry"."amount" >= 0),
	CONSTRAINT "log_entry_kcal_non_negative" CHECK("__new_log_entry"."kcal" >= 0),
	CONSTRAINT "log_entry_unit" CHECK(unit IN ('g', 'ml', 'serving', 'kcal')),
	CONSTRAINT "log_entry_origin_type" CHECK(origin_type IN ('quick', 'food', 'meal')),
	CONSTRAINT "log_entry_energy_basis" CHECK(energy_basis IS NULL OR energy_basis IN ('per_100g', 'per_100ml', 'per_serving')),
	CONSTRAINT "log_entry_energy_per_basis_non_negative" CHECK("__new_log_entry"."energy_kcal_per_basis" IS NULL OR "__new_log_entry"."energy_kcal_per_basis" >= 0),
	CONSTRAINT "log_entry_serving_unit" CHECK(serving_unit IS NULL OR serving_unit IN ('g', 'ml')),
	CONSTRAINT "log_entry_serving_positive" CHECK("__new_log_entry"."serving_amount" IS NULL OR "__new_log_entry"."serving_amount" > 0),
	CONSTRAINT "log_entry_meal_fraction_positive" CHECK("__new_log_entry"."meal_fraction" IS NULL OR "__new_log_entry"."meal_fraction" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_log_entry`("id", "fast_day_id", "created_at", "updated_at", "name", "amount", "unit", "energy_kcal_per_basis", "energy_basis", "kcal", "origin_type", "origin_id", "meal_fraction") SELECT "id", "fast_day_id", "created_at", "updated_at", "name", "amount", "unit", "energy_kcal_per_basis", "energy_basis", "kcal", "origin_type", "origin_id", "meal_fraction" FROM `log_entry`;--> statement-breakpoint
DROP TABLE `log_entry`;--> statement-breakpoint
ALTER TABLE `__new_log_entry` RENAME TO `log_entry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `log_entry_fast_day_idx` ON `log_entry` (`fast_day_id`);