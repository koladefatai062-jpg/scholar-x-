'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, ChevronRight, Zap, Target,
  Brain, BookOpen, Users, TrendingUp, Briefcase, Check
} from 'lucide-react'
import Logo from '@/components/Logo'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', gold: '#F59E0B', green: '#22C55E',
}

const exams = ['JAMB', 'WAEC', 'NECO', 'BECE', 'POST-UTME']
const examData: Record<string, { desc: string; subs: string[] }> = {
  JAMB: { desc: 'Full CBT simulation with UTME past questions from 2010–2024. Timer, scoring, and detailed review.', subs: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'CRS/IRS'] },
  WAEC: { desc: 'May/June and GCE papers across all SS subjects. Theory + OBJ with model answers.', subs: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Literature', 'Geography'] },
  NECO: { desc: 'June/July SSCE past questions. Full paper coverage with detailed solutions.', subs: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Civic Education', 'Commerce'] },
  BECE: { desc: 'Junior WAEC prep for JSS3 students. Foundation concepts and past questions.', subs: ['Basic Science', 'Mathematics', 'English', 'Social Studies', 'Basic Technology', 'Agricultural Science', 'CCA', 'CRS'] },
  'POST-UTME': { desc: 'Uni-specific screening prep — OAU, UI, UNILAG, LASU, ABU and more.', subs: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics'] },
}

const features = [
  { icon: <Target size={20} color={C.accent} />, title: 'CBT Quiz Mode', body: 'Timed, randomised past questions like the real exam. Track your score per topic, see your weak spots.' },
  { icon: <Brain size={20} color={C.cyan} />, title: 'AI Tutor', body: 'Ask anything in plain English. Get a real explanation, not just the answer. Powered by Google Gemini.' },
  { icon: <BookOpen size={20} color={C.gold} />, title: 'Library', body: 'Textbooks and study materials by subject and level. No more searching around.' },
  { icon: <Users size={20} color={C.green} />, title: 'Study Groups', body: 'Join communities by subject. Share notes, ask questions, study together across Nigeria.' },
  { icon: <TrendingUp size={20} color={C.accent} />, title: 'Grade Tracker', body: 'University CGPA or secondary term results. Know exactly where you stand.' },
  { icon: <Briefcase size={20} color={C.cyan} />, title: 'Opportunities', body: 'Scholarships, competitions, internships — filtered to your level. Updated weekly.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [activeExam, setActiveExam] = useState('JAMB')

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif", color: C.text }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,6,40,0.94)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={32} text="ScholarX" />
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <button onClick={() => router.push('/login')} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text, padding: '7px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Log in</button>
            <button onClick={() => router.push('/signup')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>Get started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle,${C.accent}1E,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '6%', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle,${C.cyan}16,transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${C.accent}1E`, border: `1px solid ${C.accent}3A`, borderRadius: 100, padding: '5px 14px', marginBottom: 24 }}>
          <Zap size={12} color={C.accent} />
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Nigeria's smartest study platform</span>
        </div>

        <h1 style={{ fontSize: 'clamp(34px,6vw,70px)', fontWeight: 900, color: C.white, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 18, maxWidth: 820 }}>
          Stop reading.<br />
          <span style={{ background: `linear-gradient(90deg,${C.accent},${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Start understanding.</span>
        </h1>

        <p style={{ fontSize: 17, color: C.muted, maxWidth: 520, lineHeight: 1.7, marginBottom: 36 }}>
          Past questions, AI explanations, live study groups — everything secondary and university students in Nigeria need to actually pass.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => router.push('/signup')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '14px 28px', borderRadius: 10, fontSize: 16, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            Start for free <ArrowRight size={17} />
          </button>
          <button onClick={() => router.push('/signup')} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '14px 28px', borderRadius: 10, fontSize: 16, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Try a JAMB quiz <ChevronRight size={15} />
          </button>
        </div>

        <div style={{ marginTop: 56, display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['12,000+', 'Past questions'], ['8', 'Exam bodies'], ['AI tutor', '24/7 available'], ['₦5k/yr', 'Premium']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>{v}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMS */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: 'uppercase' }}>Exam prep</span>
          <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, color: C.white, marginTop: 6, letterSpacing: '-1px' }}>Every exam. One platform.</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {exams.map(e => (
            <button key={e} onClick={() => setActiveExam(e)} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${activeExam === e ? C.accent : C.border}`, background: activeExam === e ? `${C.accent}1E` : 'transparent', color: activeExam === e ? C.accent : C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{e}</button>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 6 }}>{activeExam}</h3>
              <p style={{ color: C.muted, fontSize: 14, maxWidth: 480 }}>{examData[activeExam].desc}</p>
            </div>
            <button onClick={() => router.push('/signup')} style={{ background: `linear-gradient(135deg,${C.accent},#5B21B6)`, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 9, fontSize: 14, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              Start practice <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {examData[activeExam].subs.map(s => (
              <span key={s} style={{ padding: '5px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 24px', background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 44 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>What's inside</span>
            <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, color: C.white, marginTop: 6, letterSpacing: '-1px' }}>Built for how students actually study</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 }}>
            {features.map(({ icon, title, body }) => (
              <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 26, cursor: 'default', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent + '55')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                <div style={{ marginBottom: 12 }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 7 }}>{title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: 'uppercase' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, color: C.white, marginTop: 6, letterSpacing: '-1px' }}>Serious about passing? ₦5k is nothing.</h2>
          <p style={{ color: C.muted, marginTop: 8, fontSize: 15 }}>Less than a JAMB form. More than a lesson teacher.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, maxWidth: 680, margin: '0 auto' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Free</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: C.white, marginBottom: 3 }}>₦0</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Forever free</div>
            {['Unlimited quiz (reshuffled)', 'AI Tutor (10 msg/day)', 'Free library content', 'Join up to 3 groups', '1 file/day in groups'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 9, marginBottom: 10, alignItems: 'flex-start' }}>
                <Check size={14} color={C.muted} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.muted }}>{f}</span>
              </div>
            ))}
            <button onClick={() => router.push('/signup')} style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Get started free</button>
          </div>
          <div style={{ background: `linear-gradient(160deg,${C.accent}15,${C.card})`, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: 32, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${C.accent},${C.cyan})`, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Most popular</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Premium</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: C.white, marginBottom: 3 }}>₦5,000</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>per year · via Paystack</div>
            {['Unlimited quiz + explanations', 'Unlimited AI Tutor', 'All library content + premium PDFs', 'Unlimited group joining', 'Create groups (with approval)', 'Unlimited file sharing (20MB)', 'Advanced grade tracker'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 9, marginBottom: 10, alignItems: 'flex-start' }}>
                <Check size={14} color={C.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.text }}>{f}</span>
              </div>
            ))}
            <button onClick={() => router.push('/signup')} style={{ marginTop: 20, width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${C.accent},#5B21B6)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Upgrade — ₦5,000/yr</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          <Logo size={28} text="ScholarX" />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            ['Instagram', 'https://instagram.com/scholarx'],
            ['X', 'https://x.com/scholarx'],
            ['WhatsApp', 'https://wa.me/2348000000000'],
            ['TikTok', 'https://tiktok.com/@scholarx'],
            ['Email', 'mailto:hello@scholarx.com'],
          ].map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              style={{ color: C.muted, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}>
              {label}
            </a>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 13 }}>© 2025 ScholarX. Built for Nigerian students.</p>
      </footer>
    </div>
  )
}