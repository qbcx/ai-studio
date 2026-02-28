// AI Provider Configuration
// Supported providers with costs, features, and dashboard links
// Note: Users must provide their own API keys

export interface AIProvider {
  id: string
  name: string
  description: string
  dashboardUrl: string
  features: {
    image: boolean
    video: boolean
    audio?: boolean
  }
  pricing: {
    free?: string
    paid?: string
  }
  popular?: boolean
  new?: boolean
  icon: string
}

export const AI_PROVIDERS: AIProvider[] = [
  // ===== RECOMMENDED =====
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Flux, LTX-2, Kling - best quality',
    dashboardUrl: 'https://replicate.com/account/api-tokens',
    features: { image: true, video: true },
    pricing: { paid: 'Pay per use (~$0.01-0.10/image, ~$0.10-0.30/video)' },
    popular: true,
    icon: '🔄'
  },
  {
    id: 'fal',
    name: 'fal.ai',
    description: 'Flux Pro, LTX-2 - fast & reliable',
    dashboardUrl: 'https://fal.ai/dashboard/keys',
    features: { image: true, video: true },
    pricing: { free: 'Free credits', paid: 'Pay per use' },
    new: true,
    popular: true,
    icon: '⚡'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Imagen 4, Gemini 2.5 - Google quality',
    dashboardUrl: 'https://aistudio.google.com/api-keys',
    features: { image: true, video: false },
    pricing: { free: 'Generous free tier', paid: 'Pay per use' },
    popular: true,
    icon: '✨'
  },

  // ===== CHINA / ASIA =====
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    description: 'GLM & CogView/CogVideoX models',
    dashboardUrl: 'https://open.bigmodel.cn',
    features: { image: true, video: true },
    pricing: { free: 'Free tier available', paid: 'Pay per use' },
    icon: '🤖'
  },
  {
    id: 'kling',
    name: 'Kling AI',
    description: 'High quality video generation',
    dashboardUrl: 'https://klingai.com',
    features: { image: false, video: true },
    pricing: { free: 'Daily free credits', paid: 'Subscription' },
    new: true,
    icon: '🎥'
  },

  // ===== POPULAR PAID =====
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'DALL-E 3, GPT-4V',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    features: { image: true, video: false },
    pricing: { paid: 'DALL-E: $0.02-0.12/img' },
    popular: true,
    icon: '🟢'
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion 3.5',
    dashboardUrl: 'https://platform.stability.ai',
    features: { image: true, video: false },
    pricing: { paid: '$0.002-0.04/image' },
    icon: '🎪'
  },
  {
    id: 'runway',
    name: 'Runway Gen-3',
    description: 'Professional video generation',
    dashboardUrl: 'https://runwayml.com',
    features: { image: false, video: true },
    pricing: { free: '125 credits free', paid: '$12-76/month' },
    icon: '✈️'
  },

  // ===== AUDIO =====
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Best TTS & voice cloning',
    dashboardUrl: 'https://elevenlabs.io/app/settings/api-keys',
    features: { image: false, video: false, audio: true },
    pricing: { free: '10k chars/month', paid: '$5-330/month' },
    icon: '🎙️'
  },
]

export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

export function getImageProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.features.image)
}

export function getVideoProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.features.video)
}

export function getAudioProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.features.audio)
}

export function getPopularProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.popular)
}

export function getNewProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.new)
}
