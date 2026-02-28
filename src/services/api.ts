// API Service Layer - inspired by ContentMachine architecture
// Centralized API client with error handling and retries

const API_BASE = '/api'

// Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requiresKey?: boolean
  timestamp?: string
}

export interface ImageGenerationParams {
  prompt: string
  size?: string
  provider: string
  apiKey: string
  removeWatermark?: boolean
}

export interface VideoGenerationParams {
  prompt: string
  provider: string
  apiKey: string
  quality?: string
  duration?: number
}

export interface ImageResult {
  image: string
  prompt: string
  size: string
  predictionId?: string
  pollUrl?: string
}

export interface VideoResult {
  taskId: string
  pollUrl?: string
  videoUrl?: string
}

export interface StatusResult {
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  imageUrl?: string
  videoUrl?: string
}

// Error class for API errors
export class ApiError extends Error {
  status: number
  requiresKey?: boolean

  constructor(message: string, status: number, requiresKey?: boolean) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requiresKey = requiresKey
  }
}

// Base fetch with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    let data
    try {
      data = await response.json()
    } catch {
      throw new ApiError(`Server error: ${response.status}`, response.status)
    }

    if (!response.ok || !data.success) {
      // Provide user-friendly error messages
      let errorMessage = data.error || `Request failed (${response.status})`

      if (response.status === 402) {
        errorMessage = 'Insufficient credits. Please add billing to your account.'
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your key and try again.'
      } else if (response.status === 404) {
        errorMessage = 'API endpoint not found. The service may be unavailable.'
      } else if (response.status === 429) {
        errorMessage = 'Rate limited. Please wait a moment and try again.'
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.'
      }

      throw new ApiError(errorMessage, response.status, data.requiresKey)
    }

    return data as ApiResponse<T>
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error. Please check your connection.',
      0
    )
  }
}

// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      // Don't retry on auth errors
      if (error instanceof ApiError && error.status === 401) {
        throw error
      }

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// API Methods
export const api = {
  // Test API Key
  async testKey(provider: string, apiKey: string): Promise<boolean> {
    const response = await apiFetch('/test-key', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey }),
    })
    return response.success
  },

  // Generate Image
  async generateImage(params: ImageGenerationParams): Promise<ImageResult> {
    const response = await withRetry(() =>
      apiFetch<ImageResult>('/generate-image', {
        method: 'POST',
        body: JSON.stringify(params),
      })
    )
    return response.data!
  },

  // Generate Video
  async generateVideo(params: VideoGenerationParams): Promise<VideoResult> {
    const response = await apiFetch<VideoResult>('/generate-video', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return response.data!
  },

  // Check Image Status (for async providers like Replicate)
  async checkImageStatus(predictionId: string, apiKey: string): Promise<StatusResult> {
    const response = await apiFetch<StatusResult>(
      `/image-status?predictionId=${predictionId}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    )
    return response.data!
  },

  // Check Video Status
  async checkVideoStatus(taskId: string, provider: string, apiKey: string): Promise<StatusResult> {
    const response = await apiFetch<StatusResult>(
      `/video-status?taskId=${taskId}&provider=${provider}`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    )
    return response.data!
  },

  // Poll until complete
  async pollImageStatus(
    predictionId: string,
    apiKey: string,
    onProgress?: (status: string) => void,
    maxPolls = 60,
    pollInterval = 2000
  ): Promise<string> {
    for (let i = 0; i < maxPolls; i++) {
      const result = await api.checkImageStatus(predictionId, apiKey)

      if (result.status === 'SUCCESS' && result.imageUrl) {
        return result.imageUrl
      }

      if (result.status === 'FAIL') {
        throw new ApiError('Image generation failed', 500)
      }

      onProgress?.(result.status)
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new ApiError('Image generation timeout', 408)
  },

  // Poll video until complete
  async pollVideoStatus(
    taskId: string,
    provider: string,
    apiKey: string,
    onProgress?: (status: string) => void,
    maxPolls = 60,
    pollInterval = 5000
  ): Promise<string> {
    for (let i = 0; i < maxPolls; i++) {
      const result = await api.checkVideoStatus(taskId, provider, apiKey)

      if (result.status === 'SUCCESS' && result.videoUrl) {
        return result.videoUrl
      }

      if (result.status === 'FAIL') {
        throw new ApiError('Video generation failed', 500)
      }

      onProgress?.(result.status)
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new ApiError('Video generation timeout', 408)
  },
}

export default api
