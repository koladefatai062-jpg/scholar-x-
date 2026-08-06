import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const SU = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SRV = env.SUPABASE_SERVICE_ROLE_KEY
const SITE = 'https://scholar-x-project-slgz.vercel.app'
const PREFIX = 'schx_probe_'

const admin = createClient(SU, SRV)
const email = PREFIX + Date.now() + '@example.com'
const password = 'ProbePass123!'

async function j(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// 1. create user via admin
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Probe Tester' } })
if (created.error) { console.log('CREATE USER ERROR', created.error); process.exit(1) }
const uid = created.data.user.id
console.log('user created:', uid)

// 2. sign in as the user
const anon = createClient(SU, ANON)
const signIn = await anon.auth.signInWithPassword({ email, password })
if (signIn.error) { console.log('SIGNIN ERROR', signIn.error); process.exit(1) }
const session = signIn.data.session
const cookie = `sb-${SU.split('.')[0].replace('https://', '')}-auth-token=${encodeURIComponent(JSON.stringify(session))}`
console.log('cookie ready, len', cookie.length)

// 3. hit the groups list API
let res = await fetch(`${SITE}/api/community/groups`, { headers: { Cookie: cookie } })
let body = await j(res)
console.log('GET /api/community/groups ->', res.status, res.ok ? 'OK' : JSON.stringify(body).slice(0, 400))
const groups = (res.ok && body.groups) || []

// 4. if no groups, create a probe group + membership via admin
let gid
if (groups.length) {
  gid = groups[0].id
  console.log('using existing group', gid)
} else {
  const g = await admin.from('groups').insert({ name: 'Probe Group', subject: 'physics', description: 'probe', created_by: uid, status: 'active', member_count: 1 }).select().single()
  if (g.error) { console.log('GROUP CREATE ERROR', g.error); process.exit(1) }
  gid = g.data.id
  const m = await admin.from('group_members').insert({ user_id: uid, group_id: gid, role: 'admin' }).select().single()
  if (m.error) { console.log('MEMBERSHIP ERROR', m.error); process.exit(1) }
  console.log('probe group created', gid)
}

// 5. group detail + messages API
res = await fetch(`${SITE}/api/community/groups/${gid}`, { headers: { Cookie: cookie } })
body = await j(res)
console.log('GET group detail ->', res.status, res.ok ? `members=${(body.members||[]).length} my_role=${body.my_role}` : JSON.stringify(body).slice(0, 400))

res = await fetch(`${SITE}/api/community/groups/${gid}/messages`, { headers: { Cookie: cookie } })
body = await j(res)
console.log('GET group messages ->', res.status, res.ok ? `count=${(body.messages||[]).length} has_more=${body.has_more}` : JSON.stringify(body).slice(0, 400))

// 6. POST a message
res = await fetch(`${SITE}/api/community/groups/${gid}/messages`, {
  method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'probe hello from test ' + Date.now() }),
})
body = await j(res)
console.log('POST message ->', res.status, res.ok ? 'OK' : JSON.stringify(body).slice(0, 400))
const mid = res.ok ? body.message?.id : null

// 7. mark read RPC via anon client as user
const rpc = await anon.rpc('mark_group_messages_read', { p_group_id: gid })
console.log('RPC mark read (as user) ->', rpc.error ? 'ERROR ' + rpc.error.message : 'OK')

// 8. realtime probe for group_messages
await new Promise((resolve) => {
  let got = false
  const channel = anon.channel('probe-rt-' + Date.now())
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${gid}` }, (payload) => {
    got = true
    console.log('REALTIME INSERT event received for group_messages:', payload.new?.content?.slice(0, 40))
    resolve()
  }).subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('realtime subscribed; inserting probe message...')
      const ins = await admin.from('group_messages').insert({ group_id: gid, user_id: uid, content: 'realtime probe ' + Date.now() }).select().single()
      if (ins.error) console.log('probe insert error', ins.error.message)
      setTimeout(() => { if (!got) { console.log('REALTIME: NO EVENT RECEIVED for group_messages (NOT PUBLISHED)'); resolve() } }, 6000)
    }
  })
})

// 9. cleanup: delete probe group (cascades members/messages/reads)
if (!groups.length) { await admin.from('groups').delete().eq('id', gid) }
await admin.auth.admin.deleteUser(uid)
console.log('cleanup done')
process.exit(0)
