-- ============================================================
-- ScholarX — Complete Supabase schema (run in the SQL editor)
-- Order matters: profiles/tables first, then RLS + policies,
-- then RPC functions, then the new-user trigger.
-- ============================================================

-- ------------------------------------------------------------
-- Public user profiles (mirrors auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  level TEXT DEFAULT 'ss1',
  role TEXT DEFAULT 'secondary' CHECK (role IN ('secondary', 'university', 'admin')),
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Quiz questions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam TEXT NOT NULL,
  subject TEXT NOT NULL,
  year TEXT,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_option TEXT,
  explanation TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Quiz attempts + answers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exam TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN DEFAULT false
);

-- ------------------------------------------------------------
-- Library / saved items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT,
  type TEXT DEFAULT 'note',
  description TEXT,
  content TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES library_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- ------------------------------------------------------------
-- News + opportunities (scraper output)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT,
  summary TEXT,
  url TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  provider TEXT,
  description TEXT,
  url TEXT,
  deadline DATE,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Community: posts + likes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  subject TEXT,
  likes_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- ------------------------------------------------------------
-- Community: study groups + members + chat
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- Grades tracker
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  units INTEGER DEFAULT 3,
  score NUMERIC DEFAULT 0,
  grade TEXT,
  semester TEXT DEFAULT 'first',
  session TEXT DEFAULT '2025/2026',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS term_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  ca_score NUMERIC DEFAULT 0,
  exam_score NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  term TEXT DEFAULT 'first',
  session TEXT DEFAULT '2025/2026',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Existing tables kept
CREATE TABLE IF NOT EXISTS grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL,
  credit_units INTEGER NOT NULL DEFAULT 3,
  semester TEXT NOT NULL DEFAULT 'first',
  session TEXT NOT NULL DEFAULT '2024/2025',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- users: anyone signed in can read profiles (feed joins need it);
-- each user manages their own profile
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- questions: signed-in users read; admin writes via service role
DROP POLICY IF EXISTS "questions_select" ON questions;
CREATE POLICY "questions_select" ON questions FOR SELECT USING (auth.role() = 'authenticated');

-- quiz_attempts + quiz_answers: own only
DROP POLICY IF EXISTS "attempts_select_own" ON quiz_attempts;
CREATE POLICY "attempts_select_own" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "attempts_insert_own" ON quiz_attempts;
CREATE POLICY "attempts_insert_own" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "answers_insert" ON quiz_answers;
CREATE POLICY "answers_insert" ON quiz_answers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- library: signed-in users read; saved items are per-user
DROP POLICY IF EXISTS "library_select" ON library_items;
CREATE POLICY "library_select" ON library_items FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "saved_select_own" ON saved_items;
CREATE POLICY "saved_select_own" ON saved_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_insert_own" ON saved_items;
CREATE POLICY "saved_insert_own" ON saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_delete_own" ON saved_items;
CREATE POLICY "saved_delete_own" ON saved_items FOR DELETE USING (auth.uid() = user_id);

-- news + opportunities: public read for signed-in users
DROP POLICY IF EXISTS "news_select" ON news;
CREATE POLICY "news_select" ON news FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "opportunities_select" ON opportunities;
CREATE POLICY "opportunities_select" ON opportunities FOR SELECT USING (auth.role() = 'authenticated');

-- posts: feed is shared, create/delete own
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "likes_select" ON post_likes;
CREATE POLICY "likes_select" ON post_likes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_insert" ON post_likes;
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete" ON post_likes;
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- groups: anyone signed in browses; create via request
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_insert" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "members_select_own" ON group_members;
CREATE POLICY "members_select_own" ON group_members FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "members_insert" ON group_members;
CREATE POLICY "members_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "members_delete" ON group_members;
CREATE POLICY "members_delete" ON group_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_select" ON group_messages;
CREATE POLICY "messages_select" ON group_messages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "messages_insert" ON group_messages;
CREATE POLICY "messages_insert" ON group_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- payments: own only
DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- courses + term_results: own only
DROP POLICY IF EXISTS "courses_select_own" ON courses;
CREATE POLICY "courses_select_own" ON courses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "courses_insert_own" ON courses;
CREATE POLICY "courses_insert_own" ON courses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "courses_delete_own" ON courses;
CREATE POLICY "courses_delete_own" ON courses FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "results_select_own" ON term_results;
CREATE POLICY "results_select_own" ON term_results FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "results_insert_own" ON term_results;
CREATE POLICY "results_insert_own" ON term_results FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "results_delete_own" ON term_results;
CREATE POLICY "results_delete_own" ON term_results FOR DELETE USING (auth.uid() = user_id);

-- grades / ai tables (kept from original)
DROP POLICY IF EXISTS "grades_select_own" ON grades;
CREATE POLICY "grades_select_own" ON grades FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "grades_insert_own" ON grades;
CREATE POLICY "grades_insert_own" ON grades FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "grades_delete_own" ON grades;
CREATE POLICY "grades_delete_own" ON grades FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_select_own" ON ai_usage;
CREATE POLICY "ai_usage_select_own" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_usage_insert_own" ON ai_usage;
CREATE POLICY "ai_usage_insert_own" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_usage_update_own" ON ai_usage;
CREATE POLICY "ai_usage_update_own" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conv_select_own" ON ai_conversations;
CREATE POLICY "ai_conv_select_own" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_conv_insert_own" ON ai_conversations;
CREATE POLICY "ai_conv_insert_own" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_conv_update_own" ON ai_conversations;
CREATE POLICY "ai_conv_update_own" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- RPC functions (counters)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION decrement_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION increment_group_members(p_group_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = member_count + 1 WHERE id = p_group_id;
$$;

CREATE OR REPLACE FUNCTION decrement_group_members(p_group_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = p_group_id;
$$;

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Storage: avatars bucket + policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);
