import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAIProviderStore } from '@/stores/ai-provider.store';
import { usePersonaStore } from '@/stores/persona.store';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Cpu,
  Users,
  Zap,
  Settings,
  Rocket,
  Cloud,
  Laptop,
  Eye,
  EyeOff,
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const steps = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'ai-provider', title: 'AI Setup', icon: Cpu },
  { id: 'persona', title: 'Persona', icon: Users },
  { id: 'ready', title: 'Ready', icon: Rocket },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const { providers, activeProvider, setActiveProvider, updateProviderConfig } = useAIProviderStore();
  const { personas, setCurrentPersona, currentPersona } = usePersonaStore();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Default personas for selection
  const defaultPersonas = [
    {
      id: 'auto',
      name: 'Soothsayer (Recommended)',
      icon: '🎯',
      description: 'Grounded assistant optimized to demo and guide this app end-to-end',
    },
    { id: 'staff-swe', name: 'Staff Engineer', icon: '👨‍💻', description: 'Senior technical expert for complex problems' },
    { id: 'product-manager', name: 'Product Manager', icon: '📊', description: 'Product strategy and requirements' },
    { id: 'devops-engineer', name: 'DevOps Engineer', icon: '🚀', description: 'CI/CD and infrastructure' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 animate-in zoom-in-95 duration-300">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Progress Bar */}
          <div className="flex border-b border-border">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-4 transition-colors',
                  index <= currentStep
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step 1: Welcome */}
            {currentStep === 0 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-2 text-3xl font-bold">Welcome to The Soothsayer</h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Your enterprise AI workspace for planning, execution, and automation
                </p>
                <div className="grid gap-4 text-left sm:grid-cols-3">
                  <div className="rounded-xl border border-border p-4 transition-colors hover:bg-accent/50">
                    <Cpu className="mb-2 h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold">AI-Powered</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your favorite AI models - local or cloud
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4 transition-colors hover:bg-accent/50">
                    <Users className="mb-2 h-8 w-8 text-purple-500" />
                    <h3 className="font-semibold">Persona Engine</h3>
                    <p className="text-sm text-muted-foreground">
                      30+ professional personas for every use case
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4 transition-colors hover:bg-accent/50">
                    <Zap className="mb-2 h-8 w-8 text-amber-500" />
                    <h3 className="font-semibold">Automation</h3>
                    <p className="text-sm text-muted-foreground">
                      Workflows, commands, and integrations
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: AI Provider Setup */}
            {currentStep === 1 && (
              <div>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold">Choose Your AI Provider</h2>
                  <p className="text-muted-foreground">
                    Connect to cloud AI or use local models for privacy
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Cloud Options */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Cloud className="h-4 w-4" />
                      Cloud Providers
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {providers.filter(p => !p.isLocal && p.id !== 'custom').slice(0, 4).map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setActiveProvider(provider.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                            activeProvider === provider.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <span className="text-2xl">{provider.icon}</span>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {provider.models.length} models
                            </div>
                          </div>
                          {activeProvider === provider.id && (
                            <Check className="ml-auto h-5 w-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Local Options */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Laptop className="h-4 w-4" />
                      Local Models (Private & Offline)
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {providers.filter(p => p.isLocal).map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setActiveProvider(provider.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                            activeProvider === provider.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <span className="text-2xl">{provider.icon}</span>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {provider.description}
                            </div>
                          </div>
                          {activeProvider === provider.id && (
                            <Check className="ml-auto h-5 w-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API Key Input */}
                  {!providers.find(p => p.id === activeProvider)?.isLocal && (
                    <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
                      <label className="mb-2 block text-sm font-medium">
                        API Key (Optional - can be added later)
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder={`Enter your ${providers.find(p => p.id === activeProvider)?.name} API key`}
                          value={providers.find(p => p.id === activeProvider)?.apiKey || ''}
                          onChange={(e) =>
                            updateProviderConfig(activeProvider, { apiKey: e.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Persona Selection */}
            {currentStep === 2 && (
              <div>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold">Select Your Default Persona</h2>
                  <p className="text-muted-foreground">
                    Personas customize AI behavior for your needs
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {defaultPersonas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => setCurrentPersona(persona as any)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                        currentPersona?.id === persona.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-3xl">{persona.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium">{persona.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {persona.description}
                        </div>
                      </div>
                      {currentPersona?.id === persona.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  You can switch personas anytime or create custom ones later
                </p>
              </div>
            )}

            {/* Step 4: Ready */}
            {currentStep === 3 && (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                  <Rocket className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-2 text-3xl font-bold">You're All Set!</h2>
                <p className="mb-8 text-lg text-muted-foreground">
                  Start exploring The Soothsayer
                </p>

                <div className="mb-8 rounded-xl border border-border bg-secondary/30 p-4 text-left">
                  <h3 className="mb-3 font-semibold">Quick Tips:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <kbd className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">⌘K</kbd>
                      <span>Open command palette for quick actions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-lg">💬</span>
                      <span>Start a chat to ask questions or generate code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-lg">🎭</span>
                      <span>Switch personas from the sidebar for different tasks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-lg">⚙️</span>
                      <span>Configure AI providers in Settings → AI Providers</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-8 py-4">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip setup
            </button>
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
