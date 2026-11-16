import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

const styles = {
  primary: 'bg-white text-black active:bg-white/80',
  ghost: 'bg-sys-raised text-sys-text active:bg-sys-line',
  danger: 'bg-sys-danger/15 text-sys-danger active:bg-sys-danger/30',
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      className={`min-h-11 rounded-2xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    />
  )
}
