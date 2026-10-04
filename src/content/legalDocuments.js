/** In-app legal copy — mirrors athletyx.mcp/resources.py for App Store compliance. */

export const LEGAL_DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    body: `Athletyx Privacy Policy (v1.0)

We collect account info (email, name), workout data, bodyweight, and AI chat history to provide fitness tracking and coaching.

Data is stored encrypted in transit (TLS) and at rest with row-level security. We do not sell personal data.

Categories: contact (email, name), health & fitness (workouts, bodyweight, goals, personal factors), user content (notes, chat), identifiers (user_id).

Retention: workout data while your account is active; deleted within 30 days of account deletion. AI chat up to 1 year or until deletion.

Contact: support@athletyx.com for access, export, or deletion requests.`,
  },
  terms: {
    title: 'Terms of Service',
    body: `Athletyx Terms of Service (v1.0)

By using IronLog + Athletyx you agree to use the app for personal fitness tracking only. You must be 13+ to create an account.

We may update these terms with reasonable notice. Continued use constitutes acceptance.`,
  },
  health: {
    title: 'Health Disclaimer',
    body: `IronLog is not a medical device and does not provide medical advice, diagnosis, or treatment.

Consult a physician before starting or changing an exercise program. Stop exercising if you feel pain, dizziness, or shortness of breath.

Athletyx coaching provides general fitness information only — not medical guidance.`,
  },
  ai: {
    title: 'How AI Coaching Works',
    body: `AI Disclosure

IronCoach uses Athletyx AI with your workout data, goals, and personal factors (age, injuries, restrictions). Optional web research may be used when enabled.

AI outputs may be inaccurate. You can disable AI coaching in Settings.

The coach must not diagnose conditions, prescribe medication, or claim medical authority. It encourages form quality, progressive overload, rest, and physician consultation for injuries.`,
  },
}
