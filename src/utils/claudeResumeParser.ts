import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';
import { extractTextFromPDF } from './parseResume';

interface SuccessProfileContext {
  role: { title: string; level: string; class: string };
  requiredExperiences: Array<{
    category: string;
    name: string;
    description: string;
    minYears: number;
    isRequired: boolean;
    achieved: boolean;
    badgeIcon: string;
  }>;
  toolbox: ToolCategory[];
  attributeConfig?: AttributeConfig[];
}

interface ClaudeResumeResponse {
  name: string;
  currentRole: string;
  yearsExperience: number;
  attributes: {
    [key: string]: number;
  };
  experiences: Array<{
    name: string;
    achieved: boolean;
    relevance: string;
  }>;
  skillProficiencies: Array<{
    toolName: string;
    achieved: boolean;
    evidence: string;
  }>;
  summary: string;
}

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export async function parseResumeWithClaude(
  file: File,
  apiKey: string,
  successProfile: SuccessProfileContext
): Promise<CandidateProfile> {
  // Extract text from PDF
  const resumeText = await extractTextFromPDF(file);

  // Build the prompt for Claude
  const prompt = buildClaudePrompt(resumeText, successProfile, file.name);

  // Call Claude API
  const response = await callClaudeAPI(apiKey, prompt);

  // Parse the response and build CandidateProfile
  return buildCandidateProfile(response, successProfile);
}

function buildClaudePrompt(
  resumeText: string,
  successProfile: SuccessProfileContext,
  fileName: string
): string {
  // Build detailed experiences list with matching guidance
  const experiencesList = successProfile.requiredExperiences
    .map((exp) => {
      // Add matching hints for common experience types
      const matchingHints = getExperienceMatchingHints(exp.name);
      return `- "${exp.name}" (${exp.category}, ${exp.minYears}+ years): ${exp.description}
    Look for: ${matchingHints}`;
    })
    .join('\n');

  // Build detailed tools list with matching guidance
  const toolsList = successProfile.toolbox
    .flatMap((cat) => cat.tools.map((t) => {
      const matchingHints = getToolMatchingHints(t.name);
      return `- "${t.name}" (${cat.category}): Look for: ${matchingHints}`;
    }))
    .join('\n');

  // Build dynamic attributes list from attributeConfig
  const attributesList = successProfile.attributeConfig
    ? successProfile.attributeConfig.map((attr) => `- ${attr.key}: ${attr.label}`).join('\n')
    : `- problemSolving: Problem Solving
- stakeholderManagement: Stakeholder Management
- technicalExpertise: Technical Expertise
- leadership: Leadership
- customerFocus: Customer Focus
- adaptability: Adaptability`;

  // Build expected attributes JSON structure
  const attributeKeysJson = successProfile.attributeConfig
    ? successProfile.attributeConfig.map((attr) => `    "${attr.key}": <0-100>`).join(',\n')
    : `    "problemSolving": <0-100>,
    "stakeholderManagement": <0-100>,
    "technicalExpertise": <0-100>,
    "leadership": <0-100>,
    "customerFocus": <0-100>,
    "adaptability": <0-100>`;

  return `You are an expert HR analyst evaluating a resume against a success profile for the role: "${successProfile.role.title}".

## Resume Content:
${resumeText}

## Success Profile Requirements:

### Required Experiences (match these from the resume):
${experiencesList}

### Required Skill Proficiencies/Tools (match these from the resume):
${toolsList}

### Attribute Categories to Score:
${attributesList}

## CRITICAL Matching Instructions:

### For EXPERIENCES - Mark as "achieved: true" if ANY of these apply:
1. The candidate has a job title that implies the experience (e.g., "Team Lead" = Team Management, "Consultant" = Consulting)
2. The resume describes responsibilities matching the experience (e.g., "led a team of X people" = Team Management)
3. The resume mentions projects or achievements related to the experience
4. Use SEMANTIC matching - look for synonyms and related concepts, not just exact keywords

### For SKILL PROFICIENCIES - Mark as "achieved: true" if ANY of these apply:
1. The skill or tool is explicitly mentioned in the resume
2. The candidate's job responsibilities clearly require using such a skill
3. Related or equivalent tools/skills are mentioned
4. The context of their work implies usage of the skill

### IMPORTANT: Be GENEROUS in matching!
- If a resume says "led team of 20 staff" → Team Management = achieved
- If a resume says "Organization Effectiveness Consultant" → Consulting = achieved
- If a resume says "led initiative to improve processes" → Process Improvement = achieved
- If a resume says "partner with business leaders" → Stakeholder Engagement/Management = achieved

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Full name of the candidate",
  "currentRole": "Current or most recent job title",
  "yearsExperience": <total years of professional experience>,
  "attributes": {
${attributeKeysJson}
  },
  "experiences": [
    {
      "name": "<EXACT name from required experiences above>",
      "achieved": <true if ANY evidence found, false only if NO evidence>,
      "relevance": "<quote or describe specific evidence from resume>"
    }
  ],
  "skillProficiencies": [
    {
      "toolName": "<EXACT tool name from required tools above>",
      "achieved": <true if ANY evidence found, false only if NO evidence>,
      "evidence": "<quote or describe specific evidence from resume>"
    }
  ],
  "summary": "Brief 1-2 sentence summary of candidate fit"
}

REQUIREMENTS:
- Use the EXACT experience names and tool names as listed above (copy them exactly)
- Include ALL required experiences and ALL required tools - do not skip any
- Default to achieved=true if there's ANY reasonable evidence, even indirect
- Attribute scores: 50=average, 70+=strong evidence, 85+=exceptional evidence in resume
- If candidate name cannot be found, use "${fileName.replace('.pdf', '')}"`;
}

