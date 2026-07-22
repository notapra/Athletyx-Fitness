import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('ironlog_compliance_accepted_v1', 'true')
    localStorage.setItem('ironlog_island_position_v1', JSON.stringify({ x: 8, y: 520 }))
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 30_000 })
})

test('bottom navigation visits every tab', async ({ page }) => {
  const tabs = [
    { id: 'home', heading: /Ready to train|Great session today/ },
    { id: 'workouts', heading: 'Workouts' },
    { id: 'nutrition', heading: 'Nutrition' },
    { id: 'analytics', heading: 'Analytics' },
    { id: 'ai-trainer', heading: 'IronCoach' },
    { id: 'profile', heading: /Athlete|Profile|Saved on this device/ },
  ]

  for (const tab of tabs) {
    await page.getByTestId(`nav-${tab.id}`).click()
    await expect(page.getByRole('heading', { name: tab.heading }).first()).toBeVisible()
  }
})

test('start workout and cancel returns to home', async ({ page }) => {
  await page.getByTestId('start-workout').click()
  await expect(page.getByText('Live workout')).toBeVisible()
  await page.getByTestId('cancel-workout').click()
  await expect(page.getByTestId('start-workout')).toBeVisible()
})

test('finish without sets shows validation hint', async ({ page }) => {
  await page.getByTestId('nav-workouts').click()
  await page.getByTestId('new-workout').click()
  await page.getByTestId('finish-workout').click()
  await expect(page.getByText(/Log at least one set/i)).toBeVisible()
})

test('log workout and complete session summary', async ({ page }) => {
  await page.getByTestId('start-workout').click()
  await page.getByTestId('add-exercise-fab').click()
  await page.getByPlaceholder('Search exercises...').fill('Bench')
  await page.getByRole('button', { name: 'Bench Press', exact: true }).click()

  const weightInput = page.locator('input[type="number"]').first()
  const repsInput = page.locator('input[type="number"]').nth(1)
  await weightInput.fill('135')
  await repsInput.fill('8')

  await page.getByTestId('finish-workout').click()
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible()
  await page.getByTestId('summary-done').click()
  await expect(page.getByTestId('nav-home')).toBeVisible()
})

test('profile settings opens and returns', async ({ page }) => {
  await page.getByTestId('nav-profile').click()
  await page.getByTestId('open-settings').click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByTestId('settings-back').click()
  await expect(page.getByTestId('open-settings')).toBeVisible()
})

test('iron coach refocus button is clickable', async ({ page }) => {
  await page.getByTestId('nav-ai-trainer').click()
  await expect(page.getByTestId('refocus-goals')).toBeVisible()
  await page.getByTestId('refocus-goals').click()
  await expect(page.getByText(/Refocusing on your goal/i)).toBeVisible({ timeout: 10_000 })
})

test('nutrition tab loads daily tracking UI', async ({ page }) => {
  await page.getByTestId('nav-nutrition').click()
  await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible()
  await expect(page.getByText(/per 100 g/i)).toBeVisible()
})

test('workouts filter chips toggle', async ({ page }) => {
  await page.getByTestId('nav-workouts').click()
  await page.getByRole('button', { name: 'Push', exact: true }).click()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page.getByTestId('new-workout')).toBeVisible()
})
