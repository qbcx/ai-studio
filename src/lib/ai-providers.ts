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
  // ===== FREE / FREEMIUM =====
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Free Stable Diffusion XL, no signup required',
    dashboardUrl: 'https://huggingface.co/settings/tokens',
    features: { image: true, video: false },
    pricing: { free: 'Free with rate limits', paid: 'Pro for higher limits' },
    popular: true,
    icon: '🤗'
  },
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
    id: 'seedance',
    name: 'Seedance 2.0',
    description: 'ByteDance video AI - cinematic quality',
    dashboardUrl: 'https://jimeng.jianying.com',
    features: { image: true, video: true },
    pricing: { free: '60-100 daily credits', paid: '¥69/month' },
    new: true,
    popular: true,
    icon: '🎬'
  },

  // ===== POPULAR PAID =====
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4V, DALL-E 3, Sora 2',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    features: { image: true, video: true },
    pricing: { paid: 'DALL-E: $0.02-0.12/img, Sora: $0.30-0.50/sec' },
    popular: true,
    icon: '🟢'
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'Best artistic image quality',
    dashboardUrl: 'https://www.midjourney.com',
    features: { image: true, video: false },
    pricing: { paid: '$10-60/month' },
    popular: true,
    icon: '🎨'
  },
  {
    id: 'runway',
    name: 'Runway Gen-3',
    description: 'Professional video generation',
    dashboardUrl: 'https://runwayml.com',
    features: { image: true, video: true },
    pricing: { free: '125 credits free', paid: '$12-76/month' },
    icon: '✈️'
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
  {
    id: 'pika',
    name: 'Pika Labs',
    description: 'Fast AI video generation',
    dashboardUrl: 'https://pika.art',
    features: { image: false, video: true },
    pricing: { free: 'Limited free tier', paid: '$8-58/month' },
    icon: '⚡'
  },
  {
    id: 'leonardo',
    name: 'Leonardo.ai',
    description: 'Creative AI with fine control',
    dashboardUrl: 'https://leonardo.ai',
    features: { image: true, video: true },
    pricing: { free: '150 daily tokens', paid: '$10-48/month' },
    icon: '🖼️'
  },
  {
    id: 'ideogram',
    name: 'Ideogram 2.0',
    description: 'Best text rendering in images',
    dashboardUrl: 'https://ideogram.ai',
    features: { image: true, video: false },
    pricing: { free: '10-20 free images/day', paid: '$8-20/month' },
    icon: '📝'
  },
  {
    id: 'recraft',
    name: 'Recraft V3',
    description: 'Professional vector & raster',
    dashboardUrl: 'https://www.recraft.ai',
    features: { image: true, video: false },
    pricing: { free: 'Free tier', paid: '$10-36/month' },
    icon: '🎭'
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion & SVD',
    dashboardUrl: 'https://platform.stability.ai',
    features: { image: true, video: true },
    pricing: { paid: '$0.002-0.04/image' },
    icon: '🎪'
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Run any open-source model',
    dashboardUrl: 'https://replicate.com',
    features: { image: true, video: true },
    pricing: { paid: 'Pay per second' },
    icon: '🔄'
  }
]

export function getProvider(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

export function getFreeProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.pricing.free)
}

export function getPopularProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.popular)
}

export function getNewProviders(): AIProvider[] {
  return AI_PROVIDERS.filter(p => p.new)
}
