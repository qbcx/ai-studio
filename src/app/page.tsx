'use client'

import { useState, useEffect } from 'react'
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
  Key,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Types
interface GeneratedImage {
  id: string
  image: string
  prompt: string
  size: string
  error?: boolean
  loading?: boolean
}

// Simple ID generator
const genId = () => Math.random().toString(36).slice(2, 10)

// Image sizes
const SIZES = [
  { value: '1024x1024', label: 'Square' },
  { value: '1024x1792', label: 'Portrait' },
  { value: '1792x1024', label: 'Landscape' }
]

// Provider options
const IMAGE_PROVIDERS = [
  { id: 'pollinations', name: 'Pollinations (Free)', needsKey: false, warning: 'May be slow/unavailable' },
  { id: 'openai', name: 'OpenAI DALL-E', needsKey: true },
  { id: 'zhipu', name: 'Zhipu AI', needsKey: true },
  { id: 'stability', name: 'Stability AI', needsKey: true },
]

const VIDEO_PROVIDERS = [
  { id: 'zhipu', name: 'Zhipu CogVideoX', needsKey: true },
  { id: 'runway', name: 'Runway Gen-3', needsKey: true },
]

// Storage keys
const KEYS_STORAGE = 'ai-studio-keys'
const PROVIDER_STORAGE = 'ai-studio-provider'

