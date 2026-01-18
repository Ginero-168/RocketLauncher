-- =============================================
-- TATA Marketplace Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Scripts Table
CREATE TABLE scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  icon TEXT DEFAULT '⭐',
  category TEXT DEFAULT 'tools',
  author_name TEXT DEFAULT 'Anonymous',
  votes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Plugins Table (for sub-panels)
CREATE TABLE plugins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  files_url TEXT,
  icon TEXT DEFAULT '📦',
  author_name TEXT DEFAULT 'Anonymous',
  votes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) but allow public access
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugins ENABLE ROW LEVEL SECURITY;

-- 4. Public read policy (anyone can read)
CREATE POLICY "Public read scripts" ON scripts FOR SELECT USING (true);
CREATE POLICY "Public read plugins" ON plugins FOR SELECT USING (true);

-- 5. Public insert policy (anyone can upload)
CREATE POLICY "Public insert scripts" ON scripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert plugins" ON plugins FOR INSERT WITH CHECK (true);

-- 6. Public update for votes/downloads only
CREATE POLICY "Public update scripts" ON scripts FOR UPDATE USING (true);
CREATE POLICY "Public update plugins" ON plugins FOR UPDATE USING (true);

-- 7. Insert sample data for testing
INSERT INTO scripts (name, description, code, icon, category, votes, downloads) VALUES
('Fit to Artboard', 'Scale selection to fit artboard', 'var doc = app.activeDocument; alert("Fit!");', '📐', 'swift', 42, 128),
('Random Colors', 'Apply random colors to selection', 'var items = app.activeDocument.selection; alert("Colors!");', '🎨', 'creative', 28, 89),
('Center Objects', 'Center selected objects on artboard', 'alert("Centered!");', '⚡', 'tools', 15, 45);

-- 8. Auto-delete function (delete scripts with 0 downloads after 14 days)
CREATE OR REPLACE FUNCTION cleanup_unused_scripts()
RETURNS void AS $$
BEGIN
  DELETE FROM scripts 
  WHERE downloads = 0 
  AND created_at < NOW() - INTERVAL '14 days';
  
  DELETE FROM plugins 
  WHERE downloads = 0 
  AND created_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;
