// AI Generator Types
// Single source of truth for all AI generation related types

export interface GeneratedImage {
  id: string
  image: string
  prompt: string
  size: string
  timestamp: string
}

export interface GeneratedVideo {
  id: string
  taskId: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  prompt: string
  videoUrl?: string
  timestamp: string
  quality: string
  duration: number
}

// API Request Types
export interface GenerateImageRequest {
  prompt: string
  size?: string
}

export interface GenerateVideoRequest {
  prompt: string
  quality?: 'speed' | 'quality'
  duration?: number
  fps?: number
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  timestamp: string
}

export interface ImageGenerationResponse {
  image: string
  prompt: string
  size: string
}

export interface VideoGenerationResponse {
  taskId: string
}

export interface VideoStatusResponse {
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  videoUrl?: string
}

// Configuration Types
export interface ImageSize {
  value: string
  label: string
  icon: string
}

export interface VideoDuration {
  value: string
  label: string
}

export interface VideoQuality {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// State Types
export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AIGeneratorState {
  // Image state
  imagePrompt: string
  imageSize: string
  isGeneratingImage: boolean
  generatedImages: GeneratedImage[]

  // Video state
  videoPrompt: string
  videoQuality: 'speed' | 'quality'
  videoDuration: 5 | 10
  isGeneratingVideo: boolean
  generatedVideos: GeneratedVideo[]
  pollingTaskId: string | null
  pollingProgress: number

  // UI state
  isDark: boolean
  copiedId: string | null
}
