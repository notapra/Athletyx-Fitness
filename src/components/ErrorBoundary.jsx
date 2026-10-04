import { Component } from 'react'
import { captureException } from '../services/sentry.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('IronLog render error', error, info)
    captureException(error, { extra: info })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-300">
          <p className="text-lg font-semibold text-white">Something went wrong</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Restart the app. If this keeps happening, export your data from Settings before reinstalling.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
