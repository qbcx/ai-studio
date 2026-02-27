'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Download,
  Trash2,
  Copy,
  Check,
  Loader2,
  Wand2,
  Palette,
  Clock,
  Film,
  Play,
  RefreshCw,
  Moon,
  Sun,
  Zap,
  Settings2,
  X,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Types
interface GeneratedImage {
  id: string
  image: string
  prompt: string
  size: string
  timestamp: string
}

interface GeneratedVideo {
  id: string
  taskId: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  prompt: string
  videoUrl?: string
  timestamp: string
  quality: string
  duration: number
}

// Supported sizes
const IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square (1024×1024)', icon: '◻' },
  { value: '768x1344', label: 'Portrait (768×1344)', icon: '📱' },
  { value: '864x1152', label: 'Portrait (864×1152)', icon: '📳' },
  { value: '1344x768', label: 'Landscape (1344×768)', icon: '🖥' },
  { value: '1152x864', label: 'Landscape (1152×864)', icon: '💻' },
  { value: '1440x720', label: 'Wide (1440×720)', icon: '🎬' },
  { value: '720x1440', label: 'Tall (720×1440)', icon: '📲' }
] as const

const VIDEO_DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' }
] as const

const VIDEO_QUALITIES = [
  { value: 'speed', label: 'Speed (Fast)', icon: Zap },
  { value: 'quality', label: 'Quality (Best)', icon: Sparkles }
] as const

// Prompt suggestions
const IMAGE_PROMPT_SUGGESTIONS = [
  'A serene mountain landscape at golden hour with dramatic clouds',
  'Futuristic cyberpunk city with neon lights and flying cars',
  'Cute fluffy cat wearing a tiny crown, royal portrait style',
  'Underwater coral reef teeming with colorful tropical fish',
  'Cozy cabin in snowy forest with warm light from windows',
  'Abstract geometric art with vibrant gradient colors'
]

