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

const admin = createClient(SU, SRV)
const email = 'rtprobe_' + Date.now() + '@example.com'
const password = 'ProbePass123!'

const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'RT Probe' } })
const uid = created.user.id
const anon = createClient(SU, ANON)
const { data: si } = await anon.auth.signInWithPassword({ email, password })
await anon.auth.setSession({ access_token: si.session.access_token, refresh_token: si.session.refresh_token })

// create a probe group + membership so RLS lets the user see group_messages
const g = await admin.from('groups').insert({ name: 'RT Probe Group', subject: 'physics', status: 'active', created_by: uid, member_count: 1 }).select().single()
await admin.from('group_members').insert({ user_id: uid, group_id: g.data.id, role: 'admin' })

function waitProbe(table, label, insertFn) {
  return new Promise((resolve) => {
    let got = false
    const ch = anon.channel('usr-rt-' + table + '-' + Date.now())
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: table === 'group_messages' ? `group_id=eq.${g.data.id}` : undefined }, (payload) => {
      got = true
      console.log(label, 'EVENT RECEIVED')
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await insertFn()
        setTimeout(() => { console.log(label, got ? 'OK' : 'NO EVENT'); resolve() }, 5000)
      } else {
        console.log(label, 'subscribe status:', status)
        setTimeout(() => { console.log(label, got ? 'OK' : 'NO EVENT'); resolve() }, 5000)
      }
    })
  })
}

await waitProbe('posts', 'posts', () => admin.from('posts').insert({ user_id: uid, content: 'probe ' + Date.now() }))
await waitProbe('group_messages', 'group_messages', () => admin.from('group_messages').insert({ group_id: g.data.id, user_id: uid, content: 'probe ' + Date.now() }))

await admin.from('posts').delete().eq('content', 'probe')
await admin.from('group_messages').delete().eq('content', 'probe')
await admin.from('groups').delete().eq('id', g.data.id)
await admin.auth.admin.deleteUser(uid)
console.log('cleanup done')
process.exit(0)
