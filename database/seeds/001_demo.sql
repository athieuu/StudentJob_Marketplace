-- Synthetic development data only. All accounts: Student@123.
START TRANSACTION;
INSERT INTO users (id,email,password,role) VALUES
 (1,'student.demo@example.com','$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO','STUDENT'),
 (2,'employer.demo@example.com','$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO','EMPLOYER'),
 (3,'admin.demo@example.com','$2b$10$pg2wNKV6NWlLvmNRFadrrOP0UQBIheW9T8qYynZJbVtJx6PosUPgO','ADMIN');
INSERT INTO student_profiles (id,user_id,full_name,university,major,bio)
 VALUES (1,1,'Demo Student','Demo University','Information Technology','Synthetic demo profile');
INSERT INTO employer_profiles (id,user_id,company_name,address,description)
 VALUES (1,2,'Demo Technology Company','Ho Chi Minh City','Synthetic demo employer');
INSERT INTO jobs (id,employer_id,title,description,location,salary_min,salary_max,job_type,deadline,status,moderation_status) VALUES
 (1,1,'Part-time Sales Assistant','Support sales activities and customer service.','Ho Chi Minh City',25000,35000,'PART_TIME','2026-12-31','OPEN','APPROVED'),
 (2,1,'Junior Web Developer Intern','Assist website development and testing.','Ho Chi Minh City',30000,50000,'FREELANCE','2026-12-31','OPEN','APPROVED');
INSERT INTO cvs (id,user_id,title,personal_info,education,experience,skills,projects,certifications)
 VALUES (1,1,'Demo CV',JSON_OBJECT('full_name','Demo Student'),JSON_ARRAY(),JSON_ARRAY(),JSON_ARRAY('JavaScript','React'),JSON_ARRAY(),JSON_ARRAY());
INSERT INTO applications (id,job_id,student_id,cv_url,cover_letter,status,cv_id)
 VALUES (1,1,1,'https://example.com/demo-cv.pdf','Synthetic demo application','PENDING',1);
INSERT INTO skills (id,name,normalized_name,category) VALUES
 (1,'JavaScript','javascript','programming'),(2,'React','react','programming'),
 (3,'Node.js','nodejs','programming'),(4,'Customer Service','customer service','soft'),
 (5,'English','english','language'),(6,'MySQL','mysql','programming');
INSERT INTO student_skills (student_id,skill_id,source,level) VALUES (1,1,'manual',3),(1,2,'manual',2);
INSERT INTO job_skills (job_id,skill_id,is_required,weight) VALUES (1,4,TRUE,1),(1,5,FALSE,0.5),(2,1,TRUE,1),(2,2,TRUE,1),(2,6,FALSE,0.5);
COMMIT;
