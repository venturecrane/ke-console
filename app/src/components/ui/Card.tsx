import { type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
}

function Card({ elevated = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-ke-border ${elevated ? 'bg-ke-elevated' : 'bg-ke-surface'} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-3 sm:px-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

function CardBody({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-4 sm:px-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardBody, type CardProps }
