/**
 * Built-in food catalog tests — run: node scripts/test-common-foods.mjs
 */
import { searchCommonFoods, getCommonFoodById } from '../src/utils/commonFoodSearch.js'
import { scaleNutrients } from '../src/utils/nutrients.js'

let failed = 0

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`)
    failed += 1
  } else {
    console.log(`✓ ${msg}`)
  }
}

const chickenHits = searchCommonFoods('chicken breast')
assert(chickenHits[0]?.id === 'chicken_breast_cooked', 'finds chicken breast')

const riceHits = searchCommonFoods('rice')
assert(riceHits.some((f) => f.id === 'white_rice_cooked'), 'finds white rice')
assert(riceHits.some((f) => f.id === 'rice_cakes_plain'), 'finds rice cakes')

const beef = getCommonFoodById('ground_beef_93_lean_cooked')
const scaled = scaleNutrients(beef.nutrients_per_100g, 150)
assert(Math.abs(scaled.protein_g - 41.1) < 0.01, '150g 93% beef protein scales correctly')

const chicken = getCommonFoodById('chicken_breast_cooked')
assert(chicken.nutrients_per_100g.protein_g === 31, 'per 100g protein preserved')
const portion = scaleNutrients(chicken.nutrients_per_100g, 200)
assert(portion.protein_g === 62, '200g chicken = 62g protein')

if (failed > 0) process.exit(1)
console.log('All common food tests passed')