// Helper function to provide matching hints for experience types
function getExperienceMatchingHints(experienceName: string): string {
  const hints: Record<string, string> = {
    'team management': 'led team, managed team, supervised staff, team lead, manager of X people, head of team',
    'consulting': 'consultant, advisory, advised clients, provided guidance, strategic counsel, client engagement',
    'process improvement': 'improved processes, optimization, efficiency initiatives, streamlined operations, transformation, redesign',
    'change management': 'led change, transformation, organizational change, guided transition, change initiative',
    'stakeholder management': 'stakeholder engagement, partner with leaders, executive relationships, business partners',
    'customer support systems': 'CRM, ticketing, helpdesk, support platform, service desk',
    'multilingual support': 'multiple languages, bilingual, international support, global team',
    'data-driven decision making': 'analytics, KPIs, metrics, data analysis, reporting, dashboards',
    'leadership': 'led, managed, directed, headed, supervised, oversaw team',
    'technical': 'technical skills, systems, platforms, tools, technology',
  };

  const key = experienceName.toLowerCase();
  for (const [hintKey, hintValue] of Object.entries(hints)) {
    if (key.includes(hintKey) || hintKey.includes(key)) {
      return hintValue;
    }
  }
  return 'related job titles, responsibilities, projects, or achievements';
}

// Helper function to provide matching hints for tools/skills
function getToolMatchingHints(toolName: string): string {
  const hints: Record<string, string> = {
    'email support': 'email, correspondence, written communication, Outlook, Gmail',
    'phone support': 'phone, calls, telephone, voice support, call center',
    'chat support': 'chat, live chat, instant messaging, online support',
    'kpi dashboard': 'KPIs, dashboards, metrics, performance tracking, analytics',
    'customer satisfaction surveys': 'CSAT, NPS, surveys, customer feedback, satisfaction metrics',
    'crm system': 'CRM, Salesforce, customer relationship, client database',
    'ticketing system': 'tickets, helpdesk, Zendesk, ServiceNow, JIRA Service',
    'knowledge base management': 'knowledge base, documentation, wiki, help articles',
    'stakeholder engagement': 'stakeholder, business partners, executive communication, leadership engagement, partner with leaders',
  };

  const key = toolName.toLowerCase();
  for (const [hintKey, hintValue] of Object.entries(hints)) {
    if (key.includes(hintKey) || hintKey.includes(key)) {
      return hintValue;
    }
  }
  return 'explicit mentions, related tools, or implied usage from job context';
}

