import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';
import { extractTextFromPDF } from './parseResume';

interface SuccessProfileContext {
  role: { title: string; level: string; class: string };
  requiredExperiences: Array<{
    category: string;
    name: string;
    description: string;
    minYears: number;
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
  const experiencesList = successProfile.requiredExperiences
    .map((exp) => `- ${exp.name} (${exp.category}): ${exp.description}`)
    .join('\n');

  const toolsList = successProfile.toolbox
    .flatMap((cat) => cat.tools.map((t) => `- ${t.name} (${cat.category})`))
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

  return `You are analyzing a resume to extract structured candidate data for a talent acquisition system. The role being evaluated is: "${successProfile.role.title}".

## Resume Content:
${resumeText}

## Success Profile Requirements:

### Required Experiences:
${experiencesList}

### Required Skill Proficiencies (Tools):
${toolsList}

### Attribute Categories to Evaluate:
${attributesList}

## Instructions:
Analyze the resume and extract the following information. Be thorough in matching:
- For EXPERIENCES: Mark as "achieved: true" if the candidate has relevant experience matching the required experience (look for similar job responsibilities, project work, or explicit mentions)
- For SKILL PROFICIENCIES: Mark as "achieved: true" if the candidate mentions the tool/skill or has demonstrable experience with it (look for explicit mentions, related tools, or implied usage)

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Full name of the candidate",
  "currentRole": "Current or most recent job title",
  "yearsExperience": <number of years of professional experience>,
  "attributes": {
${attributeKeysJson}
  },
  "experiences": [
    {
      "name": "<exact name from required experiences>",
      "achieved": <true if evidence found in resume, false otherwise>,
      "relevance": "<brief explanation of evidence found or why not achieved>"
    }
  ],
  "skillProficiencies": [
    {
      "toolName": "<exact tool name from required tools>",
      "achieved": <true if mentioned or implied in resume, false otherwise>,
      "evidence": "<brief explanation of evidence found>"
    }
  ],
  "summary": "Brief 1-2 sentence summary of candidate fit"
}

Important:
- Use the EXACT experience names and tool names from the success profile lists above
- Include ALL required experiences and ALL required tools in your response
- Be generous in matching - if the resume shows related experience or skills, mark as achieved
- Attribute scores should reflect evidence in the resume (50 = average, 70+ = strong evidence, 85+ = exceptional)
- If the candidate's name cannot be determined, use "${fileName.replace('.pdf', '')}"`;
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
