import { useMemo, useState } from 'react'
import { Apple, Plus, Search, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useApp.js'
import Card from '../components/ui/Card.jsx'
import { searchFoodsLocal } from '../services/nutritionService.js'
import { listCommonFoodsByCategory } from '../utils/commonFoodSearch.js'
import {
  dailyTotals,
  formatNutrient,
  MACRO_KEYS,
  MICRO_KEYS,
  NUTRIENT_LABELS,
  nutrientsForLogEntry,
  toDateKey,
} from '../utils/nutrients.js'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
const CATEGORIES = [
  { id: 'protein', label: 'Protein' },
  { id: 'carb', label: 'Carbs' },
  { id: 'fat', label: 'Fats' },
]

export default function Nutrition() {
  const {
    foodCatalog,
    foodsById,
    nutritionLogs,
    importFoodFromCatalog,
    addManualFood,
    logNutritionEntry,
    deleteNutritionEntry,
  } = useApp()

  const [dateKey, setDateKey] = useState(() => toDateKey())
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [activeCategory, setActiveCategory] = useState('protein')
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState('lunch')
  const [status, setStatus] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualProtein, setManualProtein] = useState('')
  const [manualCarbs, setManualCarbs] = useState('')
  const [manualFat, setManualFat] = useState('')
  const [manualCalories, setManualCalories] = useState('')

  const categoryFoods = useMemo(() => listCommonFoodsByCategory(activeCategory), [activeCategory])

  const dayLogs = useMemo(
    () => nutritionLogs.filter((e) => e.date === dateKey),
    [nutritionLogs, dateKey]
  )
  const totals = useMemo(
    () => dailyTotals(nutritionLogs, foodsById, dateKey),
    [nutritionLogs, foodsById, dateKey]
  )

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    const data = searchFoodsLocal(query.trim())
    setSearchResults(data.results ?? [])
  }

  function handleAddBuiltin(catalogId) {
    try {
      const food = importFoodFromCatalog(catalogId)
      setSelectedFoodId(food.id)
      setStatus(`Added ${food.name} (per 100 g, built-in)`)
    } catch (err) {
      setStatus(err.message)
    }
  }

  function handleManualSave(e) {
    e.preventDefault()
    const food = addManualFood({
      name: manualName,
      nutrients_per_100g: {
        calories_kcal: Number(manualCalories) || 0,
        protein_g: Number(manualProtein) || 0,
        carbs_g: Number(manualCarbs) || 0,
        fat_g: Number(manualFat) || 0,
      },
    })
    setSelectedFoodId(food.id)
    setShowManual(false)
    setStatus(`Saved manual food: ${food.name}`)
  }

  function handleLog(e) {
    e.preventDefault()
    if (!selectedFoodId) {
      setStatus('Select or add a food first')
      return
    }
    try {
      logNutritionEntry({
        foodId: selectedFoodId,
        grams,
        meal,
        date: dateKey,
      })
      setStatus(`Logged ${grams} g`)
      setGrams('100')
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div className="space-y-5 px-4 pt-6 pb-28">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Apple className="h-6 w-6 text-emerald-400" />
          Nutrition
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Built-in foods per 100 g (USDA-aligned) · logs scale by grams — no API key needed
        </p>
      </header>

      <Card>
        <label className="text-xs text-zinc-500">Day</label>
        <input
          type="date"
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        />
      </Card>

      <Card className="border-emerald-500/20">
        <h2 className="mb-3 text-sm font-semibold text-white">Daily totals</h2>
        <div className="grid grid-cols-2 gap-3">
          {MACRO_KEYS.map((key) => (
            <div key={key} className="rounded-xl bg-zinc-900/80 p-3">
              <p className="text-[10px] uppercase text-zinc-500">{NUTRIENT_LABELS[key]}</p>
              <p className="text-lg font-bold text-emerald-300">
                {formatNutrient(key, totals[key])}
                {key.endsWith('_g') ? ' g' : key === 'calories_kcal' ? ' kcal' : ''}
              </p>
            </div>
          ))}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-cyan-400">Micronutrients</summary>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {MICRO_KEYS.map((key) => (
              <div key={key} className="flex justify-between gap-2 text-zinc-400">
                <span>{NUTRIENT_LABELS[key]}</span>
                <span className="text-zinc-200">
                  {formatNutrient(key, totals[key])}
                  {key.endsWith('_mg') ? ' mg' : key.endsWith('_mcg') ? ' mcg' : ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Search className="h-4 w-4" /> Common foods (built-in)
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. chicken breast, rice, peanut butter"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-300"
          >
            Search
          </button>
        </form>
        {searchResults.length > 0 ? (
          <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {searchResults.map((item) => (
              <li
                key={item.catalog_id}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-medium text-zinc-200">{item.name}</p>
                  <p className="text-zinc-500 capitalize">{item.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddBuiltin(item.catalog_id)}
                  className="shrink-0 rounded-lg bg-cyan-500/15 px-2 py-1 text-cyan-300"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeCategory === cat.id
                  ? 'bg-emerald-500/25 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {categoryFoods.map((food) => (
            <li
              key={food.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/80 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-200">{food.name}</p>
                <p className="text-zinc-500">
                  {formatNutrient('calories_kcal', food.nutrients_per_100g.calories_kcal)} kcal · P{' '}
                  {formatNutrient('protein_g', food.nutrients_per_100g.protein_g)}g · C{' '}
                  {formatNutrient('carbs_g', food.nutrients_per_100g.carbs_g)}g · F{' '}
                  {formatNutrient('fat_g', food.nutrients_per_100g.fat_g)}g
                  <span className="text-zinc-600"> / 100g</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddBuiltin(food.id)}
                className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-emerald-300"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="mt-3 text-xs text-cyan-400"
        >
          {showManual ? 'Hide manual entry' : 'Custom food (per 100 g)'}
        </button>
        {showManual ? (
          <form onSubmit={handleManualSave} className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Food name"
              required
              className="col-span-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
            <input
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
              placeholder="Calories"
              type="number"
              min="0"
              step="0.1"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
            <input
              value={manualProtein}
              onChange={(e) => setManualProtein(e.target.value)}
              placeholder="Protein (g)"
              type="number"
              min="0"
              step="0.1"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
            <input
              value={manualCarbs}
              onChange={(e) => setManualCarbs(e.target.value)}
              placeholder="Carbs (g)"
              type="number"
              min="0"
              step="0.1"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
            <input
              value={manualFat}
              onChange={(e) => setManualFat(e.target.value)}
              placeholder="Fat (g)"
              type="number"
              min="0"
              step="0.1"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
            <button
              type="submit"
              className="col-span-2 rounded-xl bg-emerald-500/20 py-2 font-semibold text-emerald-300"
            >
              Save custom food
            </button>
          </form>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Log intake (grams)
        </h2>
        <form onSubmit={handleLog} className="space-y-3">
          <select
            value={selectedFoodId}
            onChange={(e) => setSelectedFoodId(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Select saved food…</option>
            {foodCatalog.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.brand ? ` — ${f.brand}` : ''}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="Grams"
              required
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {MEALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-zinc-950"
          >
            Log food
          </button>
        </form>
        {status ? <p className="mt-2 text-xs text-emerald-400">{status}</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-white">Today&apos;s log</h2>
        {dayLogs.length === 0 ? (
          <p className="text-xs text-zinc-500">No entries for this day.</p>
        ) : (
          <ul className="space-y-2">
            {dayLogs.map((entry) => {
              const food = foodsById[entry.food_id]
              const scaled = nutrientsForLogEntry(food, entry.grams)
              return (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-zinc-200">
                      {food?.name ?? 'Unknown food'} · {entry.grams} g
                    </p>
                    <p className="text-zinc-500 capitalize">{entry.meal}</p>
                    <p className="mt-1 text-zinc-400">
                      {formatNutrient('calories_kcal', scaled.calories_kcal)} kcal · P{' '}
                      {formatNutrient('protein_g', scaled.protein_g)}g · C{' '}
                      {formatNutrient('carbs_g', scaled.carbs_g)}g · F{' '}
                      {formatNutrient('fat_g', scaled.fat_g)}g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNutritionEntry(entry.id)}
                    className="text-red-400"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
