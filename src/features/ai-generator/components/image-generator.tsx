'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Trash2,
  Copy,
  Check,
  Loader2,
  Palette,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { GeneratedImage, ImageSize } from '../types'

// Image size options
export const IMAGE_SIZES: ImageSize[] = [
  { value: '1024x1024', label: 'Square (1024×1024)', icon: '◻' },
  { value: '768x1344', label: 'Portrait (768×1344)', icon: '📱' },
  { value: '864x1152', label: 'Portrait (864×1152)', icon: '📳' },
  { value: '1344x768', label: 'Landscape (1344×768)', icon: '🖥' },
  { value: '1152x864', label: 'Landscape (1152×864)', icon: '💻' },
  { value: '1440x720', label: 'Wide (1440×720)', icon: '🎬' },
  { value: '720x1440', label: 'Tall (720×1440)', icon: '📲' }
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

interface ImageGeneratorProps {
  isDark: boolean
  generatedImages: GeneratedImage[]
  onGenerate: (prompt: string, size: string) => Promise<void>
  isGenerating: boolean
  onClear: () => void
}

// Utility function
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

export function ImageGenerator({
  isDark,
  generatedImages,
  onGenerate,
  isGenerating,
  onClear
}: ImageGeneratorProps) {
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageSize, setImageSize] = useState('1024x1024')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleGenerate = () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    onGenerate(imagePrompt.trim(), imageSize)
  }

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
    setImagePrompt(suggestion)
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
                disabled={isGenerating}
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
              onClick={handleGenerate}
              disabled={isGenerating || !imagePrompt.trim()}
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
                  onClick={() => applySuggestion(suggestion)}
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
      <ImageGallery
        isDark={isDark}
        images={generatedImages}
        copiedId={copiedId}
        onDownload={downloadImage}
        onCopy={copyPrompt}
        onDelete={(id) => onClear()}
        onClearAll={onClear}
      />
    </motion.div>
  )
}

// Separate gallery component for better organization
interface ImageGalleryProps {
  isDark: boolean
  images: GeneratedImage[]
  copiedId: string | null
  onDownload: (image: GeneratedImage) => void
  onCopy: (prompt: string, id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

function ImageGallery({
  isDark,
  images,
  copiedId,
  onDownload,
  onCopy,
  onDelete,
  onClearAll
}: ImageGalleryProps) {
  return (
    <motion.div variants={fadeInUp} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-violet-500" />
          Generated Images
        </h3>
        {images.length > 0 && (
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
        {images.length === 0 ? (
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
            {images.map((image) => (
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
                          onClick={() => onDownload(image)}
                          className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopy(image.prompt, image.id)}
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
                          onClick={() => onDelete(image.id)}
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
      </div>
    </motion.div>
  )
}