const VIDEO_PROMPT_SUGGESTIONS = [
  'A cat playing with a ball of yarn in slow motion',
  'Ocean waves crashing on a beach at sunset',
  'A flower blooming in time-lapse',
  'Northern lights dancing across the night sky',
  'Rain drops falling on a window pane',
  'A butterfly landing on a flower'
]

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 15)

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function AIGeneratorPage() {
  // Theme state
  const [isDark, setIsDark] = useState(false)

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageSize, setImageSize] = useState('1024x1024')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])

  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoQuality, setVideoQuality] = useState<'speed' | 'quality'>('speed')
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null)
  const [pollingProgress, setPollingProgress] = useState(0)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Generate Image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGeneratingImage(true)
    const toastId = toast.loading('Generating your image...')

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          size: imageSize
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image')
      }

      const newImage: GeneratedImage = {
        id: generateId(),
        image: data.image,
        prompt: data.prompt,
        size: data.size,
        timestamp: data.timestamp
      }

      setGeneratedImages(prev => [newImage, ...prev])
      toast.success('Image generated successfully!', { id: toastId })
      setImagePrompt('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate image', { id: toastId })
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Generate Video
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGeneratingVideo(true)
    setPollingProgress(0)
    const toastId = toast.loading('Creating video task...')

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt.trim(),
          quality: videoQuality,
          duration: videoDuration,
          fps: 30
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create video task')
      }

      const newVideo: GeneratedVideo = {
        id: generateId(),
        taskId: data.taskId,
        status: 'PROCESSING',
        prompt: videoPrompt.trim(),
        timestamp: data.timestamp,
        quality: videoQuality,
        duration: videoDuration
      }

      setGeneratedVideos(prev => [newVideo, ...prev])
      setPollingTaskId(data.taskId)
      toast.success('Video task created! Processing...', { id: toastId })

      // Start polling
      pollVideoStatus(data.taskId, newVideo.id)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate video', { id: toastId })
      setIsGeneratingVideo(false)
    }
  }

  // Poll video status
  const pollVideoStatus = useCallback(async (taskId: string, videoId: string) => {
    const maxPolls = 60
    const pollInterval = 5000
    let pollCount = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/video-status?taskId=${taskId}`)
        const data = await response.json()

        pollCount++
        setPollingProgress(Math.min((pollCount / maxPolls) * 100, 95))

        if (data.status === 'SUCCESS' && data.videoUrl) {
          setGeneratedVideos(prev =>
            prev.map(v =>
              v.taskId === taskId
                ? { ...v, status: 'SUCCESS', videoUrl: data.videoUrl }
                : v
            )
          )
          toast.success('Video ready!')
          setIsGeneratingVideo(false)
          setPollingTaskId(null)
          setPollingProgress(100)
          return
        }

        if (data.status === 'FAIL') {
          setGeneratedVideos(prev =>
            prev.map(v =>
              v.taskId === taskId
                ? { ...v, status: 'FAIL' }
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
  }, [])

  // Download functions
  const downloadImage = async (image: GeneratedImage) => {
    try {
      const link = document.createElement('a')
      link.href = image.image
      link.download = `ai-image-${image.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Image downloaded!')
    } catch {
      toast.error('Failed to download image')
    }
  }

  const downloadVideo = async (video: GeneratedVideo) => {
    if (!video.videoUrl) return
    try {
      window.open(video.videoUrl, '_blank')
      toast.success('Opening video in new tab')
    } catch {
      toast.error('Failed to open video')
    }
  }

  // Copy prompt
  const copyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Prompt copied!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  // Delete functions
  const deleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id))
    toast.success('Image removed')
  }

  const deleteVideo = (id: string) => {
    setGeneratedVideos(prev => prev.filter(vid => vid.id !== id))
    toast.success('Video removed')
  }

  // Apply suggestion
  const applyImageSuggestion = (suggestion: string) => {
    setImagePrompt(suggestion)
  }

  const applyVideoSuggestion = (suggestion: string) => {
    setVideoPrompt(suggestion)
  }

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    )}>
      {/* Header */}
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

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Free to Use
              </Badge>
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
        </div>
      </header>

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
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Input Section */}
              <motion.div variants={fadeInUp} className="space-y-6">
                <Card className={cn(
                  'border-0 shadow-xl overflow-hidden',
                  isDark ? 'bg-white/5 backdrop-blur-sm' : 'bg-white'
                )}>
                  <div className="p-6 space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Palette className="w-4 h-4 text-violet-500" />
                        Describe your image
                      </Label>
                      <Textarea
                        placeholder="A serene mountain landscape at golden hour with dramatic clouds..."
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        className={cn(
                          'min-h-32 resize-none border-0 rounded-xl',
                          isDark ? 'bg-white/5' : 'bg-slate-50',
                          'focus:ring-2 focus:ring-violet-500/50'
                        )}
                        disabled={isGeneratingImage}
                      />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{imagePrompt.length} characters</span>
                        <span>Be descriptive for better results</span>
                      </div>
                    </div>

                    {/* Size Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-violet-500" />
                        Image Size
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {IMAGE_SIZES.map((size) => (
                          <Button
                            key={size.value}
                            variant={imageSize === size.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setImageSize(size.value)}
                            className={cn(
                              'justify-start h-auto py-2 px-3',
                              imageSize === size.value && 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-0'
                            )}
                          >
                            <span className="mr-2">{size.icon}</span>
                            <span className="text-xs">{size.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                      className={cn(
                        'w-full h-14 rounded-xl text-base font-semibold',
                        'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500',
                        'hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600',
                        'shadow-lg shadow-violet-500/25',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Image
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Suggestions */}
                <Card className={cn(
                  'border-0 shadow-lg',
                  isDark ? 'bg-white/5 backdrop-blur-sm' : 'bg-white'
                )}>
                  <div className="p-4 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Quick Prompts</Label>
                    <div className="flex flex-wrap gap-2">
                      {IMAGE_PROMPT_SUGGESTIONS.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => applyImageSuggestion(suggestion)}
                          className="text-xs h-auto py-1.5 px-3 rounded-full"
                        >
                          {suggestion.slice(0, 30)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Gallery Section */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-violet-500" />
                    Generated Images
                  </h3>
                  {generatedImages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedImages([])}
                      className="text-muted-foreground"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className={cn(
                  'rounded-2xl p-4 min-h-[400px]',
                  isDark ? 'bg-white/5' : 'bg-slate-50'
                )}>
                  <AnimatePresence mode="popLayout">
                    {generatedImages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-[350px] text-center"
                      >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
                          <ImageIcon className="w-10 h-10 text-violet-500/50" />
                        </div>
                        <p className="text-muted-foreground">Your generated images will appear here</p>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {generatedImages.map((image) => (
                          <motion.div
                            key={image.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                          >
                            <Card className={cn(
                              'overflow-hidden group',
                              isDark ? 'bg-white/5' : 'bg-white'
                            )}>
                              <div className="relative aspect-square">
                                <img
                                  src={image.image}
                                  alt={image.prompt}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => downloadImage(image)}
                                      className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyPrompt(image.prompt, image.id)}
                                      className="bg-white/20 backdrop-blur-sm border-white/20 hover:bg-white/30"
                                    >
                                      {copiedId === image.id ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteImage(image.id)}
                                      className="bg-red-500/80 hover:bg-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <CardContent className="p-3">
                                <p className="text-sm text-muted-foreground line-clamp-2">{image.prompt}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-xs">{image.size}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Video Generation Tab */}
          <TabsContent value="video" className="space-y-8">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Input Section */}
              <motion.div variants={fadeInUp} className="space-y-6">
                <Card className={cn(
                  'border-0 shadow-xl overflow-hidden',
                  isDark ? 'bg-white/5 backdrop-blur-sm' : 'bg-white'
                )}>
                  <div className="p-6 space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Film className="w-4 h-4 text-violet-500" />
                        Describe your video
                      </Label>
                      <Textarea
                        placeholder="A cat playing with a ball of yarn in slow motion..."
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        className={cn(
                          'min-h-32 resize-none border-0 rounded-xl',
                          isDark ? 'bg-white/5' : 'bg-slate-50',
                          'focus:ring-2 focus:ring-violet-500/50'
                        )}
                        disabled={isGeneratingVideo}
                      />
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Quality</Label>
                        <div className="flex gap-2">
                          {VIDEO_QUALITIES.map((q) => (
                            <Button
                              key={q.value}
                              variant={videoQuality === q.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setVideoQuality(q.value as 'speed' | 'quality')}
                              className={cn(
                                'flex-1',
                                videoQuality === q.value && 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-0'
                              )}
                            >
                              <q.icon className="w-4 h-4 mr-1" />
                              {q.label.split(' ')[0]}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Duration</Label>
                        <Select
                          value={videoDuration.toString()}
                          onValueChange={(v) => setVideoDuration(parseInt(v) as 5 | 10)}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_DURATIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Progress */}
                    {isGeneratingVideo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Processing video...</span>
                          <span className="text-muted-foreground">{pollingProgress.toFixed(0)}%</span>
                        </div>
                        <Progress value={pollingProgress} className="h-2" />
                      </div>
                    )}

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={isGeneratingVideo || !videoPrompt.trim()}
                      className={cn(
                        'w-full h-14 rounded-xl text-base font-semibold',
                        'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500',
                        'hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600',
                        'shadow-lg shadow-violet-500/25',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isGeneratingVideo ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Video className="w-5 h-5 mr-2" />
                          Generate Video
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Suggestions */}
                <Card className={cn(
                  'border-0 shadow-lg',
                  isDark ? 'bg-white/5 backdrop-blur-sm' : 'bg-white'
                )}>
                  <div className="p-4 space-y-3">
                    <Label className="text-sm font-medium text-muted-foreground">Quick Prompts</Label>
                    <div className="flex flex-wrap gap-2">
                      {VIDEO_PROMPT_SUGGESTIONS.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => applyVideoSuggestion(suggestion)}
                          className="text-xs h-auto py-1.5 px-3 rounded-full"
                        >
                          {suggestion.slice(0, 25)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Gallery Section */}
              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="w-5 h-5 text-violet-500" />
                    Generated Videos
                  </h3>
                  {generatedVideos.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedVideos([])}
                      className="text-muted-foreground"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                <div className={cn(
                  'rounded-2xl p-4 min-h-[400px]',
                  isDark ? 'bg-white/5' : 'bg-slate-50'
                )}>
                  <AnimatePresence mode="popLayout">
                    {generatedVideos.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-[350px] text-center"
                      >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
                          <Video className="w-10 h-10 text-violet-500/50" />
                        </div>
                        <p className="text-muted-foreground">Your generated videos will appear here</p>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {generatedVideos.map((video) => (
                          <motion.div
                            key={video.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                          >
                            <Card className={cn(
                              'overflow-hidden',
                              isDark ? 'bg-white/5' : 'bg-white'
                            )}>
                              <div className="p-4 space-y-4">
                                {/* Status */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {video.status === 'PROCESSING' && (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                        <span className="text-sm text-muted-foreground">Processing...</span>
                                      </>
                                    )}
                                    {video.status === 'SUCCESS' && (
                                      <>
                                        <Check className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-green-600">Ready</span>
                                      </>
                                    )}
                                    {video.status === 'FAIL' && (
                                      <>
                                        <X className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-600">Failed</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-xs">{video.quality}</Badge>
                                    <Badge variant="secondary" className="text-xs">{video.duration}s</Badge>
                                  </div>
                                </div>

                                {/* Video Preview / Placeholder */}
                                {video.status === 'SUCCESS' && video.videoUrl ? (
                                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                                    <video
                                      src={video.videoUrl}
                                      controls
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-video rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center">
                                    {video.status === 'PROCESSING' ? (
                                      <div className="text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">Creating your video...</p>
                                      </div>
                                    ) : video.status === 'FAIL' ? (
                                      <div className="text-center">
                                        <X className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                        <p className="text-sm text-red-500">Generation failed</p>
                                      </div>
                                    ) : null}
                                  </div>
                                )}

                                {/* Prompt */}
                                <p className="text-sm text-muted-foreground line-clamp-2">{video.prompt}</p>

                                {/* Actions */}
                                {video.status === 'SUCCESS' && video.videoUrl && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => downloadVideo(video)}
                                      className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Open Video
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyPrompt(video.prompt, video.id)}
                                    >
                                      {copiedId === video.id ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteVideo(video.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
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
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="w-4 h-4" />
              <span>Videos: 2-5 min</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>100% Free</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
