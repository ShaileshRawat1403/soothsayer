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

interface PersonaState {
  personas: Persona[];
  currentPersona: Persona | null;
  recommendedPersona: Persona | null;
  recentPersonas: string[];
  isLoading: boolean;
  
  // Actions
  setPersonas: (personas: Persona[]) => void;
  setCurrentPersona: (persona: Persona | null) => void;
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
      recommendedPersona: null,
      recentPersonas: [],
      isLoading: false,
      
      setPersonas: (personas) => set({ personas }),
      
      setCurrentPersona: (persona) => {
        if (persona) {
          get().addToRecentPersonas(persona.id);
        }
        set({ currentPersona: persona });
      },
      
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
        recentPersonas: state.recentPersonas,
      }),
    }
  )
);
