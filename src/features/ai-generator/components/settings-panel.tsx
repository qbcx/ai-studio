'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  X,
  Key,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AI_PROVIDERS, type AIProvider } from '@/lib/ai-providers'

interface ApiKeySettings {
  [key: string]: string
}

interface SettingsPanelProps {
  onSettingsChange?: (settings: ApiKeySettings) => void
  isDark: boolean
}

const STORAGE_KEY = 'ai-studio-api-keys'

export function SettingsPanel({ onSettingsChange, isDark }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKeySettings>({})
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  // Load API keys from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setApiKeys(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load API keys:', e)
      }
    }
  }, [])

  // Save API keys to localStorage
  const saveKeys = (keys: ApiKeySettings) => {
    setApiKeys(keys)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
    onSettingsChange?.(keys)
  }

  const updateKey = (providerId: string, value: string) => {
    saveKeys({ ...apiKeys, [providerId]: value })
  }

  const deleteKey = (providerId: string) => {
    const newKeys = { ...apiKeys }
    delete newKeys[providerId]
    saveKeys(newKeys)
  }

  const toggleKeyVisibility = (providerId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(providerId)) {
      newVisible.delete(providerId)
    } else {
      newVisible.add(providerId)
    }
    setVisibleKeys(newVisible)
  }

  const hasKey = (providerId: string) => {
    return !!apiKeys[providerId] && apiKeys[providerId].length > 0
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className={cn(
        'max-w-3xl max-h-[90vh] overflow-y-auto',
        isDark ? 'bg-[#0f0f15] border-white/10' : 'bg-white'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5" />
            AI Provider Settings
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure your API keys for different AI providers. Keys are stored locally in your browser.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Free Providers Info */}
          <Card className={cn(
            'border-green-500/30 bg-green-500/5',
            isDark && 'bg-green-500/10'
          )}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎉</div>
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400">Free Tier Available</h4>
                  <p className="text-sm text-muted-foreground">
                    Pollinations.ai works without any API key! Just start generating images.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider List */}
          <div className="space-y-3">
            {AI_PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                apiKey={apiKeys[provider.id] || ''}
                hasKey={hasKey(provider.id)}
                isKeyVisible={visibleKeys.has(provider.id)}
                isExpanded={selectedProvider === provider.id}
                isDark={isDark}
                onUpdateKey={(value) => updateKey(provider.id, value)}
                onDeleteKey={() => deleteKey(provider.id)}
                onToggleVisibility={() => toggleKeyVisibility(provider.id)}
                onToggleExpand={() => setSelectedProvider(
                  selectedProvider === provider.id ? null : provider.id
                )}
              />
            ))}
          </div>

          {/* Security Notice */}
          <Card className={cn(
            'border-amber-500/30 bg-amber-500/5',
            isDark && 'bg-amber-500/10'
          )}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Security Notice</p>
                  <p className="text-muted-foreground">
                    API keys are stored in your browser's localStorage. Never share your keys or use this on a public computer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Individual Provider Card
interface ProviderCardProps {
  provider: AIProvider
  apiKey: string
  hasKey: boolean
  isKeyVisible: boolean
  isExpanded: boolean
  isDark: boolean
  onUpdateKey: (value: string) => void
  onDeleteKey: () => void
  onToggleVisibility: () => void
  onToggleExpand: () => void
}

function ProviderCard({
  provider,
  apiKey,
  hasKey,
  isKeyVisible,
  isExpanded,
  isDark,
  onUpdateKey,
  onDeleteKey,
  onToggleVisibility,
  onToggleExpand
}: ProviderCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-200',
      isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200',
      hasKey && 'border-green-500/30'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{provider.name}</h4>
                {hasKey && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {!provider.requiresKey && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                    Free
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{provider.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={provider.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                {/* Features & Pricing */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium mb-1">Features</p>
                    <div className="flex gap-2">
                      {provider.features.image && (
                        <Badge variant="secondary" className="text-xs">Image</Badge>
                      )}
                      {provider.features.video && (
                        <Badge variant="secondary" className="text-xs">Video</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Pricing</p>
                    <p className="text-muted-foreground text-xs">
                      {provider.pricing.free || provider.pricing.image}
                    </p>
                  </div>
                </div>

                {/* Models */}
                <div className="text-sm">
                  <p className="font-medium mb-1">Available Models</p>
                  <div className="flex flex-wrap gap-1">
                    {[...(provider.models.image || []), ...(provider.models.video || [])].map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                {provider.requiresKey && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      API Key
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={isKeyVisible ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => onUpdateKey(e.target.value)}
                          placeholder={`Enter your ${provider.name} API key`}
                          className={cn(
                            'pr-10',
                            isDark ? 'bg-white/5' : 'bg-white'
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={onToggleVisibility}
                        >
                          {isKeyVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {apiKey && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={onDeleteKey}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <a
                      href={provider.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-violet-500 hover:underline"
                    >
                      Get your API key from {provider.name} dashboard
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Free Provider Message */}
                {!provider.requiresKey && (
                  <div className="p-3 rounded-lg bg-green-500/10 text-sm text-green-600 dark:text-green-400">
                    ✓ No API key required! This provider is free to use.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// Hook to get API keys from localStorage
export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeySettings>({})

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setApiKeys(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load API keys:', e)
      }
    }
  }, [])

  const getKey = (providerId: string): string | undefined => {
    return apiKeys[providerId]
  }

  const hasKey = (providerId: string): boolean => {
    return !!apiKeys[providerId] && apiKeys[providerId].length > 0
  }

  return { apiKeys, getKey, hasKey }
}
