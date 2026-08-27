'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, Target, Brain, BookOpen, Users, MessageCircle,
  TrendingUp, Briefcase, Check, Shield, CheckCheck, FileText, Image,
  Bell, Clock, Crown, Zap, GraduationCap, ClipboardList
} from 'lucide-react'
import Logo from '@/components/Logo'

const C = {
  bg: '#0A0628', surface: '#110836', card: '#150D40', border: '#1E1450',
  accent: '#7C3AED', cyan: '#06B6D4', text: '#E2D9F3', muted: '#7B6FA0',
  white: '#FFFFFF', gold: '#F59E0B', green: '#22C55E',
}

const categories = [
  {
    icon: <Target size={20} color={C.accent} />,
    title: 'Exam Practice',
    tag: 'Free + Premium',
    items: [
      '12,000+ past questions across 8 exam bodies',
      'JAMB, WAEC, NECO, BECE & POST-UTME coverage',
      'Timed CBT simulation just like the real exam',
      'Questions reshuffled on every attempt',
      'Detailed explanations for every answer',
      'Score + performance tracking per subject',
      'See your weak spots and focus on them',
    ],
  },
  {
    icon: <Brain size={20} color={C.cyan} />,
    title: 'AI Tutor',
    tag: 'Free + Premium',
    items: [
      'Ask anything in plain English, 24/7',
      'Real explanations — not just answers',
      'Powered by Google Gemini',
      'Conversation history saved per subject',
      'Free: 10 messages per day',
      'Premium: unlimited messages',
    ],
  },
  {
    icon: <BookOpen size={20} color={C.gold} />,
    title: 'Library',
    tag: 'Free + Premium',
    items: [
      'Textbooks, notes and study materials by subject',
      'Organised by level — SS1 to university',
      'Save items to your personal library',
      'Premium-only PDFs and full materials',
    ],
  },
  {
    icon: <MessageCircle size={20} color={C.green} />,
    title: 'Group Chat — WhatsApp style',
    tag: 'Free + Premium',
    items: [
      'Live messages — no refresh needed',
      'Typing indicator + online presence',
      'Read receipts (✓ / ✓✓)',
      'Unread message counts per group',
      'Reply, edit, delete, copy & forward messages',
      'Share PDFs and images with in-chat preview',
      'Clickable member profiles',
      'Group admins: edit info, promote, remove members',
      'Push notifications for new messages',
    ],
  },
  {
    icon: <Users size={20} color={C.accent} />,
    title: 'Community',
    tag: 'Free + Premium',
    items: [
      'Study groups by subject and level',
      'Community feed with likes',
      'Join up to 3 groups free, unlimited on Premium',
      'Create your own groups (Premium, with approval)',
      'Share notes and questions across Nigeria',
    ],
  },
  {
    icon: <TrendingUp size={20} color={C.accent} />,
    title: 'Grade Tracker',
    tag: 'Free + Premium',
    items: [
      'University CGPA calculator',
      'Secondary school term results',
      'Track courses and credit units',
      'Advanced tracking on Premium',
    ],
  },
  {
    icon: <Briefcase size={20} color={C.cyan} />,
    title: 'Opportunities',
    tag: 'Free + Premium',
    items: [
      'Scholarships, competitions & internships',
      'Filtered to your level',
      'Updated regularly',
    ],
  },
]

const freeFeatures = [
  'Unlimited quiz (reshuffled questions)',
  'AI Tutor — 10 messages/day',
  'Free library content + saved items',
  'Join up to 3 study groups',
  'Community feed + likes',
  'Full WhatsApp-style group chat',
  '1 file upload per day (5MB)',
  'Grade tracker basics',
  'Opportunities & news',
]

const premiumFeatures = [
  'Everything in Free',
  'Unlimited AI Tutor',
  'Unlimited quiz explanations',
  'All library content + premium PDFs',
  'Join unlimited groups',
  'Create your own groups',
  'Unlimited file sharing (up to 20MB)',
  'Advanced grade tracker',
  'Priority support',
]

