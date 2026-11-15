import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const styles = {
  primary: 'border-sys-glow bg-sys-glow/15 text-sys-text shadow-glow active:bg-sys-glow/30',
  ghost: 'border-sys-line bg-transparent text-sys-muted active:bg-sys-line/30',
  danger: 'border-sys-danger bg-sys-danger/15 text-sys-danger active:bg-sys-danger/30',
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      className={`min-h-11 rounded-md border px-4 py-2 font-semibold tracking-wide transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    />
  )
}
