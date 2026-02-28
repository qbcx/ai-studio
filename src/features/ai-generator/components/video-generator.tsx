'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Video,
  Download,
  Trash2,
  Copy,
  Check,
  Loader2,
  Film,
  Zap,
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { GeneratedVideo } from '../types'

// Video options
const VIDEO_DURATIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' }
] as const

const VIDEO_QUALITIES = [
  { value: 'speed', label: 'Speed (Fast)', icon: Zap },
  { value: 'quality', label: 'Quality (Best)', icon: Sparkles }
] as const

// Prompt suggestions
const VIDEO_PROMPT_SUGGESTIONS = [
  'A cat playing with a ball of yarn in slow motion',
  'Ocean waves crashing on a beach at sunset',
  'A flower blooming in time-lapse',
  'Northern lights dancing across the night sky',
  'Rain drops falling on a window pane',
  'A butterfly landing on a flower'
]

interface VideoGeneratorProps {
  isDark: boolean
  generatedVideos: GeneratedVideo[]
  onGenerate: (prompt: string, quality: 'speed' | 'quality', duration: number) => Promise<{ taskId: string } | null>
  isGenerating: boolean
  pollingProgress: number
  pollingTaskId: string | null
  onCheckStatus: (taskId: string) => Promise<{ status: string; videoUrl?: string } | null>
  onClear: () => void
  onUpdateVideo: (taskId: string, updates: Partial<GeneratedVideo>) => void
}

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

export function VideoGenerator({
  isDark,
  generatedVideos,
  onGenerate,
  isGenerating,
  pollingProgress,
  pollingTaskId,
  onCheckStatus,
  onClear,
  onUpdateVideo
}: VideoGeneratorProps) {
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoQuality, setVideoQuality] = useState<'speed' | 'quality'>('speed')
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    await onGenerate(videoPrompt.trim(), videoQuality, videoDuration)
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

  const applySuggestion = (suggestion: string) => {
    setVideoPrompt(suggestion)
  }

  return (
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
                disabled={isGenerating}
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
            {isGenerating && (
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
              onClick={handleGenerate}
              disabled={isGenerating || !videoPrompt.trim()}
              className={cn(
                'w-full h-14 rounded-xl text-base font-semibold',
                'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500',
                'hover:from-violet-600 hover:via-fuchsia-600 hover:to-pink-600',
                'shadow-lg shadow-violet-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
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
                  onClick={() => applySuggestion(suggestion)}
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
      <VideoGallery
        isDark={isDark}
        videos={generatedVideos}
        copiedId={copiedId}
        onDownload={downloadVideo}
        onCopy={copyPrompt}
        onDelete={() => onClear()}
        onClearAll={onClear}
      />
    </motion.div>
  )
}

// Separate gallery component
interface VideoGalleryProps {
  isDark: boolean
  videos: GeneratedVideo[]
  copiedId: string | null
  onDownload: (video: GeneratedVideo) => void
  onCopy: (prompt: string, id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function VideoGallery({
  isDark,
  videos,
  copiedId,
  onDownload,
  onCopy,
  onDelete,
  onClearAll
}: VideoGalleryProps) {
  return (
    <motion.div variants={fadeInUp} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Video className="w-5 h-5 text-violet-500" />
          Generated Videos
        </h3>
        {videos.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
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
        {videos.length === 0 ? (
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
            {videos.map((video) => (
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
                          onClick={() => onDownload(video)}
                          className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open Video
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopy(video.prompt, video.id)}
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
                          onClick={() => onDelete(video.id)}
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
      </div>
    </motion.div>
  )
}