export default function FeaturesPage() {
  const router = useRouter()

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif", color: C.text }}>
      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,6,40,0.94)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Logo size={30} text="ScholarX" />
          </button>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text, padding: '7px 14px', borderRadius: 8, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> Home
            </button>
            <button onClick={() => router.push('/signup')} style={{ background: C.accent, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '140px 24px 70px', textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${C.accent}1E`, border: `1px solid ${C.accent}3A`, borderRadius: 100, padding: '5px 14px', marginBottom: 22 }}>
          <Zap size={12} color={C.accent} />
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Everything ScholarX includes</span>
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5.5vw,58px)', fontWeight: 900, color: C.white, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 16 }}>
          All the tools you need<br />to <span style={{ background: `linear-gradient(90deg,${C.accent},${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actually pass</span>
        </h1>
        <p style={{ fontSize: 16, color: C.muted, maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
          Past questions, AI explanations, live study groups, grade tracking and more — everything for Nigerian secondary and university students in one app.
        </p>
      </section>

      {/* CATEGORY GRID */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 18 }}>
          {categories.map(cat => (
            <div key={cat.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cat.icon}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, letterSpacing: 0.5, textTransform: 'uppercase', background: `${C.accent}18`, padding: '4px 10px', borderRadius: 100 }}>{cat.tag}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.white, marginBottom: 12 }}>{cat.title}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {cat.items.map(item => (
                  <li key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                    <Check size={14} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FREE VS PREMIUM */}
      <section style={{ padding: '70px 24px', background: C.surface }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>Plans</span>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, color: C.white, marginTop: 6, letterSpacing: '-1px' }}>Free vs Premium</h2>
            <p style={{ color: C.muted, marginTop: 8, fontSize: 15 }}>Everything in Free stays free forever. Premium unlocks the power features.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GraduationCap size={18} color={C.muted} />
                <span style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Free</span>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.white, marginBottom: 20 }}>₦0 <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>forever</span></div>
              {freeFeatures.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <Check size={14} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.muted }}>{f}</span>
                </div>
              ))}
              <button onClick={() => router.push('/signup')} style={{ marginTop: 22, width: '100%', padding: '11px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Get started free</button>
            </div>

            <div style={{ background: `linear-gradient(160deg,${C.accent}15,${C.card})`, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: 30, position: 'relative' }}>
              <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(90deg,${C.accent},${C.cyan})`, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 100, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Most popular</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Crown size={18} color={C.gold} />
                <span style={{ fontSize: 13, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: 1 }}>Premium</span>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: C.white, marginBottom: 20 }}>₦5,000 <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>/year</span></div>
              {premiumFeatures.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <Check size={14} color={C.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.text }}>{f}</span>
                </div>
              ))}
              <button onClick={() => router.push('/signup')} style={{ marginTop: 22, width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Upgrade — ₦5,000/yr</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Shield size={13} /> Secure payments via Paystack</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} /> Instant activation</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Bell size={13} /> Push notifications</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCheck size={13} /> Read receipts</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={13} /> PDF previews</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Image size={13} /> Image sharing</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ClipboardList size={13} /> Grade tracking</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, color: C.white, letterSpacing: '-1px', marginBottom: 12 }}>
          Ready to study smarter?
        </h2>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 28 }}>
          Join thousands of Nigerian students already using ScholarX. Free forever, upgrade when you're ready.
        </p>
        <button onClick={() => router.push('/signup')} style={{ background: C.accent, border: 'none', color: '#fff', padding: '14px 32px', borderRadius: 10, fontSize: 16, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          Start for free <ArrowRight size={17} />
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
          <Logo size={28} text="ScholarX" />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            ['Home', '/'],
            ['Features', '/features'],
            ['Instagram', 'https://instagram.com/scholarx'],
            ['X', 'https://x.com/scholarx'],
            ['Email', 'mailto:hello@scholarx.com'],
          ].map(([label, url]) => (
            label.startsWith('Home') || label.startsWith('Features')
              ? <button key={label} onClick={() => router.push(url)} style={{ color: C.muted, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{label}</button>
              : <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>{label}</a>
          ))}
        </div>
        <p style={{ color: C.muted, fontSize: 13 }}>© 2026 ScholarX. Built for Nigerian students.</p>
      </footer>
    </div>
  )
}
