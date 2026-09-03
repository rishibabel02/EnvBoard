ALTER TABLE history ADD COLUMN actor_id INT NULL AFTER user_id;
ALTER TABLE history ADD CONSTRAINT fk_history_actor FOREIGN KEY (actor_id) REFERENCES users(id);
