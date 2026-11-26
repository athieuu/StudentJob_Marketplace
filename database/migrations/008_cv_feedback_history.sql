ALTER TABLE cv_parse_results
  ADD COLUMN file_name VARCHAR(255) NULL AFTER cv_id,
  ADD COLUMN feedback JSON NULL AFTER warnings;
