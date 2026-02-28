'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  RefreshCw,
  Settings,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useStudioStore } from '@/store/studio-store'
import api, { ApiError } from '@/services/api'

// Provider configurations
const IMAGE_PROVIDERS = [
  { id: 'replicate', name: 'Replicate', model: 'Flux Schnell', icon: '🔄', popular: true },
  { id: 'fal', name: 'fal.ai', model: 'Flux Pro', icon: '⚡', popular: true },
  { id: 'gemini', name: 'Gemini', model: 'Imagen 3', icon: '✨', popular: true },
  { id: 'zhipu', name: 'Zhipu AI', model: 'CogView-4', icon: '🤖' },
  { id: 'openai', name: 'OpenAI', model: 'DALL-E 3', icon: '🟢' },
  { id: 'stability', name: 'Stability AI', model: 'SD 3.5', icon: '🎪' },
]

const VIDEO_PROVIDERS = [
  { id: 'replicate', name: 'Replicate', model: 'LTX Video', icon: '🔄' },
  { id: 'fal', name: 'fal.ai', model: 'LTX-2', icon: '⚡' },
  { id: 'kling', name: 'Kling AI', model: 'v3', icon: '🎥', popular: true },
  { id: 'zhipu', name: 'Zhipu AI', model: 'CogVideoX', icon: '🤖' },
  { id: 'runway', name: 'Runway', model: 'Gen-3', icon: '✈️' },
]

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square', size: '1024x1024' },
  { value: '16:9', label: 'Landscape', size: '1792x1024' },
  { value: '9:16', label: 'Portrait', size: '1024x1792' },
]

// Provider dashboard URLs
const PROVIDER_URLS: Record<string, string> = {
  replicate: 'https://replicate.com/account/api-tokens',
  fal: 'https://fal.ai/dashboard/keys',
  gemini: 'https://aistudio.google.com/api-keys',
  zhipu: 'https://open.bigmodel.cn',
  openai: 'https://platform.openai.com/api-keys',
  stability: 'https://platform.stability.ai',
  kling: 'https://klingai.com',
  runway: 'https://runwayml.com',
}

