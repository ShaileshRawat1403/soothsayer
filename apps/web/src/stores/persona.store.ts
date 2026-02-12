import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Persona {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  capabilities: string[];
  preferredTools: string[];
  restrictions: string[];
  responseStyle: {
    tone: 'formal' | 'casual' | 'technical' | 'friendly';
    verbosity: 'concise' | 'balanced' | 'detailed';
    formatting: ('markdown' | 'code' | 'lists' | 'tables')[];
  };
  isDefault: boolean;
  isCustom: boolean;
  version: number;
}

const AUTO_PERSONA_OVERRIDE = {
  name: 'Soothsayer (Recommended)',
  category: 'Meta',
  description: 'Grounded assistant optimized to demo and guide the Soothsayer web app end-to-end.',
  icon: '🎯',
  systemPrompt: `You are Soothsayer, the Grounded One.

Identity and tone:
- Introduce yourself as "Soothsayer" when asked who you are.
- Be practical, clear, and concise.
- Do not be generic; give specific, actionable answers.

Primary job:
- Help users understand and demo the Soothsayer web app end-to-end.
- Explain features in product terms: Workspaces, Personas, AI Providers, Chat, Tools, Workflows, Analytics, Settings.
- When asked for a demo, provide a step-by-step walkthrough with exact clicks and expected outcomes.

Grounding rules:
- Never invent app features or states you cannot verify.
- If information is missing, say what is unknown and what to check next.
- Prefer deterministic guidance over vague suggestions.

Response style:
- Start with the direct answer.
- Then provide numbered steps.
- Include quick verification checks.
- Keep outputs short unless the user asks for detail.

Failure handling:
- If provider/model fails, identify likely root cause and provide concrete recovery steps.
- Distinguish configuration issues, quota/rate issues, and runtime/performance issues.

Safety:
- Do not expose secrets or keys.
- If asked to show keys, explain how to verify safely without revealing secret values.`,
};

interface PersonaState {
  personas: Persona[];
  currentPersona: Persona | null;
  selectedPersona: string | null;
  recommendedPersona: Persona | null;
  recentPersonas: string[];
  isLoading: boolean;
  
  // Actions
  setPersonas: (personas: Persona[]) => void;
  setCurrentPersona: (persona: Persona | null) => void;
  setSelectedPersona: (personaId: string | null) => void;
  setRecommendedPersona: (persona: Persona | null) => void;
  addToRecentPersonas: (personaId: string) => void;
  addPersona: (persona: Persona) => void;
  updatePersona: (id: string, data: Partial<Persona>) => void;
  removePersona: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set, get) => ({
      personas: [],
      currentPersona: null,
      selectedPersona: null,
      recommendedPersona: null,
      recentPersonas: [],
      isLoading: false,
      
      setPersonas: (personas) => set({ personas }),
      
      setCurrentPersona: (persona) => {
        if (persona) {
          const normalizedPersona =
            persona.id === 'auto' ? { ...persona, ...AUTO_PERSONA_OVERRIDE } : persona;
          get().addToRecentPersonas(normalizedPersona.id);
          set({ currentPersona: normalizedPersona });
          return;
        }
        set({ currentPersona: null });
      },
      
      setSelectedPersona: (personaId) => set({ selectedPersona: personaId }),
      
      setRecommendedPersona: (persona) => set({ recommendedPersona: persona }),
      
      addToRecentPersonas: (personaId) =>
        set((state) => {
          const filtered = state.recentPersonas.filter((id) => id !== personaId);
          return {
            recentPersonas: [personaId, ...filtered].slice(0, 5),
          };
        }),
      
      addPersona: (persona) =>
        set((state) => ({ personas: [...state.personas, persona] })),
      
      updatePersona: (id, data) =>
        set((state) => ({
          personas: state.personas.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
          currentPersona:
            state.currentPersona?.id === id
              ? { ...state.currentPersona, ...data }
              : state.currentPersona,
        })),
      
      removePersona: (id) =>
        set((state) => ({
          personas: state.personas.filter((p) => p.id !== id),
          currentPersona:
            state.currentPersona?.id === id ? null : state.currentPersona,
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'soothsayer-persona',
      partialize: (state) => ({
        currentPersona: state.currentPersona,
        selectedPersona: state.selectedPersona,
        recentPersonas: state.recentPersonas,
      }),
    }
  )
);
