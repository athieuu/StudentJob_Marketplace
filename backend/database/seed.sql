-- DEPRECATED: historical SQL only; use database/migrations/001..006 and database/README.md. Do not import alongside the canonical baseline.
-- StudentJob Marketplace
-- Demo seed data
-- Demo password for both accounts: Student@123

USE studentjob_marketplace;

-- 1. Demo users
INSERT INTO users (id, email, password, role)
VALUES
(1, 'student.demo@example.com', '$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO', 'STUDENT'),
(2, 'employer.demo@example.com', '$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO', 'EMPLOYER');

-- 2. Student profile
INSERT INTO student_profiles
(id, user_id, full_name, phone, university, major, bio)
VALUES
(1, 1, 'Demo Student', '0900000001', 'Demo University',
 'Information Technology', 'Student demo account for testing');

-- 3. Employer profile
INSERT INTO employer_profiles
(id, user_id, company_name, phone, address, description)
VALUES
(1, 2, 'Demo Technology Company', '0900000002',
 'Ho Chi Minh City', 'Demo employer account for testing');

-- 4. Demo jobs
INSERT INTO jobs
(id, employer_id, title, description, location,
 salary_min, salary_max, job_type, deadline, status)
VALUES
(1, 1, 'Part-time Sales Assistant',
 'Support sales activities and customer service.',
 'Ho Chi Minh City', 25000, 35000,
 'PART_TIME', '2026-12-31', 'OPEN'),

(2, 1, 'Junior Web Developer Intern',
 'Assist the development team with website development and testing.',
 'Ho Chi Minh City', 30000, 50000,
 'FREELANCE', '2026-12-31', 'OPEN');

-- 5. Demo application
INSERT INTO applications
(id, job_id, student_id, cv_url, cover_letter, status)
VALUES
(1, 1, 1, 'https://example.com/demo-cv.pdf',
 'I would like to apply for this position.',
 'PENDING');