async function callClaudeAPI(
  apiKey: string,
  prompt: string
): Promise<ClaudeResumeResponse> {
  const response = await fetch(CLAUDE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No content in Claude API response');
  }

  // Parse the JSON response
  try {
    // Remove any markdown code blocks if present
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleanedContent);
  } catch {
    throw new Error('Failed to parse Claude API response as JSON');
  }
}

function buildCandidateProfile(
  claudeResponse: ClaudeResumeResponse,
  successProfile: SuccessProfileContext
): CandidateProfile {
  // Build competency stats dynamically from attributeConfig or use defaults
  const competencyStats: CompetencyStats = {};

  if (successProfile.attributeConfig && successProfile.attributeConfig.length > 0) {
    // Use dynamic attributes from success profile
    successProfile.attributeConfig.forEach((attr) => {
      competencyStats[attr.key] = claudeResponse.attributes[attr.key] || 50;
    });
  } else {
    // Use default attributes
    competencyStats.problemSolving = claudeResponse.attributes.problemSolving || 50;
    competencyStats.stakeholderManagement = claudeResponse.attributes.stakeholderManagement || 50;
    competencyStats.technicalExpertise = claudeResponse.attributes.technicalExpertise || 50;
    competencyStats.leadership = claudeResponse.attributes.leadership || 50;
    competencyStats.customerFocus = claudeResponse.attributes.customerFocus || 50;
    competencyStats.adaptability = claudeResponse.attributes.adaptability || 50;
  }

  // Map experiences - look for matches more flexibly
  const requiredExperiences = successProfile.requiredExperiences.map((exp) => {
    const claudeExp = claudeResponse.experiences.find(
      (e) => e.name.toLowerCase().trim() === exp.name.toLowerCase().trim()
    );
    return {
      ...exp,
      achieved: claudeExp?.achieved ?? false,
    };
  });

  // Map toolbox with achieved status (not percentages)
  const toolbox: ToolCategory[] = successProfile.toolbox.map((category) => ({
    category: category.category,
    tools: category.tools.map((tool) => {
      const claudeTool = claudeResponse.skillProficiencies.find(
        (t) => t.toolName.toLowerCase().trim() === tool.name.toLowerCase().trim()
      );
      return {
        ...tool,
        proficiency: tool.proficiency, // Keep original from success profile
        achieved: claudeTool?.achieved ?? false, // Add achieved status from Claude
      };
    }),
  }));

  // Build attributeConfig from competencyStats
  const attributeConfig = Object.entries(competencyStats).map(([key, value]) => ({
    key,
    label: successProfile.attributeConfig?.find(a => a.key === key)?.label || key,
    value,
  }));

  return {
    personalInfo: {
      name: claudeResponse.name || 'Unknown Candidate',
      yearsExperience: claudeResponse.yearsExperience || 0,
      currentRole: claudeResponse.currentRole || 'Not specified',
    },
    role: successProfile.role,
    competencyStats,
    attributeConfig,
    requiredExperiences,
    academicBackground: {
      minDegree: '',
      preferredFields: [],
      certifications: [],
    },
    toolbox,
    motivations: [],
    painPoints: [],
    weekInLife: [],
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  };
}

export async function parseMultipleResumesWithClaude(
  files: File[],
  apiKey: string,
  successProfile: SuccessProfileContext
): Promise<{ candidates: CandidateProfile[]; errors: string[] }> {
  const candidates: CandidateProfile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const candidate = await parseResumeWithClaude(file, apiKey, successProfile);
      candidates.push(candidate);
    } catch (error) {
      errors.push(
        `Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return { candidates, errors };
}
