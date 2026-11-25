CREATE TABLE conversations (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL, employer_id INT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_conversation_pair (student_id, employer_id),
 INDEX idx_conversations_student_created (student_id, created_at),
 INDEX idx_conversations_employer_created (employer_id, created_at),
 CONSTRAINT fk_conversation_student FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_conversation_employer FOREIGN KEY (employer_id) REFERENCES employer_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 conversation_id INT NOT NULL, sender_id INT NOT NULL, content TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_messages_conversation_created (conversation_id, created_at, id),
 CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
