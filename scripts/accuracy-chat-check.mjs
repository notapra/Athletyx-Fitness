const BASE = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/$/, '')

const profile = {
  fitness_goal: 'strength',
  experience_level: 'intermediate',
  units: 'lbs',
  age: 28,
  ai_preferences: {
    personal_factors: {
      injury_history: ['right shoulder'],
      recovery_capacity: 'average',
      max_effort_level: 'moderate',
    },
  },
}
const goals = [{ title: 'Bench 225', completed: false }]

const cases = [
  {
    q: 'How much protein should I eat for muscle gain?',
    must: [/1\.4|0\.64|g\/kg|per kg|per lb/i],
  },
  {
    q: 'Should I deload next week after hard training?',
    must: [/deload|volume|4.?8 week|5.?7 day/i],
  },
  {
    q: 'Am I recovering well if I sleep 6 hours?',
    must: [/sleep|7.?9|6 hour/i],
  },
  {
    q: 'Can I do heavy overhead press with a shoulder injury?',
    must: [/not|do not|pain|clear|alternativ/i],
  },
  {
    q: 'How can I improve my bench press?',
    must: [/week|volume|progressive|failure|overload|2/i],
  },
]

let pass = 0
for (const c of cases) {
  const r = await fetch(`${BASE}/api/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: c.q, profile, goals }),
  })
  const d = await r.json()
  const content = d.content || ''
  const cites = (d.citations || []).map((x) => x.id || x.title || '').join(' ')
  const accuracy = c.must.every((re) => re.test(content))
  const researchCite = /research\//i.test(cites)
  if (accuracy) pass += 1
  console.log(`${accuracy ? 'PASS' : 'FAIL'} researchCite=${researchCite}`)
  console.log('Q:', c.q)
  console.log('A:', content.slice(0, 360))
  console.log('CITES:', cites.slice(0, 220))
  console.log('---')
}

const bad = await fetch(`${BASE}/api/coach`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How much protein?',
    profile: {
      fitness_goal: 'strength',
      ai_preferences: { personal_factors: { max_effort_level: 'high' } },
    },
    goals: [],
  }),
})
console.log('bad_profile_status', bad.status)
console.log(`SUMMARY ${pass}/${cases.length} accurate`)
process.exit(pass === cases.length && bad.status === 200 ? 0 : 1)
