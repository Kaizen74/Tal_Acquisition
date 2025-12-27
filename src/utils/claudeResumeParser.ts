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
    problemSolving: number;
    stakeholderManagement: number;
    technicalExpertise: number;
    leadership: number;
    customerFocus: number;
    adaptability: number;
  };
  experiences: Array<{
    name: string;
    achieved: boolean;
    relevance: string;
  }>;
  skillProficiencies: Array<{
    toolName: string;
    proficiency: number;
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

  return `You are analyzing a resume to extract structured candidate data for a talent acquisition system. The role being evaluated is: "${successProfile.role.title}".

## Resume Content:
${resumeText}

## Success Profile Requirements:

### Required Experiences:
${experiencesList}

### Required Skill Proficiencies (Tools):
${toolsList}

### Attribute Categories to Evaluate:
- problemSolving: Analytical thinking, troubleshooting, critical thinking abilities
- stakeholderManagement: Client relationships, communication, collaboration skills
- technicalExpertise: Technical knowledge, systems, programming, architecture skills
- leadership: Team management, mentoring, directing abilities
- customerFocus: Customer service orientation, user experience focus
- adaptability: Flexibility, ability to handle change, learning agility

## Instructions:
Analyze the resume and extract the following information. Be thorough and accurate. For skill proficiencies, estimate percentages based on evidence of usage, certifications, or explicit proficiency mentions.

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "Full name of the candidate",
  "currentRole": "Current or most recent job title",
  "yearsExperience": <number of years of professional experience>,
  "attributes": {
    "problemSolving": <0-100>,
    "stakeholderManagement": <0-100>,
    "technicalExpertise": <0-100>,
    "leadership": <0-100>,
    "customerFocus": <0-100>,
    "adaptability": <0-100>
  },
  "experiences": [
    {
      "name": "<exact name from required experiences>",
      "achieved": <true/false based on resume evidence>,
      "relevance": "<brief explanation of evidence found or why not achieved>"
    }
  ],
  "skillProficiencies": [
    {
      "toolName": "<exact tool name from required tools>",
      "proficiency": <0-100>,
      "evidence": "<brief explanation of evidence found>"
    }
  ],
  "summary": "Brief 1-2 sentence summary of candidate fit"
}

Important:
- Use the exact experience names and tool names from the success profile
- Attribute scores should reflect evidence in the resume (50 = average, 70+ = strong evidence, 85+ = exceptional)
- Skill proficiency should be 0 if no evidence found, higher based on explicit mentions or certifications
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
  // Build competency stats
  const competencyStats: CompetencyStats = {
    problemSolving: claudeResponse.attributes.problemSolving || 50,
    stakeholderManagement: claudeResponse.attributes.stakeholderManagement || 50,
    technicalExpertise: claudeResponse.attributes.technicalExpertise || 50,
    leadership: claudeResponse.attributes.leadership || 50,
    customerFocus: claudeResponse.attributes.customerFocus || 50,
    adaptability: claudeResponse.attributes.adaptability || 50,
  };

  // Map experiences
  const requiredExperiences = successProfile.requiredExperiences.map((exp) => {
    const claudeExp = claudeResponse.experiences.find(
      (e) => e.name.toLowerCase() === exp.name.toLowerCase()
    );
    return {
      ...exp,
      achieved: claudeExp?.achieved ?? false,
    };
  });

  // Map toolbox with proficiencies
  const toolbox: ToolCategory[] = successProfile.toolbox.map((category) => ({
    category: category.category,
    tools: category.tools.map((tool) => {
      const claudeTool = claudeResponse.skillProficiencies.find(
        (t) => t.toolName.toLowerCase() === tool.name.toLowerCase()
      );
      return {
        ...tool,
        proficiency: claudeTool?.proficiency ?? 30,
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
