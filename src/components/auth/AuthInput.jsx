import { useState } from 'react'

export default function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}) {
  const [focused, setFocused] = useState(false)
  const floated = focused || Boolean(value)

  return (
    <div className="relative">
      <label
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          floated
            ? 'top-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90'
            : 'top-3.5 text-sm text-zinc-500'
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        placeholder={floated ? placeholder : ''}
        className={`w-full rounded-2xl border bg-zinc-950/80 px-4 pb-3 pt-7 text-sm text-white transition focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500/50 focus:ring-red-500/25'
            : 'border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20'
        }`}
      />
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
