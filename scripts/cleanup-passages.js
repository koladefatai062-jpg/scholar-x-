const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://iewyfrxwdqzzuhhhwaxv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlld3lmcnh3ZHF6enVoaGh3YXh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQyMjg0MCwiZXhwIjoyMDk3OTk4ODQwfQ.bbI17vkZYg0huXfDF8eO5OLdrjIRtJvvTVxTjyWNO0A'
)

async function cleanup() {
  const { data: passages } = await supabase
    .from('library_items')
    .select('id')
    .eq('source', 'myschool')
    .like('title', 'Literary Passage%')

  console.log('Passages to delete:', passages?.length)

  if (passages && passages.length > 0) {
    const ids = passages.map(p => p.id)
    const batchSize = 100
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const { error } = await supabase.from('library_items').delete().in('id', batch)
      if (error) console.log('Error:', error.message)
      else console.log('Deleted', Math.min(i + batchSize, ids.length), '/', ids.length)
    }
  }

  const { count } = await supabase
    .from('library_items')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'myschool')
  console.log('Remaining myschool items:', count)

  const { data: novels } = await supabase
    .from('library_items')
    .select('title,subject')
    .eq('source', 'myschool')
  console.log('Remaining by subject:')
  const subjects = {}
  novels?.forEach(n => { subjects[n.subject] = (subjects[n.subject] || 0) + 1 })
  console.log(subjects)
}

cleanup()
