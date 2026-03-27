import { Injectable } from '@nestjs/common';
import { DaxPersonaPreset, DaxRiskLevel } from '@soothsayer/types';

@Injectable()
export class PersonaMapperService {
  buildDaxPersonaPreset(
    persona: {
      id: string;
      name?: string;
      config?: unknown;
    },
    options: {
      provider?: string;
      model?: string;
    },
  ): DaxPersonaPreset {
    type DaxCapabilityClass = NonNullable<DaxPersonaPreset['preferredCapabilityClasses']>[number];

    const config =
      persona.config && typeof persona.config === 'object'
        ? (persona.config as Record<string, unknown>)
        : {};

    const expertiseTags = Array.isArray(config.expertiseTags)
      ? config.expertiseTags.filter((value): value is string => typeof value === 'string')
      : [];
    
    const verbosity = this.mapPersonaVerbosity(config.verbosityLevel);
    const tone = this.mapPersonaTone(config.communicationStyle);
    const riskLevel = this.mapPersonaRisk(config.riskTolerance);
    const approvalMode = this.mapApprovalMode(config.approvalDefaults);

    const preferredCapabilityClasses = new Set<DaxCapabilityClass>();
    for (const tag of expertiseTags) {
      const normalized = tag.toLowerCase();
      if (normalized.includes('architect') || normalized.includes('analysis')) preferredCapabilityClasses.add('analysis');
      if (normalized.includes('plan') || normalized.includes('roadmap') || normalized.includes('strategy'))
        preferredCapabilityClasses.add('planning');
      if (normalized.includes('code') || normalized.includes('backend') || normalized.includes('frontend'))
        preferredCapabilityClasses.add('code');
      if (normalized.includes('refactor')) preferredCapabilityClasses.add('refactor');
      if (normalized.includes('review') || normalized.includes('audit') || normalized.includes('security'))
        preferredCapabilityClasses.add('review');
      if (normalized.includes('docs') || normalized.includes('documentation')) preferredCapabilityClasses.add('docs');
      if (normalized.includes('shell') || normalized.includes('terminal') || normalized.includes('cli'))
        preferredCapabilityClasses.add('shell');
    }

    return {
      personaId: persona.id,
      providerHint: options.provider,
      modelHint: options.model,
      verbosity,
      tone,
      riskLevel,
      approvalMode,
      preferredCapabilityClasses: preferredCapabilityClasses.size > 0 
        ? Array.from(preferredCapabilityClasses) 
        : undefined,
    };
  }

  private mapPersonaVerbosity(level: unknown): DaxPersonaPreset['verbosity'] {
    const s = String(level).toLowerCase();
    if (s.includes('concise') || s.includes('low') || s.includes('brief')) return 'concise';
    if (s.includes('detailed') || s.includes('high') || s.includes('verbose')) return 'detailed';
    return 'balanced';
  }

  private mapPersonaTone(style: unknown): DaxPersonaPreset['tone'] {
    const s = String(style).toLowerCase();
    if (s.includes('technical') || s.includes('engineering')) return 'technical';
    if (s.includes('formal') || s.includes('professional')) return 'formal';
    if (s.includes('friendly') || s.includes('casual')) return 'friendly';
    return 'direct';
  }

  private mapPersonaRisk(tolerance: unknown): DaxRiskLevel {
    const s = String(tolerance).toLowerCase();
    if (s.includes('high') || s.includes('aggressive')) return 'high';
    if (s.includes('critical') || s.includes('extreme')) return 'critical';
    if (s.includes('low') || s.includes('conservative')) return 'low';
    return 'medium';
  }

  private mapApprovalMode(defaults: unknown): DaxPersonaPreset['approvalMode'] {
    if (!defaults || typeof defaults !== 'object') return 'strict';
    const d = defaults as Record<string, unknown>;
    const mode = String(d.mode || d.approvalMode).toLowerCase();
    if (mode.includes('relaxed') || mode.includes('auto')) return 'relaxed';
    if (mode.includes('balanced') || mode.includes('adaptive')) return 'balanced';
    return 'strict';
  }
}
