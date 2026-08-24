/**
 * Import script: Extract content from Myschool CBT SQLite database into ScholarX (Supabase)
 *
 * Usage: node scripts/import-myschool-data.js
 *
 * Extracts:
 *   - 87 novels (with chapter descriptions) → library_items (all free)
 *   - 2000 questions → questions (first 500 free, remaining 1500 premium)
 *   - 500 question references → library_items (all free)
 */

const path = require('path')
const fs = require('fs')
const TEMP_DIR = 'C:\\Users\\Hp\\AppData\\Local\\Temp\\opencode\\sqlite-reader\\node_modules'
const PROJECT_DIR = path.resolve(__dirname, '..')

require(path.join(TEMP_DIR, 'dotenv')).config({ path: path.join(PROJECT_DIR, '.env.local') })

const initSqlJs = require(path.join(TEMP_DIR, 'sql.js'))
const { createClient } = require(path.join(TEMP_DIR, '@supabase/supabase-js'))

// ── Config ──────────────────────────────────────────────
const DB_PATH = 'C:\\Users\\Hp\\AppData\\Roaming\\com.myschool.cbt\\my_school\\database.db'
const WASM_PATH = path.join(TEMP_DIR, 'sql.js', 'dist', 'sql-wasm.js')
const BATCH_SIZE = 100
const DELAY_MS = 500
const MAX_RETRIES = 3

// ── Subject mappings ────────────────────────────────────
const CAT_MAP = {
  1: 'Mathematics',
  2: 'English Language',
  3: 'Chemistry',
  4: 'Physics',
  5: 'Biology',
  6: 'Geography',
  7: 'Literature',
  8: 'Economics',
}
const EXAM_MAP = { jamb: 'JAMB', waec: 'WAEC', neco: 'NECO' }
const NOVEL_SUBJECT_MAP = { 2: 'English', 7: 'Literature' }

// ── Helpers ─────────────────────────────────────────────

function stripHtml(str) {
  if (!str) return ''
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractAuthor(description) {
  if (!description) return null
  const byMatch = description.match(/\bby\s+([A-Z][A-Za-z\s\.]+?)(?:\s+(?:is|was|tells|narrates|explores|centres|centers|revolves|written|first published|published))/i)
  if (byMatch) return byMatch[1].trim()
  const writtenMatch = description.match(/written\s+by\s+([A-Z][A-Za-z\s\.]+?)(?:\s+\w+)/i)
  if (writtenMatch) return writtenMatch[1].trim()
  return null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function batchInsert(supabase, table, items, label) {
  let inserted = 0
  let retries = 0

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    let success = false

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { error } = await supabase.from(table).insert(batch)
        if (error) {
          console.error('   ERROR (attempt ' + (attempt + 1) + '): ' + error.message.substring(0, 200))
        } else {
          inserted += batch.length
          success = true
          break
        }
      } catch (e) {
        console.error('   ERROR (attempt ' + (attempt + 1) + '): ' + e.message.substring(0, 200))
      }
      if (attempt < MAX_RETRIES - 1) {
        console.log('   Retrying in 2s...')
        await sleep(2000)
      }
    }

    if (!success) {
      console.log('  SKIPPED ' + batch.length + ' records after ' + MAX_RETRIES + ' attempts.')
    }

    if (inserted % (BATCH_SIZE * 5) === 0 || i + batch.length >= items.length) {
      console.log('   Inserted ' + inserted + '/' + items.length + ' ' + label + '...')
    }
    await sleep(DELAY_MS)
  }
  return inserted
}

// ── Column detection ────────────────────────────────────
const AVAILABLE_COLUMNS = new Set()

async function detectColumns(supabase) {
  console.log('3. Detecting library_items columns...')
  const cols = ['title', 'author', 'subject', 'level', 'type', 'description', 'content',
    'file_url', 'cover_url', 'source', 'is_premium', 'created_at']
  for (const col of cols) {
    const { error } = await supabase.from('library_items').select(col).limit(0)
    if (!error) {
      AVAILABLE_COLUMNS.add(col)
      console.log('   ' + col + ': available')
    } else {
      console.log('   ' + col + ': MISSING')
    }
  }
  console.log('')
  return AVAILABLE_COLUMNS.has('content')
}