// Generate unique ID
const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export default function StudioPage() {
  // Store state
  const {
    activeTab,
    isDark,
    isGenerating,
    images,
    videos,
    settings,
    apiKeys,
    keyStatus,
    setActiveTab,
    toggleTheme,
    setGenerating,
    addImage,
    updateImage,
    removeImage,
    addVideo,
    updateVideo,
    removeVideo,
    updateSettings,
    setApiKey,
    setKeyStatus,
  } = useStudioStore()

  // Local state for form
  const prompt = useStudioStore((s) => s.settings.prompt || '')
  const setPrompt = (p: string) => updateSettings({ prompt: p })

  // Current provider based on tab
  const currentProviderId = activeTab === 'image' ? settings.imageProvider : settings.videoProvider
  const providers = activeTab === 'image' ? IMAGE_PROVIDERS : VIDEO_PROVIDERS
  const currentProvider = providers.find((p) => p.id === currentProviderId) || providers[0]
  const apiKey = apiKeys[currentProviderId] || ''
  const currentKeyStatus = keyStatus[currentProviderId] || 'idle'

  // Initialize theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Test API Key
  const testApiKey = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key')
      return
    }

    setKeyStatus(currentProviderId, 'idle')
    toast.loading('Testing API key...', { id: 'test-key' })

    try {
      await api.testKey(currentProviderId, apiKey)
      setKeyStatus(currentProviderId, 'valid')
      toast.success('API key is valid!', { id: 'test-key' })
    } catch (error) {
      setKeyStatus(currentProviderId, 'invalid')
      const message = error instanceof ApiError ? error.message : 'Invalid API key'
      toast.error(message, { id: 'test-key' })
    }
  }, [apiKey, currentProviderId, setKeyStatus])

  // Generate Image
  const generateImage = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!apiKey.trim()) {
      toast.error('Please add your API key')
      return
    }

    setGenerating(true)
    const imageId = genId()
    const aspectRatio = ASPECT_RATIOS.find((a) => a.value === settings.aspectRatio) || ASPECT_RATIOS[0]

    // Add placeholder image
    addImage({
      id: imageId,
      image: '',
      prompt: prompt.trim(),
      size: aspectRatio.size,
      provider: currentProviderId,
      timestamp: new Date().toISOString(),
      loading: true,
    })

    toast.loading('Generating image...', { id: 'gen' })

    try {
      const result = await api.generateImage({
        prompt: prompt.trim(),
        size: aspectRatio.size,
        provider: currentProviderId,
        apiKey,
        removeWatermark: settings.removeWatermark,
      })

      // Check if async (Replicate)
      if (result.predictionId) {
        toast.loading('Processing...', { id: 'gen' })

        const imageUrl = await api.pollImageStatus(
          result.predictionId,
          apiKey,
          (status) => toast.loading(`Status: ${status}`, { id: 'gen' })
        )

        updateImage(imageId, {
          image: imageUrl,
          loading: false,
        })

        toast.success('Image ready!', { id: 'gen' })
      } else {
        // Direct result
        updateImage(imageId, {
          image: result.image,
          loading: false,
        })

        toast.success('Image created!', { id: 'gen' })
      }

      setPrompt('')
    } catch (error) {
      updateImage(imageId, { loading: false, error: true })

      const message = error instanceof ApiError ? error.message : 'Failed to generate image'
      toast.error(message, { id: 'gen', duration: 5000 })
    } finally {
      setGenerating(false)
    }
  }, [prompt, apiKey, currentProviderId, settings.aspectRatio, settings.removeWatermark, addImage, updateImage, setGenerating])

  // Generate Video
  const generateVideo = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!apiKey.trim()) {
      toast.error('Please add your API key')
      return
    }

    setGenerating(true)
    const videoId = genId()

    // Add placeholder video
    addVideo({
      id: videoId,
      taskId: '',
      status: 'PROCESSING',
      prompt: prompt.trim(),
      provider: currentProviderId,
      timestamp: new Date().toISOString(),
    })

    toast.loading('Creating video task...', { id: 'gen-video' })

    try {
      const result = await api.generateVideo({
        prompt: prompt.trim(),
        provider: currentProviderId,
        apiKey,
        quality: 'speed',
        duration: 5,
      })

      updateVideo(videoId, { taskId: result.taskId })
      toast.loading('Processing video...', { id: 'gen-video' })

      // Poll for video status
      const videoUrl = await api.pollVideoStatus(
        result.taskId,
        currentProviderId,
        apiKey,
        (status) => toast.loading(`Video: ${status}`, { id: 'gen-video' })
      )

      updateVideo(videoId, {
        status: 'SUCCESS',
        videoUrl,
      })

      toast.success('Video ready!', { id: 'gen-video' })
      setPrompt('')
    } catch (error) {
      updateVideo(videoId, { status: 'FAIL' })

      const message = error instanceof ApiError ? error.message : 'Failed to generate video'
      toast.error(message, { id: 'gen-video', duration: 5000 })
    } finally {
      setGenerating(false)
    }
  }, [prompt, apiKey, currentProviderId, addVideo, updateVideo, setGenerating])

  // Download handlers
  const downloadImage = useCallback((img: { id: string; image: string }) => {
    const link = document.createElement('a')
    link.href = img.image
    link.download = `ai-studio-${img.id}.png`
    link.click()
    toast.success('Downloaded!')
  }, [])

  const downloadVideo = useCallback((vid: { id: string; videoUrl?: string }) => {
    if (!vid.videoUrl) return
    const link = document.createElement('a')
    link.href = vid.videoUrl
    link.download = `ai-studio-${vid.id}.mp4`
    link.click()
    toast.success('Downloaded!')
  }, [])

  // Retry image
  const retryImage = useCallback((img: { prompt: string; size: string }) => {
    const aspect = ASPECT_RATIOS.find((a) => a.size === img.size)
    if (aspect) updateSettings({ aspectRatio: aspect.value as '1:1' | '16:9' | '9:16' })
    setPrompt(img.prompt)
    setTimeout(() => generateImage(), 100)
  }, [generateImage, updateSettings])

  // Handle generate
  const handleGenerate = () => {
    if (activeTab === 'image') {
      generateImage()
    } else {
      generateVideo()
    }
  }

  // Handle API key change
  const handleApiKeyChange = (key: string) => {
    setApiKey(currentProviderId, key)
    setKeyStatus(currentProviderId, 'idle')
  }

  // Handle provider change
  const handleProviderChange = (providerId: string) => {
    if (activeTab === 'image') {
      updateSettings({ imageProvider: providerId })
    } else {
      updateSettings({ videoProvider: providerId })
    }
    setKeyStatus(providerId, 'idle')
  }

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0d0d0d] text-[#f0f0f0]' : 'bg-white text-zinc-900'
    )}>
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-xl',
        isDark ? 'border-[#2a2a2a] bg-[#0d0d0d]/90' : 'border-zinc-200 bg-white/90'
      )}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AI Studio</h1>
              <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                Generate images & videos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-lg"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className={cn(
            'inline-flex p-1.5 rounded-xl',
            isDark ? 'bg-[#161616]' : 'bg-zinc-100'
          )}>
            <button
              onClick={() => setActiveTab('image')}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeTab === 'image'
                  ? isDark
                    ? 'bg-[#6366f1] text-white shadow-lg'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Images
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={cn(
                'px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                activeTab === 'video'
                  ? isDark
                    ? 'bg-[#6366f1] text-white shadow-lg'
                    : 'bg-zinc-900 text-white shadow-sm'
                  : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <Video className="w-4 h-4" />
              Videos
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Provider Selection */}
            <Card className={cn(
              'p-5 border-0',
              isDark ? 'bg-[#161616]' : 'bg-zinc-50'
            )}>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-500">Provider</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderChange(p.id)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative flex items-center gap-2',
                      currentProviderId === p.id
                        ? isDark
                          ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-indigo-500 text-white shadow-sm'
                        : isDark
                          ? 'bg-[#1e1e1e] text-zinc-400 hover:text-white hover:bg-[#242424]'
                          : 'bg-white text-zinc-600 hover:bg-zinc-100'
                    )}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                    {p.popular && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-[#161616]" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* API Key Input */}
            <Card className={cn(
              'p-5 border-0',
              isDark ? 'bg-[#161616]' : 'bg-zinc-50'
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium">API Key</span>
                  {currentKeyStatus === 'valid' && (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                  {currentKeyStatus === 'invalid' && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3" /> Invalid
                    </span>
                  )}
                </div>
                <a
                  href={PROVIDER_URLS[currentProviderId]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Get key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder={`Enter your ${currentProvider?.name} API key`}
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className={cn(
                      'pr-10 h-11',
                      isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] focus:border-indigo-500' : 'bg-white'
                    )}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={testApiKey}
                  disabled={!apiKey.trim()}
                  className={cn(
                    'h-11 px-4',
                    isDark && 'border-[#2a2a2a] hover:bg-[#242424]'
                  )}
                >
                  Test
                </Button>
              </div>
              <p className={cn(
                'text-xs mt-2',
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              )}>
                Your API key is stored locally and never sent to our servers.
              </p>
            </Card>

            {/* Prompt Input */}
            <Card className={cn(
              'p-5 border-0 shadow-xl',
              isDark ? 'bg-[#161616]' : 'bg-white'
            )}>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'image'
                  ? 'A serene mountain landscape at golden hour with dramatic clouds...'
                  : 'A cat playing with a ball of yarn in slow motion, cinematic lighting...'
                }
                className={cn(
                  'min-h-[120px] resize-none border-0 text-base focus-visible:ring-0',
                  isDark ? 'bg-[#1e1e1e]' : 'bg-zinc-50'
                )}
                disabled={isGenerating}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[#2a2a2a]">
                {activeTab === 'image' && (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Aspect Ratio */}
                    <div className="flex gap-2">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar.value}
                          onClick={() => updateSettings({ aspectRatio: ar.value as '1:1' | '16:9' | '9:16' })}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            settings.aspectRatio === ar.value
                              ? isDark
                                ? 'bg-indigo-500 text-white'
                                : 'bg-indigo-500 text-white'
                              : isDark
                                ? 'bg-[#1e1e1e] text-zinc-400 hover:text-white'
                                : 'bg-zinc-100 text-zinc-600'
                          )}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'video' && (
                  <p className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  )}>
                    Video generation may take 1-5 minutes
                  </p>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || !apiKey.trim()}
                  className="px-8 h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {activeTab === 'image' ? 'Generating...' : 'Processing...'}
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

            {/* Results Grid */}
            {activeTab === 'image' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20">
                    <div className={cn(
                      'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                      isDark ? 'bg-[#161616]' : 'bg-zinc-100'
                    )}>
                      <ImageIcon className="w-7 h-7 text-zinc-500" />
                    </div>
                    <p className="text-zinc-500 text-sm">Generated images will appear here</p>
                  </div>
                ) : (
                  images.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'rounded-2xl overflow-hidden',
                        isDark ? 'bg-[#161616]' : 'bg-white shadow-lg'
                      )}
                    >
                      <div className="aspect-square relative group">
                        {item.loading && (
                          <div className={cn(
                            'absolute inset-0 flex items-center justify-center',
                            isDark ? 'bg-[#1e1e1e]' : 'bg-zinc-100'
                          )}>
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                              <span className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                                Generating...
                              </span>
                            </div>
                          </div>
                        )}

                        {item.error && (
                          <div className={cn(
                            'absolute inset-0 flex flex-col items-center justify-center gap-3',
                            isDark ? 'bg-[#1e1e1e]' : 'bg-zinc-100'
                          )}>
                            <AlertCircle className="w-8 h-8 text-red-400" />
                            <p className="text-sm text-zinc-500 text-center px-4">Failed to generate</p>
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

                        {item.image && !item.error && (
                          <>
                            <img
                              src={item.image}
                              alt={item.prompt}
                              className={cn(
                                'w-full h-full object-cover transition-opacity duration-300',
                                item.loading ? 'opacity-0' : 'opacity-100'
                              )}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-0 left-0 right-0 p-4">
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
                                    onClick={() => removeImage(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-4">
                        <p className={cn(
                          'text-sm line-clamp-2',
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        )}>
                          {item.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isDark ? 'bg-[#1e1e1e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                          )}>
                            {item.provider}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isDark ? 'bg-[#1e1e1e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                          )}>
                            {item.size}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'video' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20">
                    <div className={cn(
                      'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                      isDark ? 'bg-[#161616]' : 'bg-zinc-100'
                    )}>
                      <Video className="w-7 h-7 text-zinc-500" />
                    </div>
                    <p className="text-zinc-500 text-sm">Generated videos will appear here</p>
                  </div>
                ) : (
                  videos.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'rounded-2xl overflow-hidden',
                        isDark ? 'bg-[#161616]' : 'bg-white shadow-lg'
                      )}
                    >
                      <div className="aspect-video relative group">
                        {item.status === 'PROCESSING' && (
                          <div className={cn(
                            'absolute inset-0 flex flex-col items-center justify-center',
                            isDark ? 'bg-[#1e1e1e]' : 'bg-zinc-100'
                          )}>
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
                            <p className="text-sm text-zinc-500">Processing video...</p>
                            <p className="text-xs text-zinc-600 mt-1">This may take a few minutes</p>
                          </div>
                        )}

                        {item.status === 'FAIL' && (
                          <div className={cn(
                            'absolute inset-0 flex flex-col items-center justify-center gap-3',
                            isDark ? 'bg-[#1e1e1e]' : 'bg-zinc-100'
                          )}>
                            <AlertCircle className="w-10 h-10 text-red-400" />
                            <p className="text-sm text-zinc-500">Video generation failed</p>
                          </div>
                        )}

                        {item.status === 'SUCCESS' && item.videoUrl && (
                          <>
                            <video
                              src={item.videoUrl}
                              controls
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <div className="flex gap-2 pointer-events-auto">
                                  <Button
                                    size="sm"
                                    onClick={() => downloadVideo(item)}
                                    className="flex-1 bg-white/20 backdrop-blur hover:bg-white/30"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeVideo(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-4">
                        <p className={cn(
                          'text-sm line-clamp-2',
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        )}>
                          {item.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            item.status === 'SUCCESS'
                              ? 'bg-green-500/20 text-green-400'
                              : item.status === 'FAIL'
                                ? 'bg-red-500/20 text-red-400'
                                : isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                          )}>
                            {item.status === 'SUCCESS' ? 'Ready' : item.status === 'FAIL' ? 'Failed' : 'Processing'}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            isDark ? 'bg-[#1e1e1e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                          )}>
                            {item.provider}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={cn(
        'border-t py-6 mt-12',
        isDark ? 'border-[#2a2a2a]' : 'border-zinc-200'
      )}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className={cn(
            'text-xs',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            AI Studio — Bring your own API keys. Your data stays local.
          </p>
        </div>
      </footer>
    </div>
  )
}
