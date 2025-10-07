'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface LoadingSkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'card' | 'table' | 'button' | 'input' | 'stat' | 'custom'
  lines?: number
  className?: string
  width?: string | number
  height?: string | number
  shimmer?: boolean
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  lines = 1,
  className,
  width,
  height,
  shimmer = true
}) => {
  const baseClasses = 'relative overflow-hidden bg-gray-700/50 rounded'

  // Shimmer effect overlay
  const shimmerOverlay = shimmer ? (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-600/10 to-transparent" />
  ) : null

  // Variant styles - updated for dark theme
  const variants = {
    text: 'h-4 w-full',
    title: 'h-8 w-3/4',
    avatar: 'w-12 h-12 rounded-full',
    card: 'w-full h-32 rounded-xl',
    table: 'w-full h-12',
    button: 'h-10 w-24 rounded-lg',
    input: 'h-10 w-full rounded-lg',
    stat: 'h-20 w-full rounded-xl',
    custom: ''
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  // Card variant with glassmorphism
  if (variant === 'card') {
    return (
      <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse overflow-hidden">
        {shimmerOverlay}
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gray-700/50 rounded-full" />
          <div className="flex-1">
            <div className="h-5 bg-gray-700/50 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-700/50 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700/50 rounded" />
          <div className="h-4 bg-gray-700/50 rounded w-5/6" />
          <div className="h-4 bg-gray-700/50 rounded w-4/6" />
        </div>
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700/50">
          <div className="h-8 bg-gray-700/50 rounded w-24" />
          <div className="h-8 bg-gray-700/50 rounded w-20" />
        </div>
      </div>
    )
  }

  // Table variant for dark theme
  if (variant === 'table') {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700/50">
          <div className="grid grid-cols-5 gap-4">
            <div className="h-4 bg-gray-600/50 rounded relative overflow-hidden">
              {shimmerOverlay}
            </div>
            <div className="h-4 bg-gray-600/50 rounded relative overflow-hidden">
              {shimmerOverlay}
            </div>
            <div className="h-4 bg-gray-600/50 rounded relative overflow-hidden">
              {shimmerOverlay}
            </div>
            <div className="h-4 bg-gray-600/50 rounded relative overflow-hidden">
              {shimmerOverlay}
            </div>
            <div className="h-4 bg-gray-600/50 rounded relative overflow-hidden">
              {shimmerOverlay}
            </div>
          </div>
        </div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-gray-800/30 p-4 border-b border-gray-700/50">
            <div className="grid grid-cols-5 gap-4">
              <div className="h-4 bg-gray-700/50 rounded relative overflow-hidden">
                {shimmerOverlay}
              </div>
              <div className="h-4 bg-gray-700/50 rounded relative overflow-hidden">
                {shimmerOverlay}
              </div>
              <div className="h-4 bg-gray-700/50 rounded relative overflow-hidden">
                {shimmerOverlay}
              </div>
              <div className="h-4 bg-gray-700/50 rounded relative overflow-hidden">
                {shimmerOverlay}
              </div>
              <div className="h-4 bg-gray-700/50 rounded relative overflow-hidden">
                {shimmerOverlay}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Stat variant for dashboard
  if (variant === 'stat') {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse relative overflow-hidden">
        {shimmerOverlay}
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-700/50 rounded w-1/2" />
          <div className="w-10 h-10 bg-gray-700/50 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-700/50 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-700/50 rounded w-1/3" />
      </div>
    )
  }

  // Multiple lines
  if (lines > 1) {
    return (
      <div className="space-y-3">
        {[...Array(lines)].map((_, index) => (
          <div
            key={index}
            className={cn(baseClasses, variants[variant], className)}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : undefined
            }}
          >
            {shimmerOverlay}
          </div>
        ))}
      </div>
    )
  }

  // Single element
  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      style={style}
    >
      {shimmerOverlay}
    </div>
  )
}

// Skeleton Container for page loading
export const SkeletonContainer: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return (
    <div className="animate-pulse">
      <div className="space-y-6">{children}</div>
    </div>
  )
}

// Dashboard skeleton with dark theme
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-10 bg-gray-700/50 rounded w-1/4 mb-2" />
        <div className="h-4 bg-gray-700/50 rounded w-1/3" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <LoadingSkeleton key={i} variant="stat" />
        ))}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-700/30 rounded" />
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-700/30 rounded" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <div className="h-6 bg-gray-700/50 rounded w-1/4" />
        </div>
        <LoadingSkeleton variant="table" />
      </div>
    </div>
  )
}

// Form skeleton with dark theme
export const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-700/50 rounded w-1/4 mb-2" />
          <div className="h-10 bg-gray-700/50 rounded" />
        </div>
      ))}
      <div className="flex gap-4">
        <div className="h-10 bg-gray-700/50 rounded w-32" />
        <div className="h-10 bg-gray-700/50 rounded w-32" />
      </div>
    </div>
  )
}

// Transaction skeleton
export const TransactionSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-700/50 rounded-full" />
          <div>
            <div className="h-4 bg-gray-700/50 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-700/50 rounded w-24" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-5 bg-gray-700/50 rounded w-20 mb-1" />
          <div className="h-3 bg-gray-700/50 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

// Payment link skeleton
export const PaymentLinkSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-5 bg-gray-700/50 rounded w-40 mb-2" />
          <div className="h-4 bg-gray-700/50 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-700/50 rounded-full w-20" />
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700/50 rounded w-full" />
        <div className="h-4 bg-gray-700/50 rounded w-3/4" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
        <div className="h-4 bg-gray-700/50 rounded w-24" />
        <div className="flex space-x-2">
          <div className="h-8 bg-gray-700/50 rounded w-8" />
          <div className="h-8 bg-gray-700/50 rounded w-8" />
        </div>
      </div>
    </div>
  )
}

// Page skeleton for full page loading
export const PageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6 space-y-6">
        <div className="h-10 bg-gray-700/50 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default LoadingSkeleton