function buildLibraryItem(data) {
  const item = {}
  if (AVAILABLE_COLUMNS.has('title')) item.title = data.title
  if (AVAILABLE_COLUMNS.has('author')) item.author = data.author
  if (AVAILABLE_COLUMNS.has('subject')) item.subject = data.subject
  if (AVAILABLE_COLUMNS.has('level')) item.level = data.level
  if (AVAILABLE_COLUMNS.has('type')) item.type = data.type
  if (AVAILABLE_COLUMNS.has('description')) item.description = data.description
  if (AVAILABLE_COLUMNS.has('content')) item.content = data.content
  if (AVAILABLE_COLUMNS.has('file_url')) item.file_url = data.file_url
  if (AVAILABLE_COLUMNS.has('cover_url')) item.cover_url = data.cover_url
  if (AVAILABLE_COLUMNS.has('source')) item.source = data.source
  if (AVAILABLE_COLUMNS.has('is_premium')) item.is_premium = data.is_premium
  return item
}

// ── Main import logic ───────────────────────────────────
async function main() {
  console.log('=== ScholarX Myschool CBT Data Importer ===\n')

  console.log('1. Loading Myschool CBT database...')
  const dbBuffer = fs.readFileSync(DB_PATH)
  const SQL = await initSqlJs({ locateSqlWasm: WASM_PATH })
  const db = new SQL.Database(dbBuffer)
  console.log('   Database loaded successfully.\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Supabase credentials not found in .env.local')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } })
  console.log('2. Supabase client initialized.\n')

  const hasContentColumn = await detectColumns(supabase)

  // ── Clean up previous imports ─────────────────────────
  console.log('4. Cleaning up previous Myschool imports...')
  if (AVAILABLE_COLUMNS.has('source')) {
    const { error: libError } = await supabase.from('library_items').delete().eq('source', 'myschool')
    if (libError) console.log('   Library cleanup: ' + libError.message)
    else console.log('   Cleaned up Myschool library items.')
  }
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { error: qError } = await supabase.from('questions').delete().gte('created_at', oneHourAgo)
  if (qError) console.log('   Question cleanup: ' + qError.message)
  else console.log('   Cleaned up recent questions.')
  console.log('')

  // ── Import Novels ───────────────────────────────────
  console.log('5. Extracting novels...')
  const novelsResult = db.exec(
    'SELECT id, title, description, image, subject_id, is_current FROM novels ORDER BY id'
  )
  const novels = novelsResult[0].values
  console.log('   Found ' + novels.length + ' novels.\n')

  const novelItems = []
  for (const novel of novels) {
    const [novelId, title, description, image, subjectId] = novel
    const subject = NOVEL_SUBJECT_MAP[subjectId] || 'Literature'
    const author = extractAuthor(description)
    const novelDesc = stripHtml(description || '')

    const chaptersResult = db.exec(
      'SELECT title, chapter_number, description FROM chapters WHERE novel_id = ? ORDER BY chapter_number',
      [novelId]
    )

    let content = novelDesc
    if (chaptersResult.length > 0 && chaptersResult[0].values.length > 0) {
      const chapterTexts = chaptersResult[0].values.map(ch => {
        const chTitle = ch[0]
        const chNum = ch[1]
        const chDesc = stripHtml(ch[2] || '')
        return chDesc
          ? '**Chapter ' + chNum + ': ' + chTitle + '**\n' + chDesc
          : '**Chapter ' + chNum + ': ' + chTitle + '**'
      })
      content = novelDesc + '\n\n---\n\n' + chapterTexts.join('\n\n---\n\n')
    }
    content = content.substring(0, 10000)

    const item = buildLibraryItem({
      title,
      author,
      subject,
      level: 'secondary',
      type: 'novel',
      description: novelDesc.substring(0, 500),
      content: hasContentColumn ? content : null,
      file_url: null,
      cover_url: null,
      source: 'myschool',
      is_premium: false,
    })

    if (!hasContentColumn && AVAILABLE_COLUMNS.has('description')) {
      item.description = content.substring(0, 10000)
    }

    novelItems.push(item)
  }

  console.log('   Prepared ' + novelItems.length + ' novel items.')
  const novelInserted = await batchInsert(supabase, 'library_items', novelItems, 'novels')
  console.log('   Novels import complete: ' + novelInserted + ' items.\n')

  // ── Import Questions ──────────────────────────────────
  console.log('6. Extracting questions...')
  const questionsResult = db.exec(
    'SELECT question_id, cat_id, exam_body, exam_year, question, option_a, option_b, option_c, option_d, correct_answer, explanation FROM questions ORDER BY question_id'
  )
  const allQuestions = questionsResult[0].values
  console.log('   Found ' + allQuestions.length + ' questions.\n')

  const FREE_COUNT = 500
  const questionItems = allQuestions.map((q, idx) => {
    const catId = q[1]
    const examBody = q[2]
    const examYear = q[3]
    const subject = CAT_MAP[catId] || 'General'
    const exam = EXAM_MAP[examBody] || 'JAMB'
    const isPremium = idx >= FREE_COUNT

    return {
      exam,
      subject,
      year: examYear ? String(examYear) : null,
      question_text: stripHtml(q[4] || ''),
      option_a: stripHtml(q[5] || ''),
      option_b: stripHtml(q[6] || ''),
      option_c: stripHtml(q[7] || ''),
      option_d: stripHtml(q[8] || ''),
      correct_option: q[9] || 'a',
      explanation: stripHtml(q[10] || null),
      is_premium: isPremium,
    }
  })

  console.log('   Prepared ' + questionItems.length + ' questions (' +
    FREE_COUNT + ' free, ' + (questionItems.length - FREE_COUNT) + ' premium).')
  console.log('   Inserting questions in batches of ' + BATCH_SIZE + '...')

  const questionInserted = await batchInsert(supabase, 'questions', questionItems, 'questions')
  console.log('   Questions import complete: ' + questionInserted + ' items.\n')

  // ── Import Question References ────────────────────────
  console.log('7. Extracting question references...')
  const refResult = db.exec('SELECT id, content FROM question_ref ORDER BY id')
  if (refResult.length > 0 && refResult[0].values.length > 0) {
    const refs = refResult[0].values
    console.log('   Found ' + refs.length + ' references.')

    const refItems = refs.map(r => {
      const contentText = stripHtml(r[1] || '')
      return buildLibraryItem({
        title: 'Literary Passage #' + r[0],
        author: null,
        subject: 'Literature',
        level: 'secondary',
        type: 'reading',
        description: 'Literary passage and comprehension questions from Myschool CBT.',
        content: hasContentColumn ? contentText.substring(0, 10000) : null,
        file_url: null,
        cover_url: null,
        source: 'myschool',
        is_premium: false,
      })
    })

    // If content column doesn't exist, put text in description
    if (!hasContentColumn && AVAILABLE_COLUMNS.has('description')) {
      refs.forEach((r, i) => {
        refItems[i].description = 'Literary passage from Myschool CBT.\n\n' + stripHtml(r[1] || '').substring(0, 10000)
      })
    }

    const refInserted = await batchInsert(supabase, 'library_items', refItems, 'references')
    console.log('   Question references import complete: ' + refInserted + ' items.\n')
  } else {
    console.log('   No question references found.\n')
  }

  // ── Summary ───────────────────────────────────────────
  console.log('=== IMPORT COMPLETE ===')
  console.log('Novels (library_items): ' + novelInserted)
  console.log('Questions: ' + questionInserted + ' (' + FREE_COUNT + ' free, ' + Math.max(0, questionInserted - FREE_COUNT) + ' premium)')
  console.log('Question references (library_items): ' + (refResult?.[0]?.values?.length || 0))
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message)
  process.exit(1)
})
