/**
 * Claude AI-based Success Profile PDF Parser
 * Uses Claude to extract success profile data from PDF documents
 */

import type { SuccessProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';
import { extractTextFromPDF } from './parseResume';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

interface ClaudeProfileResponse {
  role: {
    title: string;
    level: string;
    objective: string;
    description: string;
  };
  attributes: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  experiences: Array<{
    category: string;
    name: string;
    description: string;
    minYears: number;
    isRequired: boolean;
  }>;
  skillProficiencies: Array<{
    category: string;
    name: string;
    proficiency: number;
    isRequired: boolean;
  }>;
  academicBackground: {
    minDegree: string;
    preferredFields: string[];
    certifications: string[];
  };
  motivations: string[];
  painPoints: string[];
  weekInLife: string[];
}

/**
 * Parse a success profile PDF using Claude AI
 */
export async function parseProfilePDFWithClaude(
  file: File,
  apiKey: string
): Promise<SuccessProfile> {
  // Extract text from PDF
  const pdfText = await extractTextFromPDF(file);

  // Build the prompt for Claude
  const prompt = buildProfilePrompt(pdfText);

  // Call Claude API
  const response = await callClaudeAPI(apiKey, prompt);

  // Convert response to SuccessProfile
  return buildSuccessProfile(response);
}

function buildProfilePrompt(pdfText: string): string {
  return `You are an expert HR analyst. Extract the success profile information from the following document and structure it as a job success profile.

## Document Content:
${pdfText}

## Instructions:
Extract all relevant information to create a comprehensive job success profile. Look for:
1. **Role Information**: Job title, seniority level (e.g., JG2-JG3, Senior, Manager), objective/purpose, and role description
2. **Key Attributes/Competencies**: Skills and traits needed with importance scores (0-100)
3. **Required Experiences**: Types of experience needed with categories, descriptions, and minimum years
4. **Skill Proficiencies/Tools**: Technical skills, software, and tools needed with proficiency levels
5. **Academic Background**: Minimum degree, preferred fields of study, certifications
6. **Cultural Fit**: Motivations that drive success, pain points to avoid
7. **Week in Life**: Typical activities and responsibilities

Respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "role": {
    "title": "Job Title",
    "level": "Seniority Level (e.g., JG2-JG3, Senior, Manager)",
    "objective": "Main objective or purpose of the role",
    "description": "Brief description of the role"
  },
  "attributes": [
    { "key": "camelCaseKey", "label": "Human Readable Label", "value": 0-100 }
  ],
  "experiences": [
    {
      "category": "Category Name",
      "name": "Experience Name",
      "description": "What this experience entails",
      "minYears": 0,
      "isRequired": true/false
    }
  ],
  "skillProficiencies": [
    {
      "category": "Category Name",
      "name": "Tool/Skill Name",
      "proficiency": 0-100,
      "isRequired": true/false
    }
  ],
  "academicBackground": {
    "minDegree": "Minimum degree required",
    "preferredFields": ["Field 1", "Field 2"],
    "certifications": ["Cert 1", "Cert 2"]
  },
  "motivations": ["What motivates successful people in this role"],
  "painPoints": ["What frustrates or demotivates people in this role"],
  "weekInLife": ["Monday: ...", "Tuesday-Thursday: ...", "Friday: ..."]
}

REQUIREMENTS:
- Generate sensible camelCase keys for attributes (e.g., problemSolving, stakeholderManagement)
- Attribute values should range from 0-100, where 100 is extremely important
- Include at least 4-6 attributes, 2-4 experiences, and 3-5 skill proficiencies
- If information is not found, make reasonable inferences based on the job type
- Be thorough but realistic in your extraction`;
}

async function callClaudeAPI(
  apiKey: string,
  prompt: string
): Promise<ClaudeProfileResponse> {
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
      max_tokens: 4096,
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
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleanedContent);
  } catch {
    throw new Error('Failed to parse Claude API response as JSON');
  }
}

function buildSuccessProfile(response: ClaudeProfileResponse): SuccessProfile {
  // Build competency stats and attribute config
  const competencyStats: CompetencyStats = {};
  const attributeConfig: AttributeConfig[] = [];

  response.attributes.forEach((attr) => {
    competencyStats[attr.key] = attr.value;
    attributeConfig.push({
      key: attr.key,
      label: attr.label,
      value: attr.value,
    });
  });

  // Build required experiences
  const requiredExperiences = response.experiences.map((exp) => ({
    category: exp.category,
    name: exp.name,
    description: exp.description,
    minYears: exp.minYears,
    isRequired: exp.isRequired,
    achieved: false,
    badgeIcon: getExperienceIcon(exp.category),
  }));

  // Build toolbox categories
  const toolCategoriesMap: Record<string, ToolCategory> = {};
  response.skillProficiencies.forEach((skill) => {
    const category = skill.category || 'Other';
    if (!toolCategoriesMap[category]) {
      toolCategoriesMap[category] = { category, tools: [] };
    }
    toolCategoriesMap[category].tools.push({
      name: skill.name,
      proficiency: skill.proficiency,
      isRequired: skill.isRequired,
      achieved: skill.isRequired, // For success profile, required tools start as achieved
    });
  });
  const toolbox: ToolCategory[] = Object.values(toolCategoriesMap);

  return {
    role: {
      title: response.role.title,
      level: response.role.level,
      class: response.role.objective,
      description: response.role.description,
    },
    competencyStats,
    attributeConfig,
    requiredExperiences,
    academicBackground: {
      minDegree: response.academicBackground.minDegree,
      preferredFields: response.academicBackground.preferredFields,
      certifications: response.academicBackground.certifications,
    },
    toolbox,
    motivations: response.motivations,
    painPoints: response.painPoints,
    weekInLife: response.weekInLife,
  };
}

function getExperienceIcon(category: string): string {
  const iconMap: Record<string, string> = {
    leadership: 'Users',
    technical: 'Cpu',
    operations: 'TrendingUp',
    communication: 'MessageSquare',
    management: 'Briefcase',
    analytics: 'BarChart3',
    customer: 'Headphones',
    default: 'Award',
  };

  const lowerCategory = category.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerCategory.includes(key)) {
      return icon;
    }
  }
  return iconMap.default;
}
