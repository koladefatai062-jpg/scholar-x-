-- Grades table for CGPA tracker
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

-- AI usage tracking (daily message count)
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Grades policies
CREATE POLICY "Users can view own grades" ON grades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grades" ON grades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own grades" ON grades FOR DELETE USING (auth.uid() = user_id);

-- AI usage policies
CREATE POLICY "Users can view own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);

-- AI conversations policies
CREATE POLICY "Users can view own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