export default function StudioPage() {
  // Theme
  const [isDark, setIsDark] = useState(false)

  // Tab
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image')

  // Generation
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [isGenerating, setIsGenerating] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])

  // Provider & API Key
  const [provider, setProvider] = useState('pollinations')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')

  // Get current providers list
  const providers = activeTab === 'image' ? IMAGE_PROVIDERS : VIDEO_PROVIDERS
  const currentProvider = providers.find(p => p.id === provider) || providers[0]
  const needsKey = currentProvider?.needsKey

  // Initialize
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }

    // Load saved keys & provider
    const savedKeys = localStorage.getItem(KEYS_STORAGE)
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys)
        setApiKey(keys[provider] || '')
      } catch (e) {}
    }

    const savedProvider = localStorage.getItem(PROVIDER_STORAGE)
    if (savedProvider) {
      setProvider(savedProvider)
    }
  }, [])

  // Save API key when it changes
  useEffect(() => {
    const savedKeys = localStorage.getItem(KEYS_STORAGE)
    let keys = {}
    try {
      keys = savedKeys ? JSON.parse(savedKeys) : {}
    } catch (e) {}
    keys = { ...keys, [provider]: apiKey }
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys))
    setKeyStatus('idle')
  }, [apiKey, provider])

  // Save provider
  useEffect(() => {
    localStorage.setItem(PROVIDER_STORAGE, provider)
    // Load key for this provider
    const savedKeys = localStorage.getItem(KEYS_STORAGE)
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys)
        setApiKey(keys[provider] || '')
      } catch (e) {}
    }
    setKeyStatus('idle')
  }, [provider])

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }

  // Test API Key
  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }

    setIsTesting(true)
    setKeyStatus('idle')

    try {
      // Try a minimal API call to test the key
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      })

      const data = await res.json()

      if (data.success) {
        setKeyStatus('valid')
        toast.success('API key is valid!')
      } else {
        setKeyStatus('invalid')
        toast.error(data.error || 'Invalid API key')
      }
    } catch (err) {
      setKeyStatus('invalid')
      toast.error('Failed to test API key')
    } finally {
      setIsTesting(false)
    }
  }

  // Generate Image
  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (needsKey && !apiKey.trim()) {
      toast.error('Please add your API key')
      return
    }

    setIsGenerating(true)
    toast.loading('Creating your image...', { id: 'gen' })

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size,
          provider,
          apiKey: needsKey ? apiKey : null
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate')
      }

      setImages(prev => [{
        id: genId(),
        image: data.data.image,
        prompt: data.data.prompt,
        size: data.data.size,
        loading: true
      }, ...prev])

      toast.success('Image created! Loading...', { id: 'gen' })
      setPrompt('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate'
      toast.error(message, { id: 'gen', duration: 5000 })
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

  // Retry image generation
  const retryImage = (img: GeneratedImage) => {
    // Remove failed image and regenerate
    setImages(prev => prev.filter(i => i.id !== img.id))
    setPrompt(img.prompt)
    setSize(img.size)
    // Auto regenerate after a short delay
    setTimeout(() => {
      generateImage()
    }, 100)
  }

  // Mark image as loaded
  const imageLoaded = (id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, loading: false, error: false } : img
    ))
  }

  // Mark image as failed
  const imageFailed = (id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, loading: false, error: true } : img
    ))
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
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">AI Studio</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className={cn(
            'inline-flex p-1 rounded-xl',
            isDark ? 'bg-zinc-900' : 'bg-zinc-100'
          )}>
            <button
              onClick={() => {
                setActiveTab('image')
                setProvider(IMAGE_PROVIDERS[0].id)
              }}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'image'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500'
              )}
            >
              <ImageIcon className="w-4 h-4 inline mr-1.5" />
              Image
            </button>
            <button
              onClick={() => {
                setActiveTab('video')
                setProvider(VIDEO_PROVIDERS[0].id)
              }}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'video'
                  ? isDark ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500'
              )}
            >
              <Video className="w-4 h-4 inline mr-1.5" />
              Video
            </button>
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Provider Selection */}
          <Card className={cn(
            'p-4 border-0',
            isDark ? 'bg-zinc-900' : 'bg-zinc-50'
          )}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-500">Provider:</span>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      provider === p.id
                        ? 'bg-violet-500 text-white'
                        : isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white text-zinc-600'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* API Key Input (only if needed) */}
          {needsKey && (
            <Card className={cn(
              'p-4 border-0',
              isDark ? 'bg-zinc-900' : 'bg-zinc-50'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium">API Key</span>
                {keyStatus === 'valid' && (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="w-3 h-3" /> Valid
                  </span>
                )}
                {keyStatus === 'invalid' && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="w-3 h-3" /> Invalid
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${currentProvider.name} API key`}
                    className={cn('pr-10', isDark ? 'bg-zinc-800' : 'bg-white')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={testApiKey}
                  disabled={isTesting || !apiKey.trim()}
                  className="shrink-0"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </Button>
              </div>
              <a
                href={getProviderUrl(provider)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-500 hover:underline mt-2"
              >
                Get API key <ExternalLink className="w-3 h-3" />
              </a>
            </Card>
          )}

          {/* Prompt Input */}
          <Card className={cn(
            'p-5 border-0 shadow-lg',
            isDark ? 'bg-zinc-900' : 'bg-zinc-50'
          )}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={activeTab === 'image'
                ? 'A serene mountain landscape at golden hour...'
                : 'A cat playing with a ball of yarn in slow motion...'
              }
              className={cn(
                'min-h-[100px] resize-none border-0 text-base',
                isDark ? 'bg-zinc-800' : 'bg-white'
              )}
              disabled={isGenerating}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
              {activeTab === 'image' && (
                <div className="flex gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSize(s.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
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
                disabled={isGenerating || !prompt.trim() || (needsKey && !apiKey.trim())}
                className="ml-auto px-6 h-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl font-medium"
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
          </Card>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center mb-3',
                  isDark ? 'bg-zinc-900' : 'bg-zinc-100'
                )}>
                  <ImageIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-zinc-500 text-sm">Generated images will appear here</p>
              </div>
            ) : (
              images.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    'overflow-hidden border-0',
                    isDark ? 'bg-zinc-900' : 'bg-white'
                  )}
                >
                  <div className="aspect-square relative group">
                    {/* Loading state */}
                    {item.loading && (
                      <div className={cn(
                        'absolute inset-0 flex items-center justify-center',
                        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                      )}>
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                      </div>
                    )}

                    {/* Error state */}
                    {item.error && (
                      <div className={cn(
                        'absolute inset-0 flex flex-col items-center justify-center gap-3',
                        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                      )}>
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-sm text-zinc-500 text-center px-4">Failed to load image</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryImage(item)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      </div>
                    )}

                    <img
                      src={item.image}
                      alt={item.prompt}
                      className={cn(
                        'w-full h-full object-cover transition-opacity duration-500',
                        item.loading || item.error ? 'opacity-0' : 'opacity-1'
                      )}
                      onLoad={() => imageLoaded(item.id)}
                      onError={() => imageFailed(item.id)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => downloadImage(item)}
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
                  <div className="p-3">
                    <p className="text-sm text-zinc-500 line-clamp-2">{item.prompt}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}

// Get provider dashboard URL
function getProviderUrl(provider: string): string {
  const urls: Record<string, string> = {
    openai: 'https://platform.openai.com/api-keys',
    zhipu: 'https://open.bigmodel.cn',
    stability: 'https://platform.stability.ai/account/keys',
    runway: 'https://runwayml.com',
  }
  return urls[provider] || '#'
}
