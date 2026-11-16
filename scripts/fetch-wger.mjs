import { writeFile } from 'node:fs/promises'

const GROUPS = {
  Abs: 'Bauch',
  Back: 'Rücken',
  Calves: 'Waden',
  Cardio: 'Ausdauer',
  Chest: 'Brust',
  Legs: 'Beine',
  Shoulders: 'Schultern',
}

const MUSCLES = {
  'Anterior deltoid': 'Vordere Schulter',
  'Biceps brachii': 'Bizeps',
  'Biceps femoris': 'Beinbeuger',
  Brachialis: 'Oberarmmuskel',
  Gastrocnemius: 'Wade',
  'Gluteus maximus': 'Gesäß',
  'Latissimus dorsi': 'Latissimus',
  'Obliquus externus abdominis': 'Schräge Bauchmuskeln',
  'Pectoralis major': 'Brust',
  'Quadriceps femoris': 'Oberschenkel vorne',
  'Rectus abdominis': 'Gerader Bauchmuskel',
  'Serratus anterior': 'Sägemuskel',
  Soleus: 'Schollenmuskel',
  Trapezius: 'Trapez',
  'Triceps brachii': 'Trizeps',
}

const EQUIPMENT = {
  'none (bodyweight exercise)': 'Körpergewicht',
  Dumbbell: 'Kurzhantel',
  'Cable machine': 'Kabelzug / Latzug',
  Barbell: 'Langhantel',
  Bench: 'Bank',
  'Pull-up bar': 'Klimmzugstange',
  'Resistance band': 'Widerstandsband',
  Kettlebell: 'Kettlebell',
  'Incline bench': 'Schrägbank',
  'SZ-Bar': 'SZ-Stange',
  'Gym mat': 'Matte',
  'Swiss Ball': 'Gymnastikball',
}

const strip = (html = '') =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

function group(ex) {
  const primary = ex.muscles.map((m) => m.name)
  const cat = ex.category?.name
  if (cat === 'Arms') return primary.includes('Triceps brachii') ? 'Trizeps' : 'Bizeps'
  if (cat === 'Legs' && primary[0] === 'Gluteus maximus') return 'Po'
  return GROUPS[cat] ?? 'Ganzkörper'
}

const results = []
let url = 'https://wger.de/api/v2/exerciseinfo/?limit=200'
while (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const page = await res.json()
  results.push(...page.results)
  url = page.next
  console.log(`${results.length} / ${page.count}`)
}

function equipment(ex, name) {
  const list = ex.equipment.map((e) => EQUIPMENT[e.name] ?? e.name)
  const allNames = [name, ...ex.translations.map((t) => t.name)].join(' ')
  if (/maschine|machine/i.test(allNames) && !list.includes('Kabelzug / Latzug')) list.push('Maschine')
  return list
}

const seen = new Set()
const out = []
for (const ex of results) {
  const t = ex.translations.find((x) => x.language === 1) ?? ex.translations.find((x) => x.language === 2)
  if (!t?.name?.trim()) continue
  const name = t.name.trim()
  if (seen.has(name.toLowerCase())) continue
  seen.add(name.toLowerCase())
  const img = ex.images.find((i) => i.is_main) ?? ex.images[0]
  const description = strip(t.description)
  out.push({
    id: ex.id,
    name,
    group: group(ex),
    muscles: ex.muscles.map((m) => MUSCLES[m.name] ?? m.name),
    secondary: ex.muscles_secondary.map((m) => MUSCLES[m.name] ?? m.name),
    equipment: equipment(ex, name),
    description: description.length > 500 ? description.slice(0, 497) + '…' : description,
    image: img ? img.thumbnails?.medium ?? img.image : undefined,
    author: [t.license_author, img?.license_author].filter(Boolean).join(', ') || 'wger.de',
  })
}
out.sort((a, b) => a.name.localeCompare(b.name, 'de'))
await writeFile(new URL('../src/data/wger.json', import.meta.url), JSON.stringify(out))
console.log(`${out.length} Übungen gespeichert`)
