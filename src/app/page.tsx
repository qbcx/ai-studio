'use client'

import { Suspense, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Wand2,
  Moon,
  Sun,
  Clock,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator as UiSeparator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Feature components
import { ImageGenerator } from '@/features/ai-generator/components/image-generator'
import { VideoGenerator } from '@/features/ai-generator/components/video-generator'
import { PageLoadingSkeleton } from '@/features/ai-generator/components/loading-skeletons'
import { SettingsPanel } from '@/features/ai-generator/components/settings-panel'
import { useAIGenerator } from '@/features/ai-generator/hooks'

// Common components
import { ErrorBoundary } from '@/components/common/error-boundary'

export default function AIGeneratorPage() {
  const [isMounted, setIsMounted] = useState(false)

  // Use the custom hook for all state management
  const {
    isDark,
    generatedImages,
    generatedVideos,
    isGeneratingImage,
    isGeneratingVideo,
    pollingProgress,
    pollingTaskId,
    toggleTheme,
    generateImage,
    generateVideo,
    checkVideoStatus,
    updateVideo,
    clearImages,
    clearVideos,
    updateApiKeys
  } = useAIGenerator()

  // Handle hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show loading skeleton during hydration
  if (!isMounted) {
    return <PageLoadingSkeleton isDark={false} />
  }

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    )}>
      {/* Header */}
      <Header
        isDark={isDark}
        toggleTheme={toggleTheme}
        onSettingsChange={updateApiKeys}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="image" className="space-y-8">
          {/* Tab Headers */}
          <div className="flex justify-center">
            <TabsList className={cn(
              'grid grid-cols-2 w-full max-w-md p-1.5 rounded-2xl',
              isDark ? 'bg-white/5' : 'bg-slate-100'
            )}>
              <TabsTrigger
                value="image"
                className={cn(
                  'rounded-xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-lg',
                  'flex items-center gap-2 transition-all duration-300'
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image</span>
              </TabsTrigger>
              <TabsTrigger
                value="video"
                className={cn(
                  'rounded-xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white data-[state=active]:shadow-lg',
                  'flex items-center gap-2 transition-all duration-300'
                )}
              >
                <Video className="w-4 h-4" />
                <span>Video</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Image Generation Tab */}
          <TabsContent value="image" className="space-y-8">
            <ErrorBoundary
              onReset={() => toast.info('Image generator reset')}
            >
              <ImageGenerator
                isDark={isDark}
                generatedImages={generatedImages}
                onGenerate={generateImage}
                isGenerating={isGeneratingImage}
                onClear={clearImages}
              />
            </ErrorBoundary>
          </TabsContent>

          {/* Video Generation Tab */}
          <TabsContent value="video" className="space-y-8">
            <ErrorBoundary
              onReset={() => toast.info('Video generator reset')}
            >
              <VideoGenerator
                isDark={isDark}
                generatedVideos={generatedVideos}
                onGenerate={generateVideo}
                isGenerating={isGeneratingVideo}
                pollingProgress={pollingProgress}
                pollingTaskId={pollingTaskId}
                onCheckStatus={checkVideoStatus}
                onClear={clearVideos}
                onUpdateVideo={updateVideo}
              />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <FooterInfo isDark={isDark} />
      </main>
    </div>
  )
}

// Header Component
interface HeaderProps {
  isDark: boolean
  toggleTheme: () => void
  onSettingsChange?: (settings: Record<string, string>) => void
}

function Header({ isDark, toggleTheme, onSettingsChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-lg opacity-50" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                AI Studio
              </h1>
              <p className="text-xs text-muted-foreground">Generate Images & Videos</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Free Options
            </Badge>

            {/* Settings Button */}
            <SettingsPanel
              isDark={isDark}
              onSettingsChange={onSettingsChange}
            />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

// Footer Info Component
interface FooterInfoProps {
  isDark: boolean
}

function FooterInfo({ isDark }: FooterInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-12 text-center"
    >
      <div className={cn(
        'inline-flex items-center gap-4 px-6 py-3 rounded-full',
        isDark ? 'bg-white/5' : 'bg-slate-100'
      )}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Images: ~10s</span>
        </div>
        <UiSeparator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="w-4 h-4" />
          <span>Videos: 2-5 min</span>
        </div>
        <UiSeparator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Multiple Providers</span>
        </div>
      </div>
    </motion.div>
  )
}
