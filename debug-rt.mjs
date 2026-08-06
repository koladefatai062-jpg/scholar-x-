import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
const SU = env.NEXT_PUBLIC_SUPABASE_URL
const SRV = env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(SU, SRV)
const uid = crypto.randomUUID()

async function probe(table, column) {
  return await new Promise((resolve) => {
    let got = false
    const ch = admin.channel('adm-rt-' + table + '-' + Date.now())
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => { got = true; resolve(true) })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await admin.from(table).insert({ [column]: uid, content: 'probe', created_at: new Date().toISOString() })
          setTimeout(() => resolve(got), 5000)
        } else {
          setTimeout(() => resolve(null), 5000)
        }
      })
  })
}

console.log('group_messages published? ->', await probe('group_messages', 'user_id'))
console.log('posts published? ->', await probe('posts', 'user_id'))

await admin.from('group_messages').delete().eq('content', 'probe')
await admin.from('posts').delete().eq('content', 'probe')
console.log('cleanup done')
process.exit(0)
