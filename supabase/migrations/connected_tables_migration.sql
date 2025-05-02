-- Migration for tables connected to Articles in Supabase
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Authors Table
CREATE TABLE IF NOT EXISTS authors (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on author slug
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on category slug
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 3. Tags Table (separate from tag array in articles for tag management)
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on tag slug
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- 4. Article_Tags Junction Table (for better tag management)
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on article_id for faster comment lookups
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);

-- 6. User Roles Table (for permission management)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- 7. Article Views Analytics Table
CREATE TABLE IF NOT EXISTS article_views (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on article_id for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);

-- 8. Media Library Table
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  alt_text TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update the articles table to add proper foreign keys
ALTER TABLE articles 
  ADD CONSTRAINT fk_articles_author 
  FOREIGN KEY (author_id) 
  REFERENCES authors(id) ON DELETE CASCADE;

ALTER TABLE articles 
  ADD CONSTRAINT fk_articles_category 
  FOREIGN KEY (category) 
  REFERENCES categories(name) ON DELETE SET NULL;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
CREATE TRIGGER set_timestamp_authors
BEFORE UPDATE ON authors
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_categories
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_comments
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_media
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- RLS Policies for all tables
-- Authors
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view authors" 
ON authors FOR SELECT 
USING (true);

CREATE POLICY "Authors can update their own profile" 
ON authors FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all authors" 
ON authors FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" 
ON categories FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage categories" 
ON categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" 
ON tags FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tags" 
ON tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Article_Tags
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article tags" 
ON article_tags FOR SELECT 
USING (true);

CREATE POLICY "Authors can manage tags for their articles" 
ON article_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM articles a
    JOIN authors au ON a.author_id = au.id
    WHERE a.id = article_tags.article_id
    AND au.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all article tags" 
ON article_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved comments" 
ON comments FOR SELECT 
USING (is_approved = true);

CREATE POLICY "Users can create comments" 
ON comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own comments" 
ON comments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments" 
ON comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media" 
ON media FOR SELECT 
USING (true);

CREATE POLICY "Users can upload their own media" 
ON media FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own media" 
ON media FOR UPDATE
USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all media" 
ON media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create useful views
CREATE OR REPLACE VIEW public.article_details AS
SELECT 
  a.id,
  a.title,
  a.slug,
  a.excerpt,
  a.content,
  a.featured_image,
  a.author_id,
  au.name AS author_name,
  au.avatar AS author_avatar,
  a.category,
  a.published_at,
  a.tags,
  a.reading_time,
  COUNT(DISTINCT c.id) AS comment_count,
  COUNT(DISTINCT av.id) AS view_count
FROM 
  articles a
LEFT JOIN 
  authors au ON a.author_id = au.id
LEFT JOIN 
  comments c ON a.id = c.article_id AND c.is_approved = true
LEFT JOIN 
  article_views av ON a.id = av.article_id
GROUP BY 
  a.id, au.name, au.avatar;

-- Create functions for common operations
-- Function to add a tag to an article
CREATE OR REPLACE FUNCTION add_tag_to_article(article_slug TEXT, tag_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_article_id INTEGER;
  v_tag_id INTEGER;
BEGIN
  -- Get article ID
  SELECT id INTO v_article_id FROM articles WHERE slug = article_slug;
  IF v_article_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get or create tag
  SELECT id INTO v_tag_id FROM tags WHERE name = tag_name;
  IF v_tag_id IS NULL THEN
    INSERT INTO tags (name, slug) VALUES (tag_name, generate_slug(tag_name)) RETURNING id INTO v_tag_id;
  END IF;
  
  -- Add relationship if it doesn't exist
  INSERT INTO article_tags (article_id, tag_id)
  VALUES (v_article_id, v_tag_id)
  ON CONFLICT (article_id, tag_id) DO NOTHING;
  
  -- Update the tags array in the articles table
  UPDATE articles
  SET tags = (
    SELECT array_agg(DISTINCT t.name)
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    WHERE at.article_id = v_article_id
  )
  WHERE id = v_article_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;