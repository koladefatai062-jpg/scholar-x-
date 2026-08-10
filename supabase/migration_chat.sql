-- ============================================================
-- ScholarX — WhatsApp-style group chat migration (live DB)
-- Safe to run as-is in the Supabase SQL editor (idempotent).
-- Applies only what the live database is missing:
--   columns, tables, RLS policies, read RPC, realtime.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columns that already exist are left untouched
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

-- ------------------------------------------------------------
-- 2. New tables
-- ------------------------------------------------------------
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
-- 3. RLS on new tables
-- ------------------------------------------------------------
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

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

-- ------------------------------------------------------------
-- 3b. group-avatars storage bucket (group admins manage images)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. Broader roster / admin policies on existing tables
-- (membership checks go through SECURITY DEFINER helpers to
--  avoid infinite recursion in RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid() AND gm.role = 'admin');
$$;

DROP POLICY IF EXISTS "members_select_own" ON group_members;
DROP POLICY IF EXISTS "members_select_group" ON group_members;
CREATE POLICY "members_select_group" ON group_members
  FOR SELECT USING (public.is_group_member(group_members.group_id));

-- admins can remove members and change roles
DROP POLICY IF EXISTS "members_admin_delete" ON group_members;
CREATE POLICY "members_admin_delete" ON group_members
  FOR DELETE USING (public.is_group_admin(group_members.group_id));

DROP POLICY IF EXISTS "members_admin_update" ON group_members;
CREATE POLICY "members_admin_update" ON group_members
  FOR UPDATE USING (public.is_group_admin(group_members.group_id))
  WITH CHECK (public.is_group_admin(group_members.group_id));

-- admins can update their groups' name / subject / description
DROP POLICY IF EXISTS "groups_admin_update" ON groups;
CREATE POLICY "groups_admin_update" ON groups
  FOR UPDATE USING (public.is_group_admin(groups.id))
  WITH CHECK (public.is_group_admin(groups.id));

-- admins can soft-delete any message in their group
DROP POLICY IF EXISTS "messages_admin_update" ON group_messages;
CREATE POLICY "messages_admin_update" ON group_messages
  FOR UPDATE USING (public.is_group_admin(group_messages.group_id))
  WITH CHECK (public.is_group_admin(group_messages.group_id));

-- ------------------------------------------------------------
-- 5. Read-tracking RPC (SECURITY DEFINER so it bypasses RLS)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 6. Realtime (group_messages is the critical one for live chat)
-- ------------------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE groups; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE group_message_reads; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE posts REPLICA IDENTITY FULL;
ALTER TABLE post_likes REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;
ALTER TABLE groups REPLICA IDENTITY FULL;
ALTER TABLE group_members REPLICA IDENTITY FULL;
ALTER TABLE group_messages REPLICA IDENTITY FULL;
ALTER TABLE group_message_reads REPLICA IDENTITY FULL;

-- ------------------------------------------------------------
-- 7. Gamification: XP, badges, streak (idempotent)
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

DROP FUNCTION IF EXISTS award_quiz_xp(integer, boolean);
CREATE OR REPLACE FUNCTION public.award_quiz_xp(p_xp integer, p_perfect boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  p_user_id uuid := auth.uid();
  today date := CURRENT_DATE;
  prev_last timestamptz;
  new_streak integer;
  new_xp integer;
  new_level integer;
  new_badges text[];
  awarded text[] := '{}';
BEGIN
  IF p_user_id IS NULL THEN RETURN NULL; END IF;

  SELECT last_active_at INTO prev_last FROM users WHERE id = p_user_id;
  IF prev_last IS NULL OR prev_last::date < today - 1 THEN
    new_streak := 1;
  ELSIF prev_last::date = today - 1 THEN
    SELECT streak + 1 INTO new_streak FROM users WHERE id = p_user_id;
  ELSE
    SELECT streak INTO new_streak FROM users WHERE id = p_user_id;
  END IF;

  SELECT COALESCE(xp, 0) + p_xp INTO new_xp FROM users WHERE id = p_user_id;
  new_level := floor(sqrt(new_xp / 50.0)) + 1;

  SELECT COALESCE(badges, '{}'::text[]) INTO new_badges FROM users WHERE id = p_user_id;

  IF NOT (new_badges @> ARRAY['first_quiz']) THEN
    new_badges := array_append(new_badges, 'first_quiz'); awarded := array_append(awarded, 'first_quiz');
  END IF;
  IF p_perfect AND NOT (new_badges @> ARRAY['perfect_score']) THEN
    new_badges := array_append(new_badges, 'perfect_score'); awarded := array_append(awarded, 'perfect_score');
  END IF;
  IF new_streak >= 7 AND NOT (new_badges @> ARRAY['week_warrior']) THEN
    new_badges := array_append(new_badges, 'week_warrior'); awarded := array_append(awarded, 'week_warrior');
  END IF;
  IF new_xp >= 500 AND NOT (new_badges @> ARRAY['rising_star']) THEN
    new_badges := array_append(new_badges, 'rising_star'); awarded := array_append(awarded, 'rising_star');
  END IF;
  IF new_level >= 5 AND NOT (new_badges @> ARRAY['level_five']) THEN
    new_badges := array_append(new_badges, 'level_five'); awarded := array_append(awarded, 'level_five');
  END IF;

  UPDATE users SET xp = new_xp, streak = new_streak, badges = new_badges, last_active_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'xp_gained', p_xp,
    'xp', new_xp,
    'level', new_level,
    'streak', new_streak,
    'badges', new_badges,
    'new_badges', awarded
  );
END;
$$;
