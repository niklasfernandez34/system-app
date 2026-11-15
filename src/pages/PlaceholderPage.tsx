import { SystemWindow } from '../components/ui'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <SystemWindow title={title}>
      <p className="text-center text-sys-muted">Dieser Bereich wird in einer späteren Phase freigeschaltet.</p>
    </SystemWindow>
  )
}
