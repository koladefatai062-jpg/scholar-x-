export type UserRole = 'secondary' | 'university' | 'admin'

export type ExamType = 'JAMB' | 'WAEC' | 'NECO' | 'BECE' | 'POST-UTME'

export type SecondaryLevel = 'JSS1' | 'JSS2' | 'JSS3' | 'SS1' | 'SS2' | 'SS3'

export type UniversityLevel = '100L' | '200L' | '300L' | '400L' | '500L' | '600L'

export type Level = SecondaryLevel | UniversityLevel

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  level: Level
  is_premium: boolean
  premium_expires_at: string | null
  streak: number
  xp: number
  badges: string[]
  last_active: string
  created_at: string
}

export interface Question {
  id: string
  exam: ExamType
  subject: string
  year: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: 'a' | 'b' | 'c' | 'd'
  explanation: string | null
  is_premium: boolean
  created_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  exam: ExamType
  subject: string
  score: number
  total: number
  time_spent: number
  created_at: string
}

export interface QuizAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option: 'a' | 'b' | 'c' | 'd' | null
  is_correct: boolean
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface AIConversation {
  id: string
  user_id: string
  messages: AIMessage[]
  created_at: string
  updated_at: string
}

export interface LibraryItem {
  id: string
  title: string
  author: string | null
  subject: string
  level: string
  description: string | null
  file_url: string | null
  cover_url: string | null
  source: string
  is_premium: boolean
  created_at: string
}

export interface Course {
  id: string
  user_id: string
  code: string
  name: string
  units: number
  score: number
  grade: string
  semester: 'first' | 'second'
  session: string
  created_at: string
}

export interface TermResult {
  id: string
  user_id: string
  subject: string
  ca_score: number
  exam_score: number
  total: number
  term: 'first' | 'second' | 'third'
  session: string
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  subject: string | null
  likes_count: number
  is_flagged: boolean
  created_at: string
  users?: { full_name: string }
}

export interface Group {
  id: string
  name: string
  subject: string | null
  description: string | null
  created_by: string
  status: 'pending' | 'active' | 'rejected'
  rejection_reason: string | null
  member_count: number
  created_at: string
}

export interface GroupMessage {
  id: string
  group_id: string
  user_id: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  created_at: string
  users?: { full_name: string }
}

export interface News {
  id: string
  title: string
  summary: string | null
  source_url: string | null
  source_name: string | null
  category: 'JAMB' | 'WAEC' | 'NECO' | 'BECE' | 'general'
  published_at: string | null
  created_at: string
}

export interface Opportunity {
  id: string
  title: string
  org: string
  type: 'scholarship' | 'competition' | 'internship'
  level: 'secondary' | 'university' | 'both'
  description: string | null
  amount: string | null
  deadline: string | null
  apply_url: string | null
  is_active: boolean
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  reference: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  created_at: string
  expires_at: string | null
}