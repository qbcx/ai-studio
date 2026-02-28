'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { GeneratedImage, GeneratedVideo } from '../types'

const generateId = () => Math.random().toString(36).substring(2, 15)

// Storage key for API keys
const API_KEYS_STORAGE = 'ai-studio-api-keys'

// Provider selection storage
const PROVIDER_STORAGE = 'ai-studio-providers'

interface ApiKeys {
  [key: string]: string
}

interface ProviderSettings {
  image: string
  video: string
}

export function useAIGenerator() {
  // Image state
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  // Video state
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null)
  const [pollingProgress, setPollingProgress] = useState(0)

  // Theme state
  const [isDark, setIsDark] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // API Keys & Provider settings
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [providers, setProviders] = useState<ProviderSettings>({
    image: 'pollinations',
    video: 'zhipu'
  })

  // Initialize from localStorage
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }

    // API Keys
    const savedKeys = localStorage.getItem(API_KEYS_STORAGE)
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys))
      } catch (e) {
        console.error('Failed to load API keys:', e)
      }
    }

    // Provider settings
    const savedProviders = localStorage.getItem(PROVIDER_STORAGE)
    if (savedProviders) {
      try {
        setProviders(JSON.parse(savedProviders))
      } catch (e) {
        console.error('Failed to load providers:', e)
      }
    }
  }, [])

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev
      if (newValue) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return newValue
    })
  }, [])

  // Update API keys
  const updateApiKeys = useCallback((keys: ApiKeys) => {
    setApiKeys(keys)
    localStorage.setItem(API_KEYS_STORAGE, JSON.stringify(keys))
  }, [])

  // Update provider selection
  const updateProvider = useCallback((type: 'image' | 'video', provider: string) => {
    const newProviders = { ...providers, [type]: provider }
    setProviders(newProviders)
    localStorage.setItem(PROVIDER_STORAGE, JSON.stringify(newProviders))
  }, [providers])

  // Generate Image
  const generateImage = useCallback(async (prompt: string, size: string) => {
    setIsGeneratingImage(true)
    const toastId = toast.loading('Generating your image...')

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          size,
          provider: providers.image,
          apiKey: apiKeys[providers.image] || null
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (data.requiresKey) {
          throw new Error(`API key required for ${providers.image}. Go to Settings to add your key.`)
        }
        throw new Error(data.error || 'Failed to generate image')
      }

      const newImage: GeneratedImage = {
        id: generateId(),
        image: data.data.image,
        prompt: data.data.prompt,
        size: data.data.size,
        timestamp: data.timestamp
      }

      setGeneratedImages(prev => [newImage, ...prev])
      toast.success(data.fallback ? 'Image generated (using fallback)' : 'Image generated!', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate image'
      toast.error(message, { id: toastId })
    } finally {
      setIsGeneratingImage(false)
    }
  }, [providers.image, apiKeys])

  // Generate Video
  const generateVideo = useCallback(async (
    prompt: string,
    quality: 'speed' | 'quality',
    duration: number
  ): Promise<{ taskId: string } | null> => {
    setIsGeneratingVideo(true)
    setPollingProgress(0)
    const toastId = toast.loading('Creating video task...')

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          quality,
          duration,
          provider: providers.video,
          apiKey: apiKeys[providers.video] || null
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        if (data.requiresKey) {
          throw new Error('Video generation requires an API key. Go to Settings to add your key.')
        }
        throw new Error(data.error || 'Failed to create video task')
      }

      const taskId = data.data.taskId

      const newVideo: GeneratedVideo = {
        id: generateId(),
        taskId,
        status: 'PROCESSING',
        prompt,
        timestamp: data.timestamp,
        quality,
        duration
      }

      setGeneratedVideos(prev => [newVideo, ...prev])
      setPollingTaskId(taskId)
      toast.success('Video task created! Processing...', { id: toastId })

      // Start polling
      pollVideoStatus(taskId, newVideo.id)

      return { taskId }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate video'
      toast.error(message, { id: toastId })
      setIsGeneratingVideo(false)
      return null
    }
  }, [providers.video, apiKeys])

  // Poll video status
  const pollVideoStatus = useCallback(async (taskId: string, videoId: string) => {
    const maxPolls = 60
    const pollInterval = 5000
    let pollCount = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/video-status?taskId=${taskId}&provider=${providers.video}`, {
          headers: {
            'X-API-Key': apiKeys[providers.video] || ''
          }
        })
        const data = await response.json()

        pollCount++
        setPollingProgress(Math.min((pollCount / maxPolls) * 100, 95))

        if (data.success && data.data?.status === 'SUCCESS' && data.data?.videoUrl) {
          setGeneratedVideos(prev =>
            prev.map(v =>
              v.taskId === taskId
                ? { ...v, status: 'SUCCESS' as const, videoUrl: data.data.videoUrl }
                : v
            )
          )
          toast.success('Video ready!')
          setIsGeneratingVideo(false)
          setPollingTaskId(null)
          setPollingProgress(100)
          return
        }

        if (data.success && data.data?.status === 'FAIL') {
          setGeneratedVideos(prev =>
            prev.map(v =>
              v.taskId === taskId
                ? { ...v, status: 'FAIL' as const }
                : v
            )
          )
          toast.error('Video generation failed')
          setIsGeneratingVideo(false)
          setPollingTaskId(null)
          return
        }

        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval)
        } else {
          toast.error('Video generation timeout')
          setIsGeneratingVideo(false)
          setPollingTaskId(null)
        }
      } catch (error) {
        console.error('Polling error:', error)
        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval)
        }
      }
    }

    poll()
  }, [providers.video, apiKeys])

  // Check video status manually
  const checkVideoStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/video-status?taskId=${taskId}&provider=${providers.video}`, {
        headers: {
          'X-API-Key': apiKeys[providers.video] || ''
        }
      })
      return await response.json()
    } catch (error) {
      console.error('Status check error:', error)
      return null
    }
  }, [providers.video, apiKeys])

  // Update video
  const updateVideo = useCallback((taskId: string, updates: Partial<GeneratedVideo>) => {
    setGeneratedVideos(prev =>
      prev.map(v => v.taskId === taskId ? { ...v, ...updates } : v)
    )
  }, [])

  // Clear functions
  const clearImages = useCallback(() => {
    setGeneratedImages([])
    toast.success('Images cleared')
  }, [])

  const clearVideos = useCallback(() => {
    setGeneratedVideos([])
    toast.success('Videos cleared')
  }, [])

  // Delete functions
  const deleteImage = useCallback((id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id))
    toast.success('Image removed')
  }, [])

  const deleteVideo = useCallback((id: string) => {
    setGeneratedVideos(prev => prev.filter(vid => vid.id !== id))
    toast.success('Video removed')
  }, [])

  return {
    // State
    isDark,
    generatedImages,
    generatedVideos,
    isGeneratingImage,
    isGeneratingVideo,
    pollingProgress,
    pollingTaskId,
    copiedId,
    apiKeys,
    providers,

    // Actions
    toggleTheme,
    generateImage,
    generateVideo,
    checkVideoStatus,
    updateVideo,
    clearImages,
    clearVideos,
    deleteImage,
    deleteVideo,
    setCopiedId,
    updateApiKeys,
    updateProvider
  }
}
