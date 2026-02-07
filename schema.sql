-- Hackers 1995 Leaderboard Schema

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS leaderboard;

-- Create leaderboard table
CREATE TABLE leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster leaderboard queries (sorted by time)
CREATE INDEX idx_leaderboard_time ON leaderboard(time_ms ASC);

-- Insert sample data for testing (optional - remove after testing)
-- INSERT INTO leaderboard (alias, time_ms) VALUES 
--     ('ACID_BURN', 45230),
--     ('CRASH_OVERRIDE', 52140),
--     ('CEREAL_KILLER', 63890),
--     ('LORD_NIKON', 71250),
--     ('THE_PLAGUE', 89400);

-- Verify table structure
-- SELECT * FROM leaderboard ORDER BY time_ms ASC LIMIT 10;
