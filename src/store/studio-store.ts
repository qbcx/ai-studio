// Zustand store for AI Studio - inspired by ContentMachine architecture
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface GeneratedImage {
  id: string
  image: string
  prompt: string
  size: string
  provider: string
  timestamp: string
  error?: boolean
  loading?: boolean
}

export interface GeneratedVideo {
  id: string
  taskId: string
  status: 'PROCESSING' | 'SUCCESS' | 'FAIL'
  videoUrl?: string
  prompt: string
  provider: string
  timestamp?: string
}

export interface Settings {
  imageProvider: string
  videoProvider: string
  imageModel: string
  videoModel: string
  aspectRatio: '1:1' | '16:9' | '9:16'
  removeWatermark: boolean
  prompt?: string
}

export interface ApiKeys {
  replicate?: string
  fal?: string
  gemini?: string
  zhipu?: string
  openai?: string
  stability?: string
  kling?: string
  runway?: string
}

interface StudioState {
  // UI State
  activeTab: 'image' | 'video'
  isDark: boolean

  // Generation State
  isGenerating: boolean
  progress: number

  // Assets
  images: GeneratedImage[]
  videos: GeneratedVideo[]

  // Settings
  settings: Settings
  apiKeys: ApiKeys

  // Key validation status
  keyStatus: Record<string, 'idle' | 'valid' | 'invalid'>

  // Actions
  setActiveTab: (tab: 'image' | 'video') => void
  toggleTheme: () => void
  setGenerating: (generating: boolean) => void
  setProgress: (progress: number) => void

  // Image actions
  addImage: (image: GeneratedImage) => void
  updateImage: (id: string, updates: Partial<GeneratedImage>) => void
  removeImage: (id: string) => void
  clearImages: () => void

  // Video actions
  addVideo: (video: GeneratedVideo) => void
  updateVideo: (id: string, updates: Partial<GeneratedVideo>) => void
  removeVideo: (id: string) => void
  clearVideos: () => void

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void
  setApiKey: (provider: string, key: string) => void
  getApiKey: (provider: string) => string | undefined
  setKeyStatus: (provider: string, status: 'idle' | 'valid' | 'invalid') => void
}

// Generate unique ID
const genId = () => `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      // Initial UI State
      activeTab: 'image',
      isDark: true,

      // Generation State
      isGenerating: false,
      progress: 0,

      // Assets
      images: [],
      videos: [],

      // Settings
      settings: {
        imageProvider: 'replicate',
        videoProvider: 'replicate',
        imageModel: 'flux-schnell',
        videoModel: 'ltx-video',
        aspectRatio: '1:1',
        removeWatermark: true,
      },

      // API Keys (persisted separately for security)
      apiKeys: {},

      // Key validation status
      keyStatus: {},

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),

      toggleTheme: () => set((state) => {
        const newDark = !state.isDark
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', newDark)
        }
        return { isDark: newDark }
      }),

      setGenerating: (generating) => set({ isGenerating: generating }),
      setProgress: (progress) => set({ progress }),

      // Image actions
      addImage: (image) => set((state) => ({
        images: [{ ...image, id: image.id || genId() }, ...state.images]
      })),

      updateImage: (id, updates) => set((state) => ({
        images: state.images.map((img) =>
          img.id === id ? { ...img, ...updates } : img
        )
      })),

      removeImage: (id) => set((state) => ({
        images: state.images.filter((img) => img.id !== id)
      })),

      clearImages: () => set({ images: [] }),

      // Video actions
      addVideo: (video) => set((state) => ({
        videos: [{ ...video, id: video.id || genId() }, ...state.videos]
      })),

      updateVideo: (id, updates) => set((state) => ({
        videos: state.videos.map((vid) =>
          vid.id === id ? { ...vid, ...updates } : vid
        )
      })),

      removeVideo: (id) => set((state) => ({
        videos: state.videos.filter((vid) => vid.id !== id)
      })),

      clearVideos: () => set({ videos: [] }),

      // Settings actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key }
      })),

      getApiKey: (provider) => get().apiKeys[provider],

      setKeyStatus: (provider, status) => set((state) => ({
        keyStatus: { ...state.keyStatus, [provider]: status }
      })),
    }),
    {
      name: 'ai-studio-storage',
      partialize: (state) => ({
        isDark: state.isDark,
        settings: state.settings,
        apiKeys: state.apiKeys,
        images: state.images.slice(0, 50), // Keep last 50 images
        videos: state.videos.slice(0, 20), // Keep last 20 videos
      }),
    }
  )
)

// Selector hooks for better performance
export const useActiveTab = () => useStudioStore((state) => state.activeTab)
export const useIsDark = () => useStudioStore((state) => state.isDark)
export const useIsGenerating = () => useStudioStore((state) => state.isGenerating)
export const useImages = () => useStudioStore((state) => state.images)
export const useVideos = () => useStudioStore((state) => state.videos)
export const useSettings = () => useStudioStore((state) => state.settings)
export const useApiKeys = () => useStudioStore((state) => state.apiKeys)
