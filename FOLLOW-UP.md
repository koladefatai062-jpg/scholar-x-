# Follow-up tasks (low-effort, no heavy builds)

Pick these off one at a time. None require running `npm run build` locally.
Copy-paste the SQL blocks into your Supabase dashboard and set env vars in
Vercel — that's the whole job.

---

## 1. Create the waitlist table (2 min — copy/paste only)

Supabase dashboard → **SQL editor** → paste → Run:

```sql
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
  FOR INSERT WITH CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
```

Then test: open `/features` and submit the form. If you get the green box, it works.

## 2. Unblock group chat (the corrective SQL)

This fixes "infinite recursion", the missing `created_at` column, and makes
realtime fire for messages. Run in the **same SQL editor**:

```sql
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.is_group_member(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(gid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "members_select_group" ON group_members;
DROP POLICY IF EXISTS "members_insert_group" ON group_members;
DROP POLICY IF EXISTS "members_update_group" ON group_members;
DROP POLICY IF EXISTS "members_delete_group" ON group_members;
DROP POLICY IF EXISTS "messages_select_group" ON group_messages;
DROP POLICY IF EXISTS "messages_insert_group" ON group_messages;
DROP POLICY IF EXISTS "messages_update_group" ON group_messages;
DROP POLICY IF EXISTS "messages_delete_group" ON group_messages;

CREATE POLICY "members_select_group" ON group_members
  FOR SELECT USING (is_group_admin(group_id) OR auth.uid() = user_id);
CREATE POLICY "members_insert_group" ON group_members
  FOR INSERT WITH CHECK (is_group_admin(group_id));
CREATE POLICY "members_update_group" ON group_members
  FOR UPDATE USING (is_group_admin(group_id));
CREATE POLICY "members_delete_group" ON group_members
  FOR DELETE USING (is_group_admin(group_id));

CREATE POLICY "messages_select_group" ON group_messages
  FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "messages_insert_group" ON group_messages
  FOR INSERT WITH CHECK (is_group_member(group_id));
CREATE POLICY "messages_update_group" ON group_messages
  FOR UPDATE USING (is_group_member(group_id) OR is_group_admin(group_id));
CREATE POLICY "messages_delete_group" ON group_messages
  FOR DELETE USING (is_group_member(group_id) OR is_group_admin(group_id));

ALTER TABLE group_messages REPLICA IDENTITY FULL;
ALTER TABLE group_members REPLICA IDENTITY FULL;
ALTER TABLE group_message_reads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_message_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reads;
  END IF;
END $$;
```

Then test: open `/community/groups`, open a group, send a message. If it appears
live without refresh, it's fixed.

## 3. Set Vercel env vars (10 min)

Vercel → your project → **Settings → Environment Variables** → add all from
`.env.example`. The important new ones:

| Variable | What it is | Where to get it |
| --- | --- | --- |
| `RESEND_API_KEY` | Email alerts for waitlist | resend.com → API Keys |
| `WAITLIST_EMAIL` | Your email (gets new-signup alerts) | your email |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web push key | Firebase console → Project settings → Cloud Messaging → Web push certificates → Generate keypair |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_MESSAGING_SENDER_ID`, `_APP_ID` | Firebase web app config | Firebase console → Project settings → General → "Add web app" |
| `NEXT_PUBLIC_APP_URL` | Set to `https://scholar-x-project-slgz.vercel.app` (not localhost) | yours |

Then redeploy (a push triggers it automatically).

## 4. Replace placeholder links (5 min, code edit)

Open `app/(landing)/features/page.tsx` and `app/(landing)/page.tsx` — the
footers use placeholder socials (`instagram.com/scholarx`, `x.com/scholarx`,
`hello@scholarx.com`). Replace with the real accounts / email.

## 5. Confirm the price (1 min)

`app/(landing)/features/page.tsx` shows Premium at **₦5,000/year**. Keep or change it.

## 6. Phone test checklist (15 min)

On your phone, signed in and signed out:
- [ ] `/features` page loads, waitlist form shows green box
- [ ] Sign up → quiz loads questions
- [ ] Join a group → message sends and appears live
- [ ] Tap a sender → profile modal opens
- [ ] Send an image → lightbox opens, Save works
- [ ] Send a PDF → preview opens, Save/Open work
- [ ] Allow notifications → a test notification arrives (after VAPID is set)
- [ ] `/login` redirects back to the page you were on
