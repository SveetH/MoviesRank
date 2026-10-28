import { LoaderCircle, TriangleAlert } from 'lucide-react'

export function LoadingState({ label = 'Loading movies' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={25} className="spin" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <TriangleAlert size={23} />
      <div><strong>Couldn’t load this right now</strong><p>{message}</p></div>
      <button className="button button-outline" onClick={onRetry}>Try again</button>
    </div>
  )
}
