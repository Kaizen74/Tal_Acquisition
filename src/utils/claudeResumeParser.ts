import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig, SuccessProfile } from '../types';
import { extractTextFromPDF } from './parseResume';
import { calculateMatchScore, DEFAULT_WEIGHTS } from './calculateMatch';
import {
  extractProfileDescriptors,
  extractCandidateTextFromPDF,
  performSemanticMatching,
  type SemanticMatchResult,
} from './semanticMatching';

interface SuccessProfileContext {
  role: { title: string; level: string; class: string; description?: string };
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
  // Additional fields for semantic matching
  motivations?: string[];
  painPoints?: string[];
  academicBackground?: { minDegree: string; preferredFields: string[]; certifications: string[] };
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

### For YEARS OF EXPERIENCE - Calculate TOTAL career span:
- Find the EARLIEST employment start date in the resume (first professional job)
- Calculate: Current Year (2026) - Earliest Employment Year = Total Years
- Example: If career started in 2006, years = 2026 - 2006 = 20 years
- Include ALL professional experience, not just current role tenure

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Full name of the candidate",
  "currentRole": "Current or most recent job title",
  "yearsExperience": <total years from EARLIEST job to 2026>,
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
  "summary": "<DETAILED assessment (3-5 sentences) that references the ${successProfile.role.title} requirements:

    FORMAT:
    '[Name], currently [Role], brings [X] years of experience in [domain]. Their background shows strong alignment with the ${successProfile.role.title} role requirements, particularly demonstrating [cite specific required experiences from the list above that they match]. Key strengths include [2-3 specific competencies from their resume that align with the attribute categories]. However, gaps exist in [cite specific required experiences/skills from the list above that are NOT matched]. Overall Assessment: [Strong/Good/Moderate/Weak] fit for ${successProfile.role.title} because [one sentence explanation referencing profile requirements].'

    IMPORTANT: Reference actual experience names and skill names from the lists above. Be specific about which requirements are met vs which are gaps.>"
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

/**
 * Parse resume with semantic matching
 * Uses deep language analysis to detect "closeness of fit" against success profile descriptors
 *
 * This is the enhanced version that uses Claude AI for semantic analysis
 * instead of simple keyword matching
 */
export async function parseResumeWithSemanticMatching(
  file: File,
  apiKey: string,
  successProfile: SuccessProfileContext
): Promise<CandidateProfile> {
  // Extract text from PDF
  const resumeText = await extractTextFromPDF(file);

  // First, use Claude to extract basic info (name, role, years)
  // Use more text to capture full work history for accurate years calculation
  const basicInfoPrompt = `Extract from this resume:
1. Full name
2. Current/most recent job title
3. Total years of professional experience (IMPORTANT: Calculate from the EARLIEST employment start date to the current year 2026)

CRITICAL: For years of experience calculation:
- Find the EARLIEST employment date mentioned anywhere in the resume
- Calculate: Current Year (2026) - Earliest Employment Year = Total Years
- Example: If earliest job started in 2006, then years = 2026 - 2006 = 20 years
- Do NOT just count years at current company
- Include ALL professional experience from career start

Resume:
${resumeText.substring(0, 8000)}

Respond with ONLY valid JSON:
{"name": "Full Name", "currentRole": "Job Title", "yearsExperience": <number - calculated from earliest employment to 2026>}`;

  const basicInfoResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      messages: [{ role: 'user', content: basicInfoPrompt }],
    }),
  });

  if (!basicInfoResponse.ok) {
    throw new Error(`Failed to extract basic info: ${basicInfoResponse.status}`);
  }

  const basicInfoData = await basicInfoResponse.json();
  const basicInfoContent = basicInfoData.content?.[0]?.text || '{}';
  const cleanedBasicInfo = basicInfoContent
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  const basicInfo = JSON.parse(cleanedBasicInfo);

  // Extract profile descriptors for semantic matching
  const fullProfile: SuccessProfile = {
    role: successProfile.role,
    competencyStats: {},
    attributeConfig: successProfile.attributeConfig || [],
    requiredExperiences: successProfile.requiredExperiences,
    academicBackground: successProfile.academicBackground || { minDegree: '', preferredFields: [], certifications: [] },
    toolbox: successProfile.toolbox,
    motivations: successProfile.motivations || [],
    painPoints: successProfile.painPoints || [],
    weekInLife: [],
  };
  const profileDescriptors = extractProfileDescriptors(fullProfile);

  // Extract candidate text from resume
  const candidateText = extractCandidateTextFromPDF(
    resumeText,
    basicInfo.name || file.name.replace('.pdf', ''),
    basicInfo.currentRole || '',
    basicInfo.yearsExperience || 0
  );

  // Perform semantic matching using Claude AI
  const semanticResult = await performSemanticMatching(
    apiKey,
    candidateText,
    profileDescriptors
  );

  // Build candidate profile from semantic results
  return buildCandidateProfileFromSemanticResult(
    basicInfo,
    successProfile,
    semanticResult
  );
}

