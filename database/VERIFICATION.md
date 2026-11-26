# Disposable MySQL verification

```text
$ docker volume ls -q --filter label=com.docker.compose.project=sjdb-verify-20261126-db008b

exit=0

$ docker ps -aq --filter label=com.docker.compose.project=sjdb-verify-20261126-db008b

exit=0

$ docker volume ls -q --filter name=^sjdb-verify-20261126-db008b_demo-data$

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml config --quiet

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml up -d --wait --wait-timeout 240
 Network sjdb-verify-20261126-db008b_default  Creating
 Network sjdb-verify-20261126-db008b_default  Created
 Volume sjdb-verify-20261126-db008b_demo-data  Creating
 Volume sjdb-verify-20261126-db008b_demo-data  Created
 Container sjdb-verify-20261126-db008b-mysql-1  Creating
 Container sjdb-verify-20261126-db008b-mysql-1  Created
 Container sjdb-verify-20261126-db008b-mysql-1  Starting
 Container sjdb-verify-20261126-db008b-mysql-1  Started
 Container sjdb-verify-20261126-db008b-mysql-1  Waiting
 Container sjdb-verify-20261126-db008b-mysql-1  Healthy

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml ps
NAME                                  IMAGE       COMMAND                  SERVICE   CREATED          STATUS                    PORTS
sjdb-verify-20261126-db008b-mysql-1   mysql:8.4   "docker-entrypoint.s…"   mysql     16 seconds ago   Up 16 seconds (healthy)   127.0.0.1:33588->3306/tcp

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW TABLES"
applications
conversations
cv_parse_results
cvs
email_verifications
employer_profiles
job_match_scores
job_skills
jobs
messages
reviews
skills
student_profiles
student_skills
users

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND engine='InnoDB' AND table_collation='utf8mb4_unicode_ci'"
15

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT COUNT(*) FROM jobs WHERE status='OPEN' AND moderation_status='APPROVED'"
2

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE()"
22

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND ((table_name='student_profiles' AND column_name='cv_url') OR (table_name='cv_parse_results' AND column_name IN ('file_name','feedback')))"
3

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; UPDATE student_profiles SET cv_url='https://example.test/synthetic.pdf' WHERE user_id=1; SELECT cv_url FROM student_profiles WHERE user_id=1; SELECT COUNT(*) FROM student_skills WHERE student_id=1; ROLLBACK;"
https://example.test/synthetic.pdf
2

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `applications`"
id	int	NO	PRI	NULL	auto_increment
job_id	int	NO	MUL	NULL
student_id	int	NO	MUL	NULL
cv_url	varchar(500)	YES		NULL
cover_letter	text	YES		NULL
status	enum('PENDING','ACCEPTED','REJECTED')	YES		PENDING
applied_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
cv_id	int	YES	MUL	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `employer_profiles`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	UNI	NULL
company_name	varchar(255)	NO		NULL
phone	varchar(20)	YES		NULL
address	varchar(255)	YES		NULL
description	text	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `jobs`"
id	int	NO	PRI	NULL	auto_increment
employer_id	int	NO	MUL	NULL
title	varchar(255)	NO		NULL
description	text	NO		NULL
location	varchar(255)	YES		NULL
salary_min	decimal(12,2)	YES		NULL
salary_max	decimal(12,2)	YES		NULL
job_type	enum('PART_TIME','FULL_TIME','FREELANCE')	NO		NULL
deadline	date	YES		NULL
status	enum('OPEN','CLOSED')	YES		OPEN
moderation_status	enum('PENDING','APPROVED','REJECTED')	NO	MUL	PENDING
rejection_reason	varchar(1000)	YES		NULL
created_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `student_profiles`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	UNI	NULL
full_name	varchar(100)	NO		NULL
phone	varchar(20)	YES		NULL
university	varchar(255)	YES		NULL
major	varchar(100)	YES		NULL
bio	text	YES		NULL
ai_processing_consent_at	timestamp	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
cv_url	varchar(500)	YES		NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `users`"
id	int	NO	PRI	NULL	auto_increment
email	varchar(255)	NO	UNI	NULL
password	varchar(255)	NO		NULL
role	enum('STUDENT','EMPLOYER','ADMIN')	NO	MUL	NULL
status	enum('ACTIVE','BLOCKED')	NO		ACTIVE
created_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `applications`"
applications	CREATE TABLE `applications` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `job_id` int NOT NULL,\n  `student_id` int NOT NULL,\n  `cv_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `cover_letter` text COLLATE utf8mb4_unicode_ci,\n  `status` enum('PENDING','ACCEPTED','REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING',\n  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `cv_id` int DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uq_application_job_student` (`job_id`,`student_id`),\n  KEY `idx_applications_student_applied` (`student_id`,`applied_at`),\n  KEY `idx_applications_job_applied` (`job_id`,`applied_at`),\n  KEY `idx_applications_cv` (`cv_id`),\n  CONSTRAINT `fk_application_cv` FOREIGN KEY (`cv_id`) REFERENCES `cvs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n  CONSTRAINT `fk_application_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_application_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `conversations`"
conversations	CREATE TABLE `conversations` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `student_id` int NOT NULL,\n  `employer_id` int NOT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uq_conversation_pair` (`student_id`,`employer_id`),\n  KEY `idx_conversations_student_created` (`student_id`,`created_at`),\n  KEY `idx_conversations_employer_created` (`employer_id`,`created_at`),\n  CONSTRAINT `fk_conversation_employer` FOREIGN KEY (`employer_id`) REFERENCES `employer_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_conversation_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `cv_parse_results`"
cv_parse_results	CREATE TABLE `cv_parse_results` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` int NOT NULL,\n  `cv_id` int DEFAULT NULL,\n  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `parser` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `parser_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `source_file_type` enum('pdf','docx') COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `status` enum('success','partial','failed') COLLATE utf8mb4_unicode_ci NOT NULL,\n  `extracted` json NOT NULL,\n  `warnings` json DEFAULT NULL,\n  `feedback` json DEFAULT NULL,\n  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `duration_ms` int unsigned DEFAULT NULL,\n  `input_tokens` int unsigned DEFAULT NULL,\n  `output_tokens` int unsigned DEFAULT NULL,\n  `file_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `prompt_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `schema_version` smallint DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `expires_at` timestamp NOT NULL,\n  PRIMARY KEY (`id`),\n  KEY `idx_parse_user_created` (`user_id`,`created_at`),\n  KEY `idx_parse_user_hash` (`user_id`,`file_hash`),\n  KEY `idx_parse_expiry` (`expires_at`),\n  KEY `fk_parse_cv` (`cv_id`),\n  CONSTRAINT `fk_parse_cv` FOREIGN KEY (`cv_id`) REFERENCES `cvs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n  CONSTRAINT `fk_parse_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `cvs`"
cvs	CREATE TABLE `cvs` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` int NOT NULL,\n  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `template` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'modern',\n  `personal_info` json DEFAULT NULL,\n  `education` json DEFAULT NULL,\n  `experience` json DEFAULT NULL,\n  `skills` json DEFAULT NULL,\n  `projects` json DEFAULT NULL,\n  `certifications` json DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `idx_cvs_user_updated` (`user_id`,`updated_at`),\n  CONSTRAINT `fk_cv_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `email_verifications`"
email_verifications	CREATE TABLE `email_verifications` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `otp_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `expires_at` datetime NOT NULL,\n  `registration_payload` json NOT NULL,\n  `attempts` tinyint unsigned NOT NULL DEFAULT '0',\n  `verified_at` datetime DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uq_email_verifications_email` (`email`),\n  KEY `idx_email_verifications_expiry` (`expires_at`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `employer_profiles`"
employer_profiles	CREATE TABLE `employer_profiles` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` int NOT NULL,\n  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `description` text COLLATE utf8mb4_unicode_ci,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `user_id` (`user_id`),\n  CONSTRAINT `fk_employer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `job_match_scores`"
job_match_scores	CREATE TABLE `job_match_scores` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `student_id` int NOT NULL,\n  `job_id` int NOT NULL,\n  `score` decimal(5,2) NOT NULL,\n  `method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `score_version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `input_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `explanation` json DEFAULT NULL COMMENT '{matched:[skill_id],missing:[skill_id],required_missing:[skill_id]}',\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `computed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uq_match_version` (`student_id`,`job_id`,`method`,`score_version`),\n  KEY `idx_match_student_score` (`student_id`,`score`),\n  KEY `idx_match_job_score` (`job_id`,`score`),\n  CONSTRAINT `fk_match_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_match_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `chk_match_score` CHECK ((`score` between 0 and 100))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `job_skills`"
job_skills	CREATE TABLE `job_skills` (\n  `job_id` int NOT NULL,\n  `skill_id` int NOT NULL,\n  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',\n  `is_required` tinyint(1) NOT NULL DEFAULT '1',\n  `weight` decimal(4,2) NOT NULL DEFAULT '1.00',\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`job_id`,`skill_id`),\n  KEY `fk_job_skill` (`skill_id`),\n  CONSTRAINT `fk_job_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_skill_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `chk_job_skill_required` CHECK ((`is_required` in (0,1))),\n  CONSTRAINT `chk_job_skill_weight` CHECK ((`weight` > 0))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `jobs`"
jobs	CREATE TABLE `jobs` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `employer_id` int NOT NULL,\n  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,\n  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `salary_min` decimal(12,2) DEFAULT NULL,\n  `salary_max` decimal(12,2) DEFAULT NULL,\n  `job_type` enum('PART_TIME','FULL_TIME','FREELANCE') COLLATE utf8mb4_unicode_ci NOT NULL,\n  `deadline` date DEFAULT NULL,\n  `status` enum('OPEN','CLOSED') COLLATE utf8mb4_unicode_ci DEFAULT 'OPEN',\n  `moderation_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',\n  `rejection_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `idx_jobs_public` (`moderation_status`,`created_at`),\n  KEY `idx_jobs_employer_created` (`employer_id`,`created_at`),\n  CONSTRAINT `fk_job_employer` FOREIGN KEY (`employer_id`) REFERENCES `employer_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `chk_job_salary` CHECK (((`salary_min` is null) or (`salary_max` is null) or (`salary_min` <= `salary_max`)))\n) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `messages`"
messages	CREATE TABLE `messages` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `conversation_id` int NOT NULL,\n  `sender_id` int NOT NULL,\n  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  KEY `idx_messages_conversation_created` (`conversation_id`,`created_at`,`id`),\n  KEY `fk_message_sender` (`sender_id`),\n  CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `reviews`"
reviews	CREATE TABLE `reviews` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `job_id` int NOT NULL,\n  `user_id` int NOT NULL,\n  `rating` tinyint unsigned NOT NULL,\n  `comment` varchar(600) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `uq_review_job_user` (`job_id`,`user_id`),\n  KEY `fk_review_user` (`user_id`),\n  CONSTRAINT `fk_review_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `chk_review_rating` CHECK ((`rating` between 1 and 5))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `skills`"
skills	CREATE TABLE `skills` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `normalized_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `normalized_name` (`normalized_name`)\n) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `student_profiles`"
student_profiles	CREATE TABLE `student_profiles` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `user_id` int NOT NULL,\n  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `university` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `major` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  `bio` text COLLATE utf8mb4_unicode_ci,\n  `ai_processing_consent_at` timestamp NULL DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  `cv_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `user_id` (`user_id`),\n  CONSTRAINT `fk_student_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `student_skills`"
student_skills	CREATE TABLE `student_skills` (\n  `student_id` int NOT NULL,\n  `skill_id` int NOT NULL,\n  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',\n  `level` tinyint unsigned DEFAULT NULL,\n  `confidence` decimal(4,3) DEFAULT NULL,\n  `years_experience` decimal(3,1) DEFAULT NULL,\n  `cv_parse_result_id` int DEFAULT NULL,\n  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`student_id`,`skill_id`),\n  KEY `fk_student_skill` (`skill_id`),\n  KEY `fk_student_parse` (`cv_parse_result_id`),\n  CONSTRAINT `fk_skill_student` FOREIGN KEY (`student_id`) REFERENCES `student_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `fk_student_parse` FOREIGN KEY (`cv_parse_result_id`) REFERENCES `cv_parse_results` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,\n  CONSTRAINT `fk_student_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT `chk_student_confidence` CHECK ((`confidence` between 0 and 1)),\n  CONSTRAINT `chk_student_experience` CHECK ((`years_experience` >= 0)),\n  CONSTRAINT `chk_student_level` CHECK ((`level` between 1 and 5))\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW CREATE TABLE `users`"
users	CREATE TABLE `users` (\n  `id` int NOT NULL AUTO_INCREMENT,\n  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,\n  `role` enum('STUDENT','EMPLOYER','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL,\n  `status` enum('ACTIVE','BLOCKED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',\n  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (`id`),\n  UNIQUE KEY `email` (`email`),\n  KEY `idx_users_role` (`role`)\n) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `applications`"
id	int	NO	PRI	NULL	auto_increment
job_id	int	NO	MUL	NULL
student_id	int	NO	MUL	NULL
cv_url	varchar(500)	YES		NULL
cover_letter	text	YES		NULL
status	enum('PENDING','ACCEPTED','REJECTED')	YES		PENDING
applied_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
cv_id	int	YES	MUL	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`job_id`,`student_id`,`cv_url`,`cover_letter`,`status`,`cv_id` FROM `applications` ORDER BY 1,2"
1	1	1	https://example.com/demo-cv.pdf	Synthetic demo application	PENDING	1

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `conversations`"
id	int	NO	PRI	NULL	auto_increment
student_id	int	NO	MUL	NULL
employer_id	int	NO	MUL	NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`student_id`,`employer_id` FROM `conversations` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `cv_parse_results`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	MUL	NULL
cv_id	int	YES	MUL	NULL
file_name	varchar(255)	YES		NULL
parser	varchar(20)	NO		NULL
model	varchar(100)	YES		NULL
parser_version	varchar(20)	YES		NULL
source_file_type	enum('pdf','docx')	YES		NULL
status	enum('success','partial','failed')	NO		NULL
extracted	json	NO		NULL
warnings	json	YES		NULL
feedback	json	YES		NULL
error_message	varchar(500)	YES		NULL
duration_ms	int unsigned	YES		NULL
input_tokens	int unsigned	YES		NULL
output_tokens	int unsigned	YES		NULL
file_hash	char(64)	YES		NULL
prompt_version	varchar(20)	YES		NULL
schema_version	smallint	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
expires_at	timestamp	NO	MUL	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`user_id`,`cv_id`,`file_name`,`parser`,`model`,`parser_version`,`source_file_type`,`status`,`extracted`,`warnings`,`feedback`,`error_message`,`duration_ms`,`input_tokens`,`output_tokens`,`file_hash`,`prompt_version`,`schema_version`,`expires_at` FROM `cv_parse_results` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `cvs`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	MUL	NULL
title	varchar(255)	NO		NULL
template	varchar(50)	NO		modern
personal_info	json	YES		NULL
education	json	YES		NULL
experience	json	YES		NULL
skills	json	YES		NULL
projects	json	YES		NULL
certifications	json	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`user_id`,`title`,`template`,`personal_info`,`education`,`experience`,`skills`,`projects`,`certifications` FROM `cvs` ORDER BY 1,2"
1	1	Demo CV	modern	{"full_name": "Demo Student"}	[]	[]	["JavaScript", "React"]	[]	[]

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `email_verifications`"
id	int	NO	PRI	NULL	auto_increment
email	varchar(255)	NO	UNI	NULL
otp_hash	char(64)	NO		NULL
expires_at	datetime	NO	MUL	NULL
registration_payload	json	NO		NULL
attempts	tinyint unsigned	NO		0
verified_at	datetime	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`email`,`otp_hash`,`expires_at`,`registration_payload`,`attempts`,`verified_at` FROM `email_verifications` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `employer_profiles`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	UNI	NULL
company_name	varchar(255)	NO		NULL
phone	varchar(20)	YES		NULL
address	varchar(255)	YES		NULL
description	text	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`user_id`,`company_name`,`phone`,`address`,`description` FROM `employer_profiles` ORDER BY 1,2"
1	2	Demo Technology Company	NULL	Ho Chi Minh City	Synthetic demo employer

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `job_match_scores`"
id	int	NO	PRI	NULL	auto_increment
student_id	int	NO	MUL	NULL
job_id	int	NO	MUL	NULL
score	decimal(5,2)	NO		NULL
method	varchar(20)	NO		NULL
score_version	varchar(20)	NO		NULL
input_hash	char(64)	YES		NULL
model	varchar(100)	YES		NULL
explanation	json	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
computed_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`student_id`,`job_id`,`score`,`method`,`score_version`,`input_hash`,`model`,`explanation`,`computed_at` FROM `job_match_scores` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `job_skills`"
job_id	int	NO	PRI	NULL
skill_id	int	NO	PRI	NULL
source	varchar(20)	NO		manual
is_required	tinyint(1)	NO		1
weight	decimal(4,2)	NO		1.00
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `job_id`,`skill_id`,`source`,`is_required`,`weight` FROM `job_skills` ORDER BY 1,2"
1	4	manual	1	1.00
1	5	manual	0	0.50
2	1	manual	1	1.00
2	2	manual	1	1.00
2	6	manual	0	0.50

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `jobs`"
id	int	NO	PRI	NULL	auto_increment
employer_id	int	NO	MUL	NULL
title	varchar(255)	NO		NULL
description	text	NO		NULL
location	varchar(255)	YES		NULL
salary_min	decimal(12,2)	YES		NULL
salary_max	decimal(12,2)	YES		NULL
job_type	enum('PART_TIME','FULL_TIME','FREELANCE')	NO		NULL
deadline	date	YES		NULL
status	enum('OPEN','CLOSED')	YES		OPEN
moderation_status	enum('PENDING','APPROVED','REJECTED')	NO	MUL	PENDING
rejection_reason	varchar(1000)	YES		NULL
created_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`employer_id`,`title`,`description`,`location`,`salary_min`,`salary_max`,`job_type`,`deadline`,`status`,`moderation_status`,`rejection_reason` FROM `jobs` ORDER BY 1,2"
1	1	Part-time Sales Assistant	Support sales activities and customer service.	Ho Chi Minh City	25000.00	35000.00	PART_TIME	2026-12-31	OPEN	APPROVED	NULL
2	1	Junior Web Developer Intern	Assist website development and testing.	Ho Chi Minh City	30000.00	50000.00	FREELANCE	2026-12-31	OPEN	APPROVED	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `messages`"
id	int	NO	PRI	NULL	auto_increment
conversation_id	int	NO	MUL	NULL
sender_id	int	NO	MUL	NULL
content	text	NO		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`conversation_id`,`sender_id`,`content` FROM `messages` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `reviews`"
id	int	NO	PRI	NULL	auto_increment
job_id	int	NO	MUL	NULL
user_id	int	NO	MUL	NULL
rating	tinyint unsigned	NO		NULL
comment	varchar(600)	NO		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`job_id`,`user_id`,`rating`,`comment` FROM `reviews` ORDER BY 1,2"

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `skills`"
id	int	NO	PRI	NULL	auto_increment
name	varchar(100)	NO		NULL
normalized_name	varchar(100)	NO	UNI	NULL
category	varchar(50)	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`name`,`normalized_name`,`category` FROM `skills` ORDER BY 1,2"
1	JavaScript	javascript	programming
2	React	react	programming
3	Node.js	nodejs	programming
4	Customer Service	customer service	soft
5	English	english	language
6	MySQL	mysql	programming

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `student_profiles`"
id	int	NO	PRI	NULL	auto_increment
user_id	int	NO	UNI	NULL
full_name	varchar(100)	NO		NULL
phone	varchar(20)	YES		NULL
university	varchar(255)	YES		NULL
major	varchar(100)	YES		NULL
bio	text	YES		NULL
ai_processing_consent_at	timestamp	YES		NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP
cv_url	varchar(500)	YES		NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`user_id`,`full_name`,`phone`,`university`,`major`,`bio`,`ai_processing_consent_at`,`cv_url` FROM `student_profiles` ORDER BY 1,2"
1	1	Demo Student	NULL	Demo University	Information Technology	Synthetic demo profile	NULL	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `student_skills`"
student_id	int	NO	PRI	NULL
skill_id	int	NO	PRI	NULL
source	varchar(20)	NO		manual
level	tinyint unsigned	YES		NULL
confidence	decimal(4,3)	YES		NULL
years_experience	decimal(3,1)	YES		NULL
cv_parse_result_id	int	YES	MUL	NULL
created_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `student_id`,`skill_id`,`source`,`level`,`confidence`,`years_experience`,`cv_parse_result_id` FROM `student_skills` ORDER BY 1,2"
1	1	manual	3	NULL	NULL	NULL
1	2	manual	2	NULL	NULL	NULL

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SHOW COLUMNS FROM `users`"
id	int	NO	PRI	NULL	auto_increment
email	varchar(255)	NO	UNI	NULL
password	varchar(255)	NO		NULL
role	enum('STUDENT','EMPLOYER','ADMIN')	NO	MUL	NULL
status	enum('ACTIVE','BLOCKED')	NO		ACTIVE
created_at	timestamp	YES		CURRENT_TIMESTAMP	DEFAULT_GENERATED
updated_at	timestamp	NO		CURRENT_TIMESTAMP	DEFAULT_GENERATED on update CURRENT_TIMESTAMP

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT `id`,`email`,`password`,`role`,`status` FROM `users` ORDER BY 1,2"
1	student.demo@example.com	$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO	STUDENT	ACTIVE
2	employer.demo@example.com	$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO	EMPLOYER	ACTIVE
3	admin.demo@example.com	$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO	ADMIN	ACTIVE

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT table_name,index_name,seq_in_index,column_name,non_unique FROM information_schema.statistics WHERE table_schema=DATABASE() ORDER BY table_name,index_name,seq_in_index"
applications	idx_applications_cv	1	cv_id	1
applications	idx_applications_job_applied	1	job_id	1
applications	idx_applications_job_applied	2	applied_at	1
applications	idx_applications_student_applied	1	student_id	1
applications	idx_applications_student_applied	2	applied_at	1
applications	PRIMARY	1	id	0
applications	uq_application_job_student	1	job_id	0
applications	uq_application_job_student	2	student_id	0
conversations	idx_conversations_employer_created	1	employer_id	1
conversations	idx_conversations_employer_created	2	created_at	1
conversations	idx_conversations_student_created	1	student_id	1
conversations	idx_conversations_student_created	2	created_at	1
conversations	PRIMARY	1	id	0
conversations	uq_conversation_pair	1	student_id	0
conversations	uq_conversation_pair	2	employer_id	0
cv_parse_results	fk_parse_cv	1	cv_id	1
cv_parse_results	idx_parse_expiry	1	expires_at	1
cv_parse_results	idx_parse_user_created	1	user_id	1
cv_parse_results	idx_parse_user_created	2	created_at	1
cv_parse_results	idx_parse_user_hash	1	user_id	1
cv_parse_results	idx_parse_user_hash	2	file_hash	1
cv_parse_results	PRIMARY	1	id	0
cvs	idx_cvs_user_updated	1	user_id	1
cvs	idx_cvs_user_updated	2	updated_at	1
cvs	PRIMARY	1	id	0
email_verifications	idx_email_verifications_expiry	1	expires_at	1
email_verifications	PRIMARY	1	id	0
email_verifications	uq_email_verifications_email	1	email	0
employer_profiles	PRIMARY	1	id	0
employer_profiles	user_id	1	user_id	0
job_match_scores	idx_match_job_score	1	job_id	1
job_match_scores	idx_match_job_score	2	score	1
job_match_scores	idx_match_student_score	1	student_id	1
job_match_scores	idx_match_student_score	2	score	1
job_match_scores	PRIMARY	1	id	0
job_match_scores	uq_match_version	1	student_id	0
job_match_scores	uq_match_version	2	job_id	0
job_match_scores	uq_match_version	3	method	0
job_match_scores	uq_match_version	4	score_version	0
job_skills	fk_job_skill	1	skill_id	1
job_skills	PRIMARY	1	job_id	0
job_skills	PRIMARY	2	skill_id	0
jobs	idx_jobs_employer_created	1	employer_id	1
jobs	idx_jobs_employer_created	2	created_at	1
jobs	idx_jobs_public	1	moderation_status	1
jobs	idx_jobs_public	2	created_at	1
jobs	PRIMARY	1	id	0
messages	fk_message_sender	1	sender_id	1
messages	idx_messages_conversation_created	1	conversation_id	1
messages	idx_messages_conversation_created	2	created_at	1
messages	idx_messages_conversation_created	3	id	1
messages	PRIMARY	1	id	0
reviews	fk_review_user	1	user_id	1
reviews	PRIMARY	1	id	0
reviews	uq_review_job_user	1	job_id	0
reviews	uq_review_job_user	2	user_id	0
skills	normalized_name	1	normalized_name	0
skills	PRIMARY	1	id	0
student_profiles	PRIMARY	1	id	0
student_profiles	user_id	1	user_id	0
student_skills	fk_student_parse	1	cv_parse_result_id	1
student_skills	fk_student_skill	1	skill_id	1
student_skills	PRIMARY	1	student_id	0
student_skills	PRIMARY	2	skill_id	0
users	email	1	email	0
users	idx_users_role	1	role	1
users	PRIMARY	1	id	0

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO cv_parse_results (user_id,file_name,parser,model,source_file_type,status,extracted,warnings,feedback,duration_ms,file_hash,expires_at) VALUES (1,'synthetic.pdf','ai_llm','demo','pdf','success',JSON_OBJECT('name','Synthetic'),JSON_ARRAY('warning'),JSON_OBJECT('score',42),12,REPEAT('a',64),DATE_ADD(NOW(), INTERVAL 90 DAY)); SET @history_id=LAST_INSERT_ID(); SELECT @history_id > 0; SELECT file_name,JSON_UNQUOTE(JSON_EXTRACT(extracted,'$.name')),JSON_EXTRACT(warnings,'$[0]'),JSON_EXTRACT(feedback,'$.score'),TIMESTAMPDIFF(DAY,created_at,expires_at),cv_id IS NULL FROM cv_parse_results WHERE id=@history_id AND user_id=1 AND (expires_at IS NULL OR expires_at > NOW()); SELECT COUNT(*) FROM cv_parse_results WHERE id=@history_id AND user_id=2 AND (expires_at IS NULL OR expires_at > NOW()); DELETE FROM cv_parse_results WHERE id=@history_id AND user_id=2; SELECT ROW_COUNT(); UPDATE cv_parse_results SET expires_at=DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id=@history_id; SELECT COUNT(*) FROM cv_parse_results WHERE id=@history_id AND user_id=1 AND (expires_at IS NULL OR expires_at > NOW()); DELETE FROM cv_parse_results WHERE id=@history_id AND user_id=1; SELECT ROW_COUNT(); ROLLBACK;"
1
synthetic.pdf	Synthetic	"warning"	42	90	1
0
0
0
1

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO reviews(job_id,user_id,rating,comment) VALUES(1,1,5,'Synthetic review'); SELECT rating,comment FROM reviews WHERE job_id=1 AND user_id=1; DELETE FROM jobs WHERE id=1; SELECT COUNT(*) FROM reviews; ROLLBACK;"
5	Synthetic review
0

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO reviews(job_id,user_id,rating,comment) VALUES(1,1,6,'invalid')"
ERROR 3819 (HY000) at line 1: Check constraint 'chk_review_rating' is violated.

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO reviews(job_id,user_id,rating,comment) VALUES(999999,1,5,'orphan')"
ERROR 1452 (23000) at line 1: Cannot add or update a child row: a foreign key constraint fails (`studentjob_marketplace`.`reviews`, CONSTRAINT `fk_review_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE)

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO reviews(job_id,user_id,rating,comment) VALUES(1,1,5,'one'),(1,1,4,'duplicate')"
ERROR 1062 (23000) at line 1: Duplicate entry '1-1' for key 'reviews.uq_review_job_user'

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO cv_parse_results(user_id,parser,status,extracted,expires_at) VALUES(999999,'basic_rule','partial',JSON_OBJECT(),NOW())"
ERROR 1452 (23000) at line 1: Cannot add or update a child row: a foreign key constraint fails (`studentjob_marketplace`.`cv_parse_results`, CONSTRAINT `fk_parse_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE)

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO cv_parse_results(user_id,parser,status,extracted,expires_at) VALUES(1,'basic_rule','invalid',JSON_OBJECT(),NOW())"
ERROR 1265 (01000) at line 1: Data truncated for column 'status' at row 1

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO cv_parse_results(user_id,parser,status,extracted,expires_at) VALUES(1,'basic_rule','partial','not json',NOW())"
ERROR 3140 (22032) at line 1: Invalid JSON text: "Invalid value." at position 1 in value for column 'cv_parse_results.extracted'.

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "SELECT id,title,status,moderation_status FROM jobs ORDER BY id"
1	Part-time Sales Assistant	OPEN	APPROVED
2	Junior Web Developer Intern	OPEN	APPROVED

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO applications(job_id,student_id) VALUES(1,1)"
ERROR 1062 (23000) at line 1: Duplicate entry '1-1' for key 'applications.uq_application_job_student'

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO messages(conversation_id,sender_id,content) VALUES(999999,1,'orphan')"
ERROR 1452 (23000) at line 1: Cannot add or update a child row: a foreign key constraint fails (`studentjob_marketplace`.`messages`, CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE)

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO job_match_scores(student_id,job_id,score,method,score_version) VALUES(1,1,101,'skill_overlap','v1')"
ERROR 3819 (HY000) at line 1: Check constraint 'chk_match_score' is violated.

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO conversations(student_id,employer_id) VALUES(1,1) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id); INSERT INTO conversations(student_id,employer_id) VALUES(1,1) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id); INSERT INTO messages(conversation_id,sender_id,content) VALUES(LAST_INSERT_ID(),1,'Demo message'); SELECT COUNT(*) FROM conversations; SELECT content FROM messages; DELETE FROM conversations; SELECT COUNT(*) FROM messages; DELETE FROM cvs WHERE id=1; SELECT cv_id IS NULL FROM applications WHERE id=1; ROLLBACK;"
1
Demo message
0
1

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO cv_parse_results(user_id,cv_id,parser,status,extracted,expires_at) VALUES(1,1,'regex','success',JSON_OBJECT(),CURRENT_TIMESTAMP + INTERVAL 90 DAY); SELECT TIMESTAMPDIFF(DAY,created_at,expires_at) FROM cv_parse_results; UPDATE student_skills SET cv_parse_result_id=LAST_INSERT_ID() WHERE student_id=1; DELETE FROM cv_parse_results; SELECT COUNT(*) FROM student_skills WHERE cv_parse_result_id IS NOT NULL; ROLLBACK;"
90
0

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "INSERT INTO cv_parse_results(user_id,parser,status,extracted) VALUES(1,'regex','failed',JSON_OBJECT())"
ERROR 1364 (HY000) at line 1: Field 'expires_at' doesn't have a default value

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO job_match_scores(student_id,job_id,score,method,score_version,explanation) VALUES(1,2,50,'skill_overlap','v1',JSON_OBJECT('matched',JSON_ARRAY(1),'missing',JSON_ARRAY(6),'required_missing',JSON_ARRAY(2))),(1,2,60,'skill_overlap','v2',JSON_OBJECT()); SELECT COUNT(*) FROM job_match_scores; ROLLBACK;"
2

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "START TRANSACTION; INSERT INTO job_match_scores(student_id,job_id,score,method,score_version) VALUES(1,2,50,'skill_overlap','v1'),(1,2,60,'skill_overlap','v1')"
ERROR 1062 (23000) at line 1: Duplicate entry '1-2-skill_overlap-v1' for key 'job_match_scores.uq_match_version'

exit=1

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT * FROM jobs WHERE moderation_status='APPROVED' ORDER BY created_at DESC"
-> Index lookup on jobs using idx_jobs_public (moderation_status='APPROVED') (reverse)  (cost=0.7 rows=2) (actual time=0.0616..0.0828 rows=2 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT * FROM cvs WHERE user_id=1 ORDER BY updated_at DESC"
-> Index lookup on cvs using idx_cvs_user_updated (user_id=1) (reverse)  (cost=0.35 rows=1) (actual time=0.0511..0.055 rows=1 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id=1 ORDER BY created_at,id"
-> Index lookup on messages using idx_messages_conversation_created (conversation_id=1)  (cost=0.35 rows=1) (actual time=0.0059..0.0059 rows=0 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT * FROM applications WHERE student_id=1 ORDER BY applied_at DESC"
-> Index lookup on applications using idx_applications_student_applied (student_id=1) (reverse)  (cost=0.35 rows=1) (actual time=0.0177..0.022 rows=1 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT j.*,ep.company_name FROM jobs j LEFT JOIN employer_profiles ep ON j.employer_id=ep.id WHERE j.moderation_status='APPROVED' ORDER BY j.created_at DESC"
-> Sort: j.created_at DESC  (actual time=0.108..0.108 rows=2 loops=1)\n    -> Stream results  (cost=0.689 rows=2) (actual time=0.0816..0.0917 rows=2 loops=1)\n        -> Left hash join (ep.id = j.employer_id)  (cost=0.689 rows=2) (actual time=0.0431..0.0491 rows=2 loops=1)\n            -> Index lookup on j using idx_jobs_public (moderation_status='APPROVED')  (cost=0.7 rows=2) (actual time=0.0188..0.0238 rows=2 loops=1)\n            -> Hash\n                -> Table scan on ep  (cost=0.196 rows=1) (actual time=0.0057..0.0084 rows=1 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml exec -T -e MYSQL_PWD=demo-only mysql mysql --default-character-set=utf8mb4 -ustudentjob_demo -N -B studentjob_marketplace -e "EXPLAIN ANALYZE SELECT a.id,j.title,sp.full_name,eu.email FROM applications a JOIN jobs j ON a.job_id=j.id JOIN student_profiles sp ON a.student_id=sp.id JOIN users su ON sp.user_id=su.id JOIN employer_profiles ep ON j.employer_id=ep.id JOIN users eu ON ep.user_id=eu.id ORDER BY a.applied_at DESC,a.id DESC"
-> Nested loop inner join  (cost=2.1 rows=1) (actual time=0.0421..0.0428 rows=1 loops=1)\n    -> Nested loop inner join  (cost=1.75 rows=1) (actual time=0.0388..0.0392 rows=1 loops=1)\n        -> Nested loop inner join  (cost=1.4 rows=1) (actual time=0.0368..0.0371 rows=1 loops=1)\n            -> Nested loop inner join  (cost=1.05 rows=1) (actual time=0.0342..0.0345 rows=1 loops=1)\n                -> Nested loop inner join  (cost=0.7 rows=1) (actual time=0.0316..0.0318 rows=1 loops=1)\n                    -> Sort: a.applied_at DESC, a.id DESC  (cost=0.35 rows=1) (actual time=0.0229..0.0229 rows=1 loops=1)\n                        -> Table scan on a  (cost=0.35 rows=1) (actual time=0.0105..0.0129 rows=1 loops=1)\n                    -> Single-row index lookup on j using PRIMARY (id=a.job_id)  (cost=0.35 rows=1) (actual time=0.0081..0.0081 rows=1 loops=1)\n                -> Single-row index lookup on sp using PRIMARY (id=a.student_id)  (cost=0.35 rows=1) (actual time=0.0025..0.0025 rows=1 loops=1)\n            -> Single-row index lookup on ep using PRIMARY (id=j.employer_id)  (cost=0.35 rows=1) (actual time=0.0023..0.0023 rows=1 loops=1)\n        -> Single-row covering index lookup on su using PRIMARY (id=sp.user_id)  (cost=0.35 rows=1) (actual time=0.002..0.002 rows=1 loops=1)\n    -> Single-row index lookup on eu using PRIMARY (id=ep.user_id)  (cost=0.35 rows=1) (actual time=0.0028..0.0028 rows=1 loops=1)\n

exit=0

$ docker compose -p sjdb-verify-20261126-db008b -f C:\Users\khang\orca\workspaces\StudentJob_Marketplace\db-integration-008\database\docker-compose.yml logs --no-color mysql
mysql-1  | 2026-11-26 06:21:09+00:00 [Note] [Entrypoint]: Entrypoint script for MySQL Server 8.4.13-1.el9 started.
mysql-1  | 2026-11-26 06:21:09+00:00 [Note] [Entrypoint]: Switching to dedicated user 'mysql'
mysql-1  | 2026-11-26 06:21:09+00:00 [Note] [Entrypoint]: Entrypoint script for MySQL Server 8.4.13-1.el9 started.
mysql-1  | 2026-11-26 06:21:10+00:00 [Note] [Entrypoint]: Initializing database files
mysql-1  | 2026-11-26T06:21:10.304220Z 0 [System] [MY-015017] [Server] MySQL Server Initialization - start.
mysql-1  | 2026-11-26T06:21:10.306107Z 0 [System] [MY-013169] [Server] /usr/sbin/mysqld (mysqld 8.4.13) initializing of server in progress as process 80
mysql-1  | 2026-11-26T06:21:10.306110Z 0 [System] [MY-015150] [Server] Server version with update: '8.4.13.0'
mysql-1  | 2026-11-26T06:21:10.317398Z 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started.
mysql-1  | 2026-11-26T06:21:10.677626Z 1 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.
mysql-1  | 2026-11-26T06:21:12.008951Z 6 [Warning] [MY-010453] [Server] root@localhost is created with an empty password ! Please consider switching off the --initialize-insecure option.
mysql-1  | 2026-11-26T06:21:14.748286Z 0 [System] [MY-015018] [Server] MySQL Server Initialization - end.
mysql-1  | 2026-11-26 06:21:14+00:00 [Note] [Entrypoint]: Database files initialized
mysql-1  | 2026-11-26 06:21:14+00:00 [Note] [Entrypoint]: Starting temporary server
mysql-1  | 2026-11-26T06:21:14.807102Z 0 [System] [MY-015015] [Server] MySQL Server - start.
mysql-1  | 2026-11-26T06:21:15.060976Z 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.4.13) starting as process 128
mysql-1  | 2026-11-26T06:21:15.060980Z 0 [System] [MY-015150] [Server] Server version with update: '8.4.13.0'
mysql-1  | 2026-11-26T06:21:15.081352Z 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started.
mysql-1  | 2026-11-26T06:21:15.528048Z 1 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.
mysql-1  | 2026-11-26T06:21:16.225567Z 0 [Warning] [MY-010068] [Server] CA certificate ca.pem is self signed.
mysql-1  | 2026-11-26T06:21:16.225661Z 0 [System] [MY-013602] [Server] Channel mysql_main configured to support TLS. Encrypted connections are now supported for this channel.
mysql-1  | 2026-11-26T06:21:16.233291Z 0 [Warning] [MY-011810] [Server] Insecure configuration for --pid-file: Location '/var/run/mysqld' in the path is accessible to all OS users. Consider choosing a different directory.
mysql-1  | 2026-11-26T06:21:16.277688Z 0 [System] [MY-011323] [Server] X Plugin ready for connections. Socket: /var/run/mysqld/mysqlx.sock
mysql-1  | 2026-11-26T06:21:16.278217Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.13'  socket: '/var/run/mysqld/mysqld.sock'  port: 0  MySQL Community Server - GPL.
mysql-1  | 2026-11-26 06:21:16+00:00 [Note] [Entrypoint]: Temporary server started.
mysql-1  | '/var/lib/mysql/mysql.sock' -> '/var/run/mysqld/mysqld.sock'
mysql-1  | 2026-11-26 06:21:19+00:00 [Note] [Entrypoint]: Creating database studentjob_marketplace
mysql-1  | 2026-11-26 06:21:19+00:00 [Note] [Entrypoint]: Creating user studentjob_demo
mysql-1  | 2026-11-26 06:21:19+00:00 [Note] [Entrypoint]: Giving user studentjob_demo access to schema studentjob_marketplace
mysql-1  |
mysql-1  | 2026-11-26 06:21:19+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/001_users_profiles.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:20+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/002_jobs_applications.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:20+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/003_email_verifications.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:20+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/004_cvs.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:20+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/005_chat.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:20+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/006_ai.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:21+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/007_reviews_profile_cv.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:21+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/008_cv_feedback_history.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:21+00:00 [Note] [Entrypoint]: /usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/900_demo.sql
mysql-1  |
mysql-1  |
mysql-1  | 2026-11-26 06:21:21+00:00 [Note] [Entrypoint]: Stopping temporary server
mysql-1  | 2026-11-26T06:21:21.550989Z 22 [System] [MY-013172] [Server] Received SHUTDOWN from user root. Shutting down mysqld (Version: 8.4.13).
mysql-1  | 2026-11-26T06:21:22.614536Z 0 [System] [MY-010910] [Server] /usr/sbin/mysqld: Shutdown complete (mysqld 8.4.13)  MySQL Community Server - GPL.
mysql-1  | 2026-11-26T06:21:22.614575Z 0 [System] [MY-015016] [Server] MySQL Server - end.
mysql-1  | 2026-11-26 06:21:23+00:00 [Note] [Entrypoint]: Temporary server stopped
mysql-1  |
mysql-1  | 2026-11-26 06:21:23+00:00 [Note] [Entrypoint]: MySQL init process done. Ready for start up.
mysql-1  |
mysql-1  | 2026-11-26T06:21:23.570722Z 0 [System] [MY-015015] [Server] MySQL Server - start.
mysql-1  | 2026-11-26T06:21:23.815541Z 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.4.13) starting as process 1
mysql-1  | 2026-11-26T06:21:23.815546Z 0 [System] [MY-015150] [Server] Server version with update: '8.4.13.0'
mysql-1  | 2026-11-26T06:21:23.825225Z 1 [System] [MY-013576] [InnoDB] InnoDB initialization has started.
mysql-1  | 2026-11-26T06:21:24.151933Z 1 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.
mysql-1  | 2026-11-26T06:21:24.424468Z 0 [Warning] [MY-010068] [Server] CA certificate ca.pem is self signed.
mysql-1  | 2026-11-26T06:21:24.424514Z 0 [System] [MY-013602] [Server] Channel mysql_main configured to support TLS. Encrypted connections are now supported for this channel.
mysql-1  | 2026-11-26T06:21:24.427641Z 0 [Warning] [MY-011810] [Server] Insecure configuration for --pid-file: Location '/var/run/mysqld' in the path is accessible to all OS users. Consider choosing a different directory.
mysql-1  | 2026-11-26T06:21:24.466561Z 0 [System] [MY-011323] [Server] X Plugin ready for connections. Bind-address: '::' port: 33060, socket: /var/run/mysqld/mysqlx.sock
mysql-1  | 2026-11-26T06:21:24.466767Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Version: '8.4.13'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306  MySQL Community Server - GPL.

exit=0

PASS: fresh initialization and contract checks; volume retained
```
