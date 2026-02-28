// AI Provider Configuration
// Contains all supported AI providers with their costs, features, and dashboard links

export interface AIProvider {
  id: string
  name: string
  description: string
  dashboardUrl: string
  docsUrl?: string
  features: {
    image: boolean
    video: boolean
  }
  pricing: {
    image?: string
    video?: string
    free?: string
  }
  models: {
    image?: string[]
    video?: string[]
  }
  requiresKey: boolean
  icon: string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'pollinations',
    name: 'Pollinations.ai',
    description: 'Free AI image generation - no API key required',
    dashboardUrl: 'https://pollinations.ai',
    docsUrl: 'https://github.com/pollinations/pollinations',
    features: {
      image: true,
      video: false
    },
    pricing: {
      image: '100% Free',
      free: 'Unlimited image generation'
    },
    models: {
      image: ['flux', 'turbo']
    },
    requiresKey: false,
    icon: '🌸'
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI (BigModel)',
    description: 'Chinese AI provider with GLM models and CogVideoX',
    dashboardUrl: 'https://open.bigmodel.cn',
    docsUrl: 'https://open.bigmodel.cn/dev/api',
    features: {
      image: true,
      video: true
    },
    pricing: {
      image: 'Free tier available',
      video: '~¥0.5-2 per video'
    },
    models: {
      image: ['cogview-3-plus'],
      video: ['cogvideox']
    },
    requiresKey: true,
    icon: '🤖'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 and DALL-E models for image generation',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    features: {
      image: true,
      video: false
    },
    pricing: {
      image: '$0.02-0.12 per image (DALL-E 3)',
      free: 'Free credits for new accounts'
    },
    models: {
      image: ['dall-e-3', 'dall-e-2']
    },
    requiresKey: true,
    icon: '🟢'
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion and Stable Video Diffusion',
    dashboardUrl: 'https://platform.stability.ai/account/keys',
    docsUrl: 'https://platform.stability.ai/docs',
    features: {
      image: true,
      video: true
    },
    pricing: {
      image: '$0.002-0.04 per image',
      video: '$0.10-0.50 per video'
    },
    models: {
      image: ['stable-diffusion-xl', 'stable-diffusion-3'],
      video: ['stable-video-diffusion']
    },
    requiresKey: true,
    icon: '🎨'
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Run open-source AI models with pay-per-second pricing',
    dashboardUrl: 'https://replicate.com/account/api-tokens',
    docsUrl: 'https://replicate.com/docs',
    features: {
      image: true,
      video: true
    },
    pricing: {
      image: '$0.01-0.10 per image',
      video: '$0.05-0.50 per video'
    },
    models: {
      image: ['flux-schnell', 'flux-dev', 'sdxl'],
      video: ['stable-video-diffusion', 'cogvideox']
    },
    requiresKey: true,
    icon: '🔄'
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Fast inference for open-source models',
    dashboardUrl: 'https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai',
    features: {
      image: true,
      video: false
    },
    pricing: {
      image: '$0.002-0.08 per image',
      free: '$1 free credits'
    },
    models: {
      image: ['flux-schnell', 'stable-diffusion-xl']
    },
    requiresKey: true,
    icon: '⚡'
  },
  {
    id: 'fal',
    name: 'Fal.ai',
    description: 'Fast AI inference with optimized models',
    dashboardUrl: 'https://fal.ai/dashboard/keys',
    docsUrl: 'https://fal.ai/docs',
    features: {
      image: true,
      video: true
    },
    pricing: {
      image: '$0.005-0.05 per image',
      video: '$0.10-0.30 per video'
    },
    models: {
      image: ['flux', 'sdxl-turbo'],
      video: ['stable-video']
    },
    requiresKey: true,
    icon: '🦅'
  }
]

// Helper to get provider by ID
export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

// Helper to get providers by feature
export function getProvidersByFeature(feature: 'image' | 'video'): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.features[feature])
}

// Free providers (no API key needed)
export function getFreeProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => !p.requiresKey)
}
