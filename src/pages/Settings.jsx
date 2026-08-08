import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  Moon,
  Scale,
  Bell,
  Trash2,
  Sparkles,
  Shield,
  FileText,
  Download,
  LogOut,
  ExternalLink,
  Plug,
  Copy,
  Activity,
  Scan,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useApp } from '../hooks/useApp.js'
import { parseGuardianPrefs } from '../utils/goalContract.js'
import {
  exportUserData,
  requestAccountDeletion,
  fetchConsents,
  updateConsents,
} from '../services/syncService.js'
import { getCoachCacheStats } from '../services/coachCache.js'
import { buildCursorMcpJson, fetchMcpSession } from '../services/mcpService.js'
import {
  getHealthSyncStatus,
  getHealthSyncPreferences,
  setHealthSyncEnabled,
  refreshHealthSyncStatus,
  requestHealthPermissions,
  importWorkoutsFromHealth,
} from '../services/healthSync.js'
import {
  getFormVisionStatus,
  getFormVisionPreferences,
  setFormVisionEnabled,
  setFormVisionPreferCamera,
  setFormVisionLiveEnabled,
  setFormVisionCloudConsent,
} from '../services/formVision.js'
import LegalDocument from '../components/compliance/LegalDocument.jsx'
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
  const { profile, userId, updateProfile, resetLocalData, refreshProfile, signOut, isConfigured } =
    useAuth()
  const { reloadFromStorage, cloudEnabled } = useApp()
  const guardianPrefs = parseGuardianPrefs(profile?.notification_preferences)

  const [units, setUnits] = useState(profile?.units ?? 'lbs')
  const [darkMode, setDarkMode] = useState(profile?.dark_mode ?? true)
  const [guardianEnabled, setGuardianEnabled] = useState(guardianPrefs.guardian_enabled)
  const [weeklyReviewDay, setWeeklyReviewDay] = useState(guardianPrefs.weekly_review_day)
  const [quietStart, setQuietStart] = useState(guardianPrefs.quiet_hours.start)
  const [quietEnd, setQuietEnd] = useState(guardianPrefs.quiet_hours.end)
  const [dailyCheckin, setDailyCheckin] = useState(guardianPrefs.daily_checkin)
  const [aiCoaching, setAiCoaching] = useState(true)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [legalView, setLegalView] = useState(null)
  const [mcpSession, setMcpSession] = useState(null)
  const [mcpLoading, setMcpLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState(() => getHealthSyncStatus())
  const [healthSyncEnabled, setHealthSyncEnabledState] = useState(
    () => getHealthSyncPreferences().enabled
  )
  const [healthBusy, setHealthBusy] = useState(false)
  const formVisionStatus = getFormVisionStatus()
  const [formVisionEnabled, setFormVisionEnabledState] = useState(
    () => getFormVisionPreferences().enabled
  )
  const [formVisionPreferCamera, setFormVisionPreferCameraState] = useState(
    () => getFormVisionPreferences().preferCamera
  )
  const [formVisionLive, setFormVisionLiveState] = useState(
    () => getFormVisionPreferences().liveVisionEnabled
  )
  const [formVisionConsent, setFormVisionConsentState] = useState(
    () => getFormVisionPreferences().cloudConsent
  )
  const cacheStats = getCoachCacheStats()

  useEffect(() => {
    refreshHealthSyncStatus().then(setHealthStatus)
  }, [])

  useEffect(() => {
    if (!cloudEnabled || !userId) return
    fetchConsents(userId).then((row) => {
      if (!row) return
      setAiCoaching(row.ai_coaching ?? true)
      setAnalyticsConsent(row.analytics ?? false)
    })
  }, [cloudEnabled, userId])

  async function savePreferences() {
    setSaving(true)
    setStatusMsg('')
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
      if (cloudEnabled && userId) {
        await updateConsents(userId, {
          ai_coaching: aiCoaching,
          analytics: analyticsConsent,
          notifications: guardianEnabled,
        })
      }
      setStatusMsg('Saved')
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

  async function handleLoadMcpConfig() {
    setMcpLoading(true)
    setStatusMsg('')
    try {
      const session = await fetchMcpSession()
      setMcpSession(session)
      setStatusMsg('MCP config loaded — copy into Cursor or Claude Desktop')
    } catch (e) {
      setMcpSession(null)
      setStatusMsg(e.message)
    } finally {
      setMcpLoading(false)
    }
  }

  async function handleCopyMcpConfig() {
    if (!mcpSession) return
    const examplePath = 'path/to/athletyx.mcp/server.py'
    const json = JSON.stringify(buildCursorMcpJson(mcpSession, examplePath), null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setStatusMsg('MCP JSON copied — replace server.py path with your machine path')
    } catch {
      setStatusMsg('Could not copy to clipboard')
    }
  }

  async function handleExport() {
    setStatusMsg('')
    try {
      const payload = cloudEnabled
        ? await exportUserData(userId)
        : {
            exported_at: new Date().toISOString(),
            profile,
            local_only: true,
          }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ironlog-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatusMsg('Export downloaded')
    } catch (e) {
      setStatusMsg(e.message)
    }
  }

  async function handleAccountDeletion() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await requestAccountDeletion(userId)
      setStatusMsg('Deletion scheduled — account purged after 30 days')
      setConfirmDelete(false)
    } catch (e) {
      setStatusMsg(e.message)
    }
  }

  const storageLabel = cloudEnabled
    ? 'Synced to Supabase when online'
    : isConfigured
      ? 'Sign in to enable cloud sync'
      : 'All data stored locally on this device'

  if (legalView) {
    return <LegalDocument docKey={legalView} onBack={() => setLegalView(null)} />
  }

  return (
    <div className="space-y-5 px-4 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          data-testid="settings-back"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-zinc-500">{storageLabel}</p>
        </div>
      </header>

      {statusMsg ? <p className="text-xs text-emerald-400">{statusMsg}</p> : null}

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

      <Card className="border-violet-500/20">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-violet-400" />
          AI coaching & privacy
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          IronCoach uses Athletyx RAG + optional web search. Not medical advice.
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">AI coaching consent</span>
            <input
              type="checkbox"
              checked={aiCoaching}
              onChange={(e) => setAiCoaching(e.target.checked)}
              className="h-5 w-5 rounded accent-violet-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Anonymous analytics</span>
            <input
              type="checkbox"
              checked={analyticsConsent}
              onChange={(e) => setAnalyticsConsent(e.target.checked)}
              className="h-5 w-5 rounded accent-violet-500"
            />
          </label>
          <a
          href="#"
          onClick={(e) => { e.preventDefault(); setLegalView('ai') }}
          className="flex items-center gap-2 text-xs text-cyan-400"
        >
          <ExternalLink className="h-3 w-3" /> How AI coaching works
        </a>
        </div>
      </Card>

      <Card className="border-amber-500/20">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Shield className="h-4 w-4 text-amber-400" />
          Health disclaimer
        </h2>
        <p className="mb-3 text-xs text-zinc-400">
          IronLog is not a medical device. Consult a physician before changing your exercise program.
        </p>
        <button
          type="button"
          onClick={() => setLegalView('health')}
          className="flex items-center gap-2 text-xs text-cyan-400"
        >
          <FileText className="h-3 w-3" /> Read full health disclaimer
        </button>
      </Card>

      <Card className="border-rose-500/20" data-testid="health-sync-card">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Activity className="h-4 w-4 text-rose-400" />
          Health sync
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          {healthStatus.provider
            ? `${healthStatus.provider} — import/export workouts when native sync is enabled.`
            : healthStatus.message}
        </p>
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Enable health sync</span>
          <input
            type="checkbox"
            data-testid="health-sync-toggle"
            checked={healthSyncEnabled}
            disabled={!healthStatus.available}
            onChange={(e) => {
              const enabled = e.target.checked
              setHealthSyncEnabledState(enabled)
              setHealthSyncEnabled(enabled)
              setStatusMsg(enabled ? 'Health sync enabled' : 'Health sync disabled')
            }}
            className="h-5 w-5 rounded accent-rose-500 disabled:opacity-40"
          />
        </label>
        {healthStatus.available ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="health-sync-permissions"
              disabled={healthBusy}
              onClick={async () => {
                setHealthBusy(true)
                try {
                  const result = await requestHealthPermissions()
                  setStatusMsg(result.granted ? 'Health permissions granted' : result.reason)
                } catch (e) {
                  setStatusMsg(e.message)
                } finally {
                  setHealthBusy(false)
                }
              }}
              className="rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 disabled:opacity-50"
            >
              Request permissions
            </button>
            <button
              type="button"
              data-testid="health-sync-import"
              disabled={healthBusy || !healthSyncEnabled}
              onClick={async () => {
                setHealthBusy(true)
                try {
                  const result = await importWorkoutsFromHealth()
                  reloadFromStorage()
                  setStatusMsg(result.message)
                } catch (e) {
                  setStatusMsg(e.message)
                } finally {
                  setHealthBusy(false)
                }
              }}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
            >
              Import now
            </button>
          </div>
        ) : null}
        <p className="mt-2 text-[10px] text-zinc-600">
          Platform: {healthStatus.platform}
          {healthStatus.available ? ' · native plugin active' : ` · ${healthStatus.message}`}
        </p>
      </Card>

      <Card className="border-cyan-500/20" data-testid="form-vision-card">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Scan className="h-4 w-4 text-cyan-400" />
          Form Vision
        </h2>
        <p className="mb-3 text-xs text-zinc-500">{formVisionStatus.message}</p>
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Enable form check in workouts</span>
          <input
            type="checkbox"
            data-testid="form-vision-toggle"
            checked={formVisionEnabled}
            onChange={(e) => {
              const enabled = e.target.checked
              setFormVisionEnabledState(enabled)
              setFormVisionEnabled(enabled)
              setStatusMsg(
                enabled
                  ? 'Form Vision enabled — open Form during a set'
                  : 'Form Vision disabled'
              )
            }}
            className="h-5 w-5 rounded accent-cyan-500"
          />
        </label>
        {formVisionEnabled ? (
          <>
            <label className="mt-3 flex items-center justify-between">
              <span className="text-sm text-zinc-300">Prefer camera preview</span>
              <input
                type="checkbox"
                data-testid="form-vision-prefer-camera"
                checked={formVisionPreferCamera}
                onChange={(e) => {
                  const prefer = e.target.checked
                  setFormVisionPreferCameraState(prefer)
                  setFormVisionPreferCamera(prefer)
                }}
                className="h-5 w-5 rounded accent-cyan-500"
              />
            </label>
            <label className="mt-3 flex items-center justify-between">
              <span className="text-sm text-zinc-300">Live Vision (Gemini)</span>
              <input
                type="checkbox"
                data-testid="form-vision-live-toggle"
                checked={formVisionLive}
                onChange={(e) => {
                  const on = e.target.checked
                  setFormVisionLiveState(on)
                  setFormVisionLiveEnabled(on)
                }}
                className="h-5 w-5 rounded accent-cyan-500"
              />
            </label>
            <label className="mt-3 flex items-start justify-between gap-3">
              <span className="text-sm text-zinc-300">
                Cloud analysis consent
                <span className="mt-1 block text-[10px] text-zinc-500">
                  Frames are sent to Google Gemini for movement and form analysis; they are not
                  stored by IronLog.
                </span>
              </span>
              <input
                type="checkbox"
                data-testid="form-vision-cloud-consent"
                checked={formVisionConsent}
                onChange={(e) => {
                  const on = e.target.checked
                  setFormVisionConsentState(on)
                  setFormVisionCloudConsent(on)
                  setStatusMsg(
                    on
                      ? 'Live Vision cloud consent enabled'
                      : 'Live Vision cloud consent disabled'
                  )
                }}
                className="mt-0.5 h-5 w-5 shrink-0 rounded accent-cyan-500"
              />
            </label>
          </>
        ) : null}
        <p className="mt-2 text-[10px] text-zinc-600">
          Cue-only mode works without a camera (screen-reader friendly). Supported starters:{' '}
          {formVisionStatus.supportedExercises.map((e) => e.title).join(', ')}.
        </p>
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
        <h2 className="mb-3 text-sm font-semibold text-white">Legal & data</h2>
        <div className="space-y-2 text-xs">
          <button type="button" onClick={() => setLegalView('privacy')} className="block text-cyan-400">
            Privacy policy
          </button>
          <button type="button" onClick={() => setLegalView('terms')} className="block text-cyan-400">
            Terms of service
          </button>
        </div>
        {cacheStats.hits || cacheStats.saves ? (
          <p className="mt-3 text-[10px] text-zinc-500">
            Coach cache: {cacheStats.hits ?? 0} hits · {cacheStats.saves ?? 0} saved answers
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleExport}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 py-3 text-sm text-zinc-200"
        >
          <Download className="h-4 w-4" /> Export my data (JSON)
        </button>
        {cloudEnabled ? (
          <button
            type="button"
            onClick={handleAccountDeletion}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 py-3 text-sm text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? 'Tap again to request account deletion' : 'Request account deletion'}
          </button>
        ) : null}
      </Card>

      {cloudEnabled ? (
        <Card className="border-cyan-500/20">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
            <Plug className="h-4 w-4 text-cyan-400" />
            MCP access (your account only)
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Connect Cursor or Claude Desktop to your personal Athletyx MCP servers. Your Supabase
            session token scopes tools to your data only — never share this config.
          </p>
          <button
            type="button"
            onClick={handleLoadMcpConfig}
            disabled={mcpLoading}
            className="w-full rounded-2xl border border-cyan-500/30 py-3 text-sm font-semibold text-cyan-200"
          >
            {mcpLoading ? 'Loading…' : 'Load my MCP configuration'}
          </button>
          {mcpSession ? (
            <div className="mt-3 space-y-2 text-xs text-zinc-400">
              <p>
                User: <span className="text-zinc-200">{mcpSession.email}</span> ·{' '}
                {mcpSession.domains?.length ?? 0} domain servers
              </p>
              <p className="text-zinc-500">{mcpSession.instructions}</p>
              <button
                type="button"
                onClick={handleCopyMcpConfig}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500/10 py-2.5 text-sm text-cyan-300"
              >
                <Copy className="h-4 w-4" /> Copy Cursor mcp.json snippet
              </button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {cloudEnabled ? (
        <Card>
          <p className="mb-3 text-xs text-zinc-500">
            Signed in as <span className="text-zinc-300">{profile?.email ?? profile?.username}</span>
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-200"
          >
            <LogOut className="h-4 w-4" /> Switch account
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 py-3 text-sm font-semibold text-red-300"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </Card>
      ) : null}

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