/**
 * Build CandidateProfile from semantic matching results for PDF parsing
 */
function buildCandidateProfileFromSemanticResult(
  basicInfo: { name: string; currentRole: string; yearsExperience: number },
  successProfile: SuccessProfileContext,
  semanticResult: SemanticMatchResult
): CandidateProfile {
  // Get attribute keys from success profile or use defaults
  const attrKeys = successProfile.attributeConfig?.length
    ? successProfile.attributeConfig.map(a => a.key)
    : ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];

  // Build competency stats from semantic attribute matching
  const competencyStats: CompetencyStats = {};
  attrKeys.forEach((key, index) => {
    const semanticScore = semanticResult.attributes.breakdown[key]?.score;
    if (semanticScore !== undefined) {
      competencyStats[key] = semanticScore;
    } else {
      // Fallback to overall attribute score with variance
      const position = (index / Math.max(1, attrKeys.length - 1)) * 2 - 1;
      const offset = position * 10;
      competencyStats[key] = Math.max(0, Math.min(100, Math.round(semanticResult.attributes.overall + offset)));
    }
  });

  // Build experiences from semantic experience matching
  const requiredExperiences = successProfile.requiredExperiences.map(exp => {
    const semanticExp = semanticResult.experiences.breakdown.find(
      e => e.name.toLowerCase() === exp.name.toLowerCase()
    );
    return {
      ...exp,
      achieved: semanticExp?.achieved ?? false,
    };
  });

  // Build toolbox from semantic skill matching
  const toolbox: ToolCategory[] = successProfile.toolbox.map(cat => ({
    category: cat.category,
    tools: cat.tools.map(tool => {
      const semanticTool = semanticResult.skills.breakdown.find(
        s => s.name.toLowerCase() === tool.name.toLowerCase()
      );
      return {
        ...tool,
        achieved: semanticTool?.achieved ?? false,
      };
    }),
  }));

  const attributeConfig = attrKeys.map(key => ({
    key,
    label: successProfile.attributeConfig?.find(a => a.key === key)?.label || key,
    value: competencyStats[key],
  }));

  // Build partial candidate for score calculation
  const partialCandidate: CandidateProfile = {
    personalInfo: {
      name: basicInfo.name || 'Unknown',
      yearsExperience: basicInfo.yearsExperience || 0,
      currentRole: basicInfo.currentRole || 'Not specified',
    },
    role: successProfile.role,
    competencyStats,
    attributeConfig,
    requiredExperiences,
    academicBackground: { minDegree: '', preferredFields: [], certifications: [] },
    toolbox,
    motivations: [],
    painPoints: [],
    weekInLife: [],
    culturalFitAssessment: {
      score: semanticResult.cultural.overall,
      assessedAt: new Date().toISOString(),
      assessedBy: 'Semantic Language Analysis',
      notes: semanticResult.cultural.reasoning || 'Assessed through deep language analysis of resume content against success profile',
    },
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  };

  // Build minimal success profile for score calculation
  const profileForCalc = {
    role: successProfile.role,
    competencyStats: {} as CompetencyStats,
    requiredExperiences: successProfile.requiredExperiences,
    toolbox: successProfile.toolbox,
    motivations: successProfile.motivations || [],
    attributeConfig: successProfile.attributeConfig || [],
    academicBackground: successProfile.academicBackground || { minDegree: '', preferredFields: [], certifications: [] },
    painPoints: successProfile.painPoints || [],
    weekInLife: [],
  };

  // Use success profile's competency stats for comparison
  if (successProfile.attributeConfig?.length) {
    successProfile.attributeConfig.forEach(attr => {
      profileForCalc.competencyStats[attr.key] = attr.value;
    });
  } else {
    attrKeys.forEach(key => {
      profileForCalc.competencyStats[key] = 85;
    });
  }

  // Calculate match score using the unified function
  const calculatedScore = calculateMatchScore(profileForCalc, partialCandidate, DEFAULT_WEIGHTS);

  return {
    ...partialCandidate,
    matchScore: calculatedScore,
  };
}

/**
 * Parse multiple resumes with semantic matching
 */
export async function parseMultipleResumesWithSemanticMatching(
  files: File[],
  apiKey: string,
  successProfile: SuccessProfileContext
): Promise<{ candidates: CandidateProfile[]; errors: string[] }> {
  const candidates: CandidateProfile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const candidate = await parseResumeWithSemanticMatching(file, apiKey, successProfile);
      candidates.push(candidate);
    } catch (error) {
      errors.push(
        `Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return { candidates, errors };
}
