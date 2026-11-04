CREATE TABLE IF NOT EXISTS bug_reports (
 id TEXT PRIMARY KEY,
 reporter_id TEXT NOT NULL,
 mode TEXT NOT NULL,
 description TEXT NOT NULL,
 build TEXT NOT NULL,
 distribution TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','resolved'))
);
CREATE INDEX IF NOT EXISTS bug_reports_inbox ON bug_reports(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS bug_reports_reporter ON bug_reports(reporter_id,created_at);
CREATE INDEX IF NOT EXISTS bug_reports_status ON bug_reports(status,created_at DESC,id DESC);
