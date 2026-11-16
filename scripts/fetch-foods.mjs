import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import readXlsxFile from 'read-excel-file/node'

const CH_URL = 'https://naehrwertdaten.ch/wp-content/uploads/2026/07/Schweizer_Nahrwertdatenbank.xlsx'
const OFF_URL = 'https://search.openfoodfacts.org/search'
const OFF_PAGES = 100
const LIQUID = /getränke|fruchtsäfte|milch und milchprodukte\/milch$|sirup|trinkwasser/i

const num = (v) => {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return undefined
  if (/^(sp|spuren|<)/i.test(v.trim())) return 0
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const r1 = (n) => Math.round(n * 10) / 10

async function swiss() {
  const dir = await mkdtemp(join(tmpdir(), 'naehrwert-'))
  const file = join(dir, 'ch.xlsx')
  const res = await fetch(CH_URL)
  if (!res.ok) throw new Error(`Schweizer Datenbank: HTTP ${res.status}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
  const rows = (await readXlsxFile(file))[0].data
  const head = rows.findIndex((r) => r.includes('Name') && r.includes('Kategorie'))
  const h = rows[head]
  const col = (name) => h.indexOf(name)
  const c = {
    id: col('ID'),
    name: col('Name'),
    syn: col('Synonyme'),
    cat: col('Kategorie'),
    density: col('Dichte'),
    kcal: col('Energie, Kilokalorien (kcal)'),
    fat: col('Fett, total (g)'),
    carbs: col('Kohlenhydrate, verfügbar (g)'),
    protein: col('Protein (g)'),
  }
  const out = []
  for (const r of rows.slice(head + 1)) {
    const kcal = num(r[c.kcal])
    if (!r[c.name] || kcal === undefined) continue
    const liquid = String(r[c.cat] ?? '').split(';').some((cat) => LIQUID.test(cat))
    const f = liquid ? (num(r[c.density]) ?? 1) : 1
    out.push([
      `ch:${r[c.id]}`,
      String(r[c.name]).trim(),
      '',
      String(r[c.syn] ?? '').trim(),
      Math.round(kcal * f),
      r1((num(r[c.protein]) ?? 0) * f),
      r1((num(r[c.carbs]) ?? 0) * f),
      r1((num(r[c.fat]) ?? 0) * f),
      liquid ? 1 : 0,
    ])
  }
  return out
}

const LIQUID_NAME = /(^|[\s-])(h-)?milch\b|vollmilch|drink|saft|nektar|getränk|limo|cola|wasser|bier\b|smoothie|eistee|schorle|kefir|ayran|lassi/i
const POWDER = /pulver|powder|whey|isolat|casein/i
const NOT_LIQUID = /pulver|schoko|riegel|reis|joghurt|quark|käse|creme|brot|keks|\beis\b|schnitte|bonbon|gummi|flocken/i

const isMl = (p, name) =>
  !POWDER.test(name) &&
  (p.product_quantity_unit === 'ml' ||
  /\d\s*(ml|cl|l)\b/i.test(String(p.quantity ?? '')) ||
  (LIQUID_NAME.test(name) && !NOT_LIQUID.test(name)))

async function popular() {
  const out = []
  const seen = new Set()
  for (let page = 1; page <= OFF_PAGES; page++) {
    const params = new URLSearchParams({
      q: 'countries_tags:"en:germany"',
      sort_by: '-unique_scans_n',
      page_size: '100',
      page: String(page),
      fields: 'code,product_name,product_name_de,brands,nutriments,product_quantity_unit,quantity',
    })
    const res = await fetch(`${OFF_URL}?${params}`)
    if (!res.ok) throw new Error(`Open Food Facts Seite ${page}: HTTP ${res.status}`)
    const { hits = [] } = await res.json()
    for (const p of hits) {
      const n = p.nutriments ?? {}
      const name = String(p.product_name_de || p.product_name || '').trim()
      const kj = num(n['energy-kj_100g'])
      const kcal = num(n['energy-kcal_100g']) ?? (kj !== undefined ? kj / 4.184 : undefined)
      const brand = String((Array.isArray(p.brands) ? p.brands[0] : String(p.brands ?? '').split(',')[0]) ?? '').trim()
      const key = `${name}|${brand}`.toLowerCase()
      if (!name || kcal === undefined || kcal > 950 || seen.has(key) || !p.code) continue
      seen.add(key)
      out.push([
        String(p.code),
        name,
        brand,
        '',
        Math.round(kcal),
        r1(num(n.proteins_100g) ?? 0),
        r1(num(n.carbohydrates_100g) ?? 0),
        r1(num(n.fat_100g) ?? 0),
        isMl(p, name) ? 1 : 0,
      ])
    }
    process.stdout.write(`\rOpen Food Facts: Seite ${page}/${OFF_PAGES}, ${out.length} Produkte`)
    if (!hits.length) break
    await new Promise((r) => setTimeout(r, 700))
  }
  process.stdout.write('\n')
  return out
}

const base = await swiss()
console.log(`Schweizer Nährwertdatenbank: ${base.length} Lebensmittel`)
const products = await popular()
await writeFile(new URL('../src/data/foods.json', import.meta.url), JSON.stringify([...base, ...products]))
console.log(`Gespeichert: ${base.length + products.length} Einträge in src/data/foods.json`)
