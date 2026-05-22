import { useState } from 'react'
import { ChevronLeft, Moon, Scale, Bell, Trash2, Sparkles, Shield } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useApp } from '../hooks/useApp.js'
import { parseGuardianPrefs } from '../utils/goalContract.js'
import Card from '../components/ui/Card.jsx'

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function Settings({ onBack }) {
  const { profile, updateProfile, resetLocalData, refreshProfile } = useAuth()
  const { reloadFromStorage } = useApp()
  const guardianPrefs = parseGuardianPrefs(profile?.notification_preferences)

  const [units, setUnits] = useState(profile?.units ?? 'lbs')
  const [darkMode, setDarkMode] = useState(profile?.dark_mode ?? true)
  const [guardianEnabled, setGuardianEnabled] = useState(guardianPrefs.guardian_enabled)
  const [weeklyReviewDay, setWeeklyReviewDay] = useState(guardianPrefs.weekly_review_day)
  const [quietStart, setQuietStart] = useState(guardianPrefs.quiet_hours.start)
  const [quietEnd, setQuietEnd] = useState(guardianPrefs.quiet_hours.end)
  const [dailyCheckin, setDailyCheckin] = useState(guardianPrefs.daily_checkin)
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  async function savePreferences() {
    setSaving(true)
    try {
      await updateProfile({
        units,
        dark_mode: darkMode,
        ai_preferences: profile?.ai_preferences ?? {},
        notification_preferences: {
          ...(profile?.notification_preferences ?? {}),
          guardian_enabled: guardianEnabled,
          weekly_review_day: weeklyReviewDay,
          quiet_hours: { start: quietStart, end: quietEnd },
          daily_checkin: dailyCheckin,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleResetData() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    await resetLocalData()
    reloadFromStorage()
    await refreshProfile()
    setConfirmReset(false)
    onBack?.()
  }

  return (
    <div className="space-y-5 px-4 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-zinc-500">All data stored locally on this device</p>
        </div>
      </header>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-white">Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <Moon className="h-4 w-4" /> Dark mode
            </span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="h-5 w-5 rounded accent-emerald-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <Scale className="h-4 w-4" /> Units
            </span>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={savePreferences}
          disabled={saving}
          className="mt-4 w-full rounded-2xl bg-emerald-500/20 py-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </Card>

      <Card className="border-amber-500/20">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Shield className="h-4 w-4 text-amber-400" />
          Goal Guardian
        </h2>
        <p className="mb-4 text-xs text-zinc-500">Max 2 reminders/day, 5/week. Respects quiet hours.</p>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Guardian reminders</span>
            <input
              type="checkbox"
              checked={guardianEnabled}
              onChange={(e) => setGuardianEnabled(e.target.checked)}
              className="h-5 w-5 rounded accent-amber-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Weekly goal review</span>
            <select
              value={weeklyReviewDay}
              onChange={(e) => setWeeklyReviewDay(Number(e.target.value))}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-white"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <Bell className="h-4 w-4" /> Daily check-in
            </span>
            <input
              type="checkbox"
              checked={dailyCheckin}
              onChange={(e) => setDailyCheckin(e.target.checked)}
              className="h-5 w-5 rounded accent-amber-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs text-zinc-500">Quiet hours start</span>
              <select
                value={quietStart}
                onChange={(e) => setQuietStart(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs text-zinc-500">Quiet hours end</span>
              <select
                value={quietEnd}
                onChange={(e) => setQuietEnd(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={savePreferences}
          disabled={saving}
          className="mt-4 w-full rounded-2xl bg-amber-500/20 py-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-500/30"
        >
          {saving ? 'Saving…' : 'Save Guardian settings'}
        </button>
      </Card>

      <Card>
        <label className="flex items-center justify-between opacity-60">
          <span className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4" /> AI coaching style
          </span>
          <span className="text-xs text-zinc-500">Standard</span>
        </label>
      </Card>

      <Card className="border-red-500/20">
        <button
          type="button"
          onClick={handleResetData}
          className="flex w-full items-center gap-2 text-sm font-semibold text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          {confirmReset ? 'Tap again to erase all local data' : 'Reset all local data'}
        </button>
      </Card>
    </div>
  )
}
