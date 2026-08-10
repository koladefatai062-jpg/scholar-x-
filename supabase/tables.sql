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
  streak INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

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

ALTER TABLE library_items ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'secondary';
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE library_items ADD COLUMN IF NOT EXISTS cover_url TEXT;

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

ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

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

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS org TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS amount TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS apply_url TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

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
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE groups ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  read_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS group_message_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
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

ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

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
  session TEXT NOT NULL DEFAULT '2025/2026',
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
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS title TEXT;

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
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
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
-- admins can update their groups' name / subject / description
DROP POLICY IF EXISTS "groups_admin_update" ON groups;
CREATE POLICY "groups_admin_update" ON groups
  FOR UPDATE USING (public.is_group_admin(groups.id))
  WITH CHECK (public.is_group_admin(groups.id));

-- membership helpers (SECURITY DEFINER avoids RLS self-reference recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.role = 'admin');
$$;

-- members: group members can see the roster of groups they belong to
DROP POLICY IF EXISTS "members_select_own" ON group_members;
CREATE POLICY "members_select_group" ON group_members
  FOR SELECT USING (public.is_group_member(group_members.group_id));
DROP POLICY IF EXISTS "members_insert" ON group_members;
CREATE POLICY "members_insert" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "members_delete" ON group_members;
CREATE POLICY "members_delete" ON group_members FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "members_update_own" ON group_members;
CREATE POLICY "members_update_own" ON group_members FOR UPDATE USING (auth.uid() = user_id);
-- admins can remove members and change roles in their groups
DROP POLICY IF EXISTS "members_admin_delete" ON group_members;
CREATE POLICY "members_admin_delete" ON group_members
  FOR DELETE USING (public.is_group_admin(group_members.group_id));
DROP POLICY IF EXISTS "members_admin_update" ON group_members;
CREATE POLICY "members_admin_update" ON group_members
  FOR UPDATE USING (public.is_group_admin(group_members.group_id))
  WITH CHECK (public.is_group_admin(group_members.group_id));

DROP POLICY IF EXISTS "messages_select" ON group_messages;
CREATE POLICY "messages_select" ON group_messages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "messages_insert" ON group_messages;
CREATE POLICY "messages_insert" ON group_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "messages_update_own" ON group_messages;
CREATE POLICY "messages_update_own" ON group_messages FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "messages_delete_own" ON group_messages;
CREATE POLICY "messages_delete_own" ON group_messages FOR DELETE USING (auth.uid() = user_id);
-- admins can soft-delete any message in their group
DROP POLICY IF EXISTS "messages_admin_update" ON group_messages;
CREATE POLICY "messages_admin_update" ON group_messages
  FOR UPDATE USING (public.is_group_admin(group_messages.group_id))
  WITH CHECK (public.is_group_admin(group_messages.group_id));

DROP POLICY IF EXISTS "reads_select_own" ON group_message_reads;
CREATE POLICY "reads_select_own" ON group_message_reads FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reads_insert_own" ON group_message_reads;
CREATE POLICY "reads_insert_own" ON group_message_reads FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_tokens_select_own" ON push_tokens;
CREATE POLICY "push_tokens_select_own" ON push_tokens FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_insert_own" ON push_tokens;
CREATE POLICY "push_tokens_insert_own" ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_update_own" ON push_tokens;
CREATE POLICY "push_tokens_update_own" ON push_tokens FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_tokens_delete_own" ON push_tokens;
CREATE POLICY "push_tokens_delete_own" ON push_tokens FOR DELETE USING (auth.uid() = user_id);

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

DROP POLICY IF EXISTS "ai_conv_delete_own" ON ai_conversations;
CREATE POLICY "ai_conv_delete_own" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);
-- ============================================================
-- RPC functions (counters)
-- ============================================================
DROP FUNCTION IF EXISTS increment_likes(uuid);
CREATE OR REPLACE FUNCTION increment_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
$$;

DROP FUNCTION IF EXISTS decrement_likes(uuid);
CREATE OR REPLACE FUNCTION decrement_likes(p_post_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_post_id;
$$;

DROP FUNCTION IF EXISTS increment_group_members(uuid);
CREATE OR REPLACE FUNCTION increment_group_members(p_group_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = member_count + 1 WHERE id = p_group_id;
$$;

DROP FUNCTION IF EXISTS decrement_group_members(uuid);
CREATE OR REPLACE FUNCTION decrement_group_members(p_group_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = p_group_id;
$$;

DROP FUNCTION IF EXISTS mark_group_messages_read(uuid);
CREATE OR REPLACE FUNCTION mark_group_messages_read(p_group_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_user_id UUID := auth.uid();
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  UPDATE group_members SET last_read_at = now()
  WHERE group_id = p_group_id AND user_id = p_user_id;

  WITH inserted AS (
    INSERT INTO group_message_reads (message_id, user_id)
    SELECT m.id, p_user_id FROM group_messages m
    WHERE m.group_id = p_group_id AND m.user_id <> p_user_id
    ON CONFLICT (message_id, user_id) DO NOTHING
    RETURNING message_id
  )
  UPDATE group_messages m SET read_count = read_count + 1
  FROM inserted i WHERE m.id = i.message_id;
END;
$$;

-- ============================================================
-- Realtime: publish community tables so feed + group chat update live
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE posts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE groups;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_message_reads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE posts REPLICA IDENTITY FULL;
ALTER TABLE post_likes REPLICA IDENTITY FULL;
ALTER TABLE groups REPLICA IDENTITY FULL;
ALTER TABLE group_members REPLICA IDENTITY FULL;
ALTER TABLE group_messages REPLICA IDENTITY FULL;
ALTER TABLE group_message_reads REPLICA IDENTITY FULL;

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

-- ============================================================
-- Storage: group-avatars bucket + policies (group admins manage)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('group-avatars', 'group-avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "group_avatars_read" ON storage.objects;
CREATE POLICY "group_avatars_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'group-avatars');

DROP POLICY IF EXISTS "group_avatars_insert_admin" ON storage.objects;
CREATE POLICY "group_avatars_insert_admin" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'group-avatars' AND
    public.is_group_admin((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "group_avatars_update_admin" ON storage.objects;
CREATE POLICY "group_avatars_update_admin" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'group-avatars' AND
    public.is_group_admin((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "group_avatars_delete_admin" ON storage.objects;
CREATE POLICY "group_avatars_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'group-avatars' AND
    public.is_group_admin((storage.foldername(name))[1]::uuid)
  );

-- ============================================================
-- Waitlist (public signup list — owner gets email alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert_public" ON waitlist;
CREATE POLICY "waitlist_insert_public" ON waitlist
  FOR INSERT
  WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- No SELECT/UPDATE/DELETE policies: the list is private,
-- viewable only via the Supabase dashboard or service role.

-- Public helpers for the landing page (count + recent joiners)
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS bigint LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::bigint FROM public.waitlist;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_recent(limit_n integer DEFAULT 5)
RETURNS TABLE(first_name text, initials text, color_index integer)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    split_part(COALESCE(full_name, ''), ' ', 1) AS first_name,
    upper(left(COALESCE(full_name, ''), 2)) AS initials,
    (abs(hashtext(COALESCE(full_name, ''))::bigint) % 6)::integer AS color_index
  FROM public.waitlist
  WHERE full_name IS NOT NULL AND full_name <> ''
  ORDER BY created_at DESC
  LIMIT limit_n;
$$;

GRANT EXECUTE ON FUNCTION public.get_waitlist_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_recent(integer) TO anon;
