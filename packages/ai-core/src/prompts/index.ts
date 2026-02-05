// Prompt Templates for The Soothsayer

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
}

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Code Generation
  CODE_GENERATE: {
    id: 'code-generate',
    name: 'Code Generator',
    description: 'Generate code based on requirements',
    template: `Generate {{language}} code for the following requirement:

Requirements:
{{requirements}}

Constraints:
- Follow best practices for {{language}}
- Include error handling
- Add appropriate comments
- Consider edge cases

{{#if context}}
Existing Context:
{{context}}
{{/if}}

Please provide clean, production-ready code.`,
    variables: ['language', 'requirements', 'context'],
    category: 'engineering',
  },

  CODE_REVIEW: {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for issues and improvements',
    template: `Review the following {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Please analyze:
1. **Bugs & Issues**: Identify any bugs or potential issues
2. **Security**: Check for security vulnerabilities
3. **Performance**: Identify performance concerns
4. **Best Practices**: Suggest improvements based on {{language}} best practices
5. **Readability**: Comment on code clarity and maintainability

Provide specific, actionable feedback with code examples where helpful.`,
    variables: ['language', 'code'],
    category: 'engineering',
  },

  // Business
  PRD_GENERATE: {
    id: 'prd-generate',
    name: 'PRD Generator',
    description: 'Generate a Product Requirements Document',
    template: `Generate a Product Requirements Document (PRD) for:

**Product/Feature Name**: {{name}}
**Problem Statement**: {{problem}}
**Target Users**: {{users}}

Include the following sections:
1. Executive Summary
2. Problem Statement & Opportunity
3. Goals & Success Metrics
4. User Stories & Requirements
5. Technical Considerations
6. Timeline & Milestones
7. Risks & Mitigations
8. Open Questions

{{#if additionalContext}}
Additional Context:
{{additionalContext}}
{{/if}}`,
    variables: ['name', 'problem', 'users', 'additionalContext'],
    category: 'business',
  },

  MEETING_NOTES: {
    id: 'meeting-notes',
    name: 'Meeting Notes Processor',
    description: 'Process meeting notes into action items',
    template: `Process the following meeting notes and extract:

**Meeting Notes**:
{{notes}}

**Attendees** (if known): {{attendees}}

Please provide:
1. **Summary**: Brief 2-3 sentence summary of the meeting
2. **Key Decisions**: List of decisions made
3. **Action Items**: Extracted action items with:
   - Task description
   - Owner (if mentioned)
   - Due date (if mentioned)
   - Priority (High/Medium/Low)
4. **Open Questions**: Unresolved questions or topics for follow-up
5. **Next Steps**: Recommended next steps`,
    variables: ['notes', 'attendees'],
    category: 'business',
  },

  // Data Analysis
  SQL_ASSISTANT: {
    id: 'sql-assistant',
    name: 'SQL Assistant',
    description: 'Help write and optimize SQL queries',
    template: `Help with the following SQL task:

**Database**: {{database}}
**Task**: {{task}}

{{#if schema}}
**Schema Information**:
{{schema}}
{{/if}}

{{#if existingQuery}}
**Existing Query**:
\`\`\`sql
{{existingQuery}}
\`\`\`
{{/if}}

Please provide:
1. The SQL query to accomplish the task
2. Explanation of the query logic
3. Performance considerations
4. Any potential edge cases to consider

Ensure the query follows best practices for {{database}}.`,
    variables: ['database', 'task', 'schema', 'existingQuery'],
    category: 'data',
  },

  // Security
  SECURITY_REVIEW: {
    id: 'security-review',
    name: 'Security Review',
    description: 'Review code or configuration for security issues',
    template: `Perform a security review of the following:

**Type**: {{type}}
**Content**:
\`\`\`
{{content}}
\`\`\`

Please check for:
1. **Common Vulnerabilities**: OWASP Top 10, CWE/SANS Top 25
2. **Input Validation**: Proper sanitization and validation
3. **Authentication/Authorization**: Access control issues
4. **Data Exposure**: Sensitive data handling
5. **Dependencies**: Known vulnerable dependencies (if applicable)
6. **Configuration**: Insecure configurations

For each issue found:
- Severity (Critical/High/Medium/Low)
- Description
- Location
- Remediation recommendation`,
    variables: ['type', 'content'],
    category: 'security',
  },
};

// Template processor
export function processTemplate(
  templateId: string,
  variables: Record<string, string>
): string {
  const template = PROMPT_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  let processed = template.template;

  // Process conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  processed = processed.replace(conditionalRegex, (_, varName, content) => {
    return variables[varName] ? content : '';
  });

  // Process simple variables {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processed = processed.replace(regex, value);
  });

  return processed.trim();
}

// Chain prompts for multi-step workflows
export interface PromptChain {
  id: string;
  name: string;
  steps: Array<{
    templateId: string;
    variableMapping: Record<string, string>;
    outputVariable: string;
  }>;
}

export function executePromptChain(
  chain: PromptChain,
  initialVariables: Record<string, string>
): string[] {
  const results: string[] = [];
  let variables = { ...initialVariables };

  for (const step of chain.steps) {
    const mappedVariables: Record<string, string> = {};
    
    for (const [templateVar, sourceVar] of Object.entries(step.variableMapping)) {
      mappedVariables[templateVar] = variables[sourceVar] || '';
    }

    const result = processTemplate(step.templateId, mappedVariables);
    results.push(result);
    
    // Store result for next step
    variables[step.outputVariable] = result;
  }

  return results;
}
