CREATE DATABASE IF NOT EXISTS `{{DB_NAME}}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `{{DB_NAME}}`;

CREATE TABLE IF NOT EXISTS `staff` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','receptionist') NOT NULL DEFAULT 'receptionist',
  `active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `events` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `venue` VARCHAR(255) NOT NULL,
  `starts_at` DATETIME NOT NULL,
  `ends_at` DATETIME NOT NULL,
  `status` ENUM('draft','active','closed') NOT NULL DEFAULT 'draft',
  `self_checkin_code` VARCHAR(20) NOT NULL UNIQUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `attendees` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `event_id` CHAR(36) NOT NULL,
  `registration_code` VARCHAR(40) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(255) NULL,
  `organisation` VARCHAR(255) NULL,
  `checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checked_in_at` DATETIME NULL,
  `checkin_method` VARCHAR(20) NULL,
  `checked_in_by` CHAR(36) NULL,
  `checked_in_by_name` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attendees_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  INDEX `idx_attendees_event` (`event_id`),
  INDEX `idx_attendees_name` (`full_name`),
  INDEX `idx_attendees_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `checkins` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `event_id` CHAR(36) NOT NULL,
  `attendee_id` CHAR(36) NOT NULL,
  `method` VARCHAR(20) NOT NULL,
  `checked_in_by` CHAR(36) NULL,
  `assistant_name` VARCHAR(255) NULL,
  `source_detail` VARCHAR(255) NULL,
  `checked_in_at` DATETIME NOT NULL,
  `printed_at` DATETIME NULL,
  CONSTRAINT `fk_checkins_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_checkins_attendee` FOREIGN KEY (`attendee_id`) REFERENCES `attendees` (`id`) ON DELETE CASCADE,
  INDEX `idx_checkins_event` (`event_id`),
  INDEX `idx_checkins_attendee` (`attendee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
