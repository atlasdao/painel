'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface BrandCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  hover?: boolean
  interactive?: boolean
  gradient?: 'blue' | 'green' | 'purple' | 'custom'
}

const BrandCard = React.forwardRef<HTMLDivElement, BrandCardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      interactive = false,
      gradient,
      children,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variants = {
      default: 'bg-white border border-gray-200 shadow-sm',
      elevated: 'bg-white shadow-md',
      outlined: 'bg-transparent border-2 border-gray-300',
      gradient: 'bg-gradient-to-br text-white'
    }

    // Padding styles
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10'
    }

    // Gradient styles
    const gradients = {
      blue: 'from-blue-500 to-blue-700',
      green: 'from-green-500 to-green-700',
      purple: 'from-purple-500 to-purple-700',
      custom: ''
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-xl transition-all duration-200',
          // Variant
          variants[variant],
          // Gradient
          variant === 'gradient' && gradient && gradients[gradient],
          // Padding
          paddings[padding],
          // Hover effect
          hover && 'hover:shadow-lg hover:-translate-y-0.5',
          // Interactive
          interactive && 'cursor-pointer',
          // Custom className
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

BrandCard.displayName = 'BrandCard'

// Card Header component
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pb-4 border-b border-gray-200', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// Card Title component
export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold text-gray-900', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

// Card Description component
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 mt-1', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

// Card Content component
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-4', className)} {...props} />
))
CardContent.displayName = 'CardContent'

// Card Footer component
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pt-4 mt-4 border-t border-gray-200', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export default BrandCard