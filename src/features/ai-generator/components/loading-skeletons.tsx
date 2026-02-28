'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  isDark: boolean
}

export function ImageGallerySkeleton({ isDark }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className={cn(
        'rounded-2xl p-4 min-h-[400px]',
        isDark ? 'bg-white/5' : 'bg-slate-50'
      )}>
        <div className="flex flex-col items-center justify-center h-[350px]">
          <Skeleton className="w-20 h-20 rounded-full mb-4" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  )
}

export function VideoGallerySkeleton({ isDark }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className={cn(
        'rounded-2xl p-4 min-h-[400px]',
        isDark ? 'bg-white/5' : 'bg-slate-50'
      )}>
        <div className="flex flex-col items-center justify-center h-[350px]">
          <Skeleton className="w-20 h-20 rounded-full mb-4" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
    </div>
  )
}

export function GeneratorFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-0 shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// Full page loading state
export function PageLoadingSkeleton({ isDark }: LoadingSkeletonProps) {
  return (
    <div className={cn(
      'min-h-screen',
      isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    )}>
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div>
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20 hidden sm:block" />
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center mb-8">
          <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          <GeneratorFormSkeleton />
          <ImageGallerySkeleton isDark={isDark} />
        </div>
      </main>
    </div>
  )
}
