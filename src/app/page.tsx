'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Wand2,
  Moon,
  Sun,
  Download,
  Trash2,
  Loader2,
  ExternalLink,
  Settings,
  ChevronDown,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AI_PROVIDERS } from '@/lib/ai-providers'

// Types
interface GeneratedImage {
  id: string
  image: string
  prompt: string
  size: string
}

interface GeneratedVideo {
  id: string
  taskId: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  prompt: string
  videoUrl?: string
  quality: string
}

// Simple ID generator
const genId = () => Math.random().toString(36).slice(2, 10)

// Image sizes
const SIZES = [
  { value: '1024x1024', label: 'Square' },
  { value: '1024x1792', label: 'Portrait' },
  { value: '1792x1024', label: 'Landscape' }
]

export default function StudioPage() {
  // State
  const [isDark, setIsDark] = useState(false)
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image')
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [isGenerating, setIsGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [showSettings, setShowSettings] = useState(false)

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }

  // Generate Image
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    toast.loading('Creating your image...', { id: 'gen' })

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate')
      }

      setImages(prev => [{
        id: genId(),
        image: data.data.image,
        prompt: data.data.prompt,
        size: data.data.size
      }, ...prev])

      toast.success('Image created!', { id: 'gen' })
      setPrompt('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate', { id: 'gen' })
    } finally {
      setIsGenerating(false)
    }
  }

  // Download image
  const downloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a')
    link.href = img.image
    link.download = `ai-image-${img.id}.png`
    link.click()
    toast.success('Downloaded!')
  }

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-500',
      isDark ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'
    )}>
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-xl',
        isDark ? 'border-white/5 bg-zinc-950/80' : 'border-zinc-100 bg-white/80'
      )}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">AI Studio</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className={cn(
            'inline-flex p-1 rounded-xl',
            isDark ? 'bg-zinc-900' : 'bg-zinc-100'
          )}>
            <button
              onClick={() => setActiveTab('image')}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === 'image'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Image
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === 'video'
                  ? isDark ? 'bg-white text-zinc-900 shadow-sm' : 'bg-zinc-900 text-white shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <Video className="w-4 h-4 inline mr-2" />
              Video
            </button>
          </div>
        </div>

        {/* Generator */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Input Card */}
          <Card className={cn(
            'p-6 border-0 shadow-lg',
            isDark ? 'bg-zinc-900' : 'bg-zinc-50'
          )}>
            <div className="space-y-5">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'image'
                  ? 'A serene mountain landscape at golden hour...'
                  : 'A cat playing with a ball of yarn in slow motion...'
                }
                className={cn(
                  'min-h-[120px] resize-none border-0 text-base',
                  isDark ? 'bg-zinc-800' : 'bg-white'
                )}
                disabled={isGenerating}
              />

              {/* Options Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {activeTab === 'image' && (
                  <div className="flex gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSize(s.value)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                          size === s.value
                            ? 'bg-violet-500 text-white'
                            : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-zinc-600'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={generateImage}
                  disabled={isGenerating || !prompt.trim()}
                  className="ml-auto px-8 h-11 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(activeTab === 'image' ? images : videos).length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-zinc-900' : 'bg-zinc-100'
                )}>
                  {activeTab === 'image' ? (
                    <ImageIcon className="w-8 h-8 text-zinc-500" />
                  ) : (
                    <Video className="w-8 h-8 text-zinc-500" />
                  )}
                </div>
                <p className="text-zinc-500">
                  Your generated {activeTab === 'image' ? 'images' : 'videos'} will appear here
                </p>
              </div>
            ) : (
              (activeTab === 'image' ? images : videos).map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'overflow-hidden border-0 shadow-lg',
                    isDark ? 'bg-zinc-900' : 'bg-white'
                  )}
                >
                  <div className="aspect-square relative group">
                    <img
                      src={(item as GeneratedImage).image}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => downloadImage(item as GeneratedImage)}
                            className="flex-1 bg-white/20 backdrop-blur hover:bg-white/30"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setImages(prev => prev.filter(i => i.id !== item.id))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-zinc-500 line-clamp-2">{item.prompt}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </motion.div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <Card className={cn(
            'relative w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}>
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold mb-6">AI Providers</h2>

            <div className="space-y-3">
              {AI_PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className={cn(
                    'p-4 rounded-xl flex items-center justify-between',
                    isDark ? 'bg-zinc-800' : 'bg-zinc-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {provider.new && (
                          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">NEW</span>
                        )}
                        {provider.popular && (
                          <span className="text-xs bg-violet-500/20 text-violet-500 px-2 py-0.5 rounded-full">Popular</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">{provider.description}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {provider.pricing.free || provider.pricing.paid}
                      </p>
                    </div>
                  </div>
                  <a
                    href={provider.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
