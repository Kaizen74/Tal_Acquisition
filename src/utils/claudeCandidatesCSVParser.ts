/**
 * Claude AI-based Candidates CSV Parser
 * Uses Claude to extract candidate profiles from CSV data with multiple candidates
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

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

interface ClaudeCandidateResponse {
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

interface ClaudeMultipleCandidatesResponse {
  candidates: ClaudeCandidateResponse[];
}

/**
 * Parse a CSV file containing multiple candidates using Claude AI
 */
export async function parseCandidatesCSVWithClaude(
  file: File,
  apiKey: string,
  successProfile: SuccessProfileContext
): Promise<{ candidates: CandidateProfile[]; errors: string[] }> {
  const candidates: CandidateProfile[] = [];
  const errors: string[] = [];

  try {
    // Read CSV content
    const csvText = await readFileAsText(file);

    // Parse CSV to extract raw data
    const parsedCSV = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedCSV.errors.length > 0) {
      errors.push(`CSV parsing errors: ${parsedCSV.errors.map(e => e.message).join(', ')}`);
    }

    const rows = parsedCSV.data;
    if (rows.length === 0) {
      errors.push('No candidate data found in CSV');
      return { candidates, errors };
    }

    // Build prompt with all candidate data
    const prompt = buildCandidatesPrompt(rows, parsedCSV.meta.fields || [], successProfile);

    // Call Claude API
    const response = await callClaudeAPI(apiKey, prompt);

    // Convert each response to CandidateProfile
    for (const candidateResponse of response.candidates) {
      try {
        const profile = buildCandidateProfile(candidateResponse, successProfile);
        candidates.push(profile);
      } catch (err) {
        errors.push(`Failed to process candidate ${candidateResponse.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { candidates, errors };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function buildCandidatesPrompt(
  rows: Record<string, string>[],
  columns: string[],
  successProfile: SuccessProfileContext
): string {
  // Build column description
  const columnsList = columns.join(', ');

  // Build row data
  const rowsData = rows.map((row, index) => {
    const rowValues = columns.map(col => `${col}: ${row[col] || 'N/A'}`).join('\n    ');
    return `--- Candidate ${index + 1} ---\n    ${rowValues}`;
  }).join('\n\n');

  // Build experiences list
  const experiencesList = successProfile.requiredExperiences
    .map((exp) => `- "${exp.name}" (${exp.category}, ${exp.minYears}+ years): ${exp.description}`)
    .join('\n');

  // Build tools list
  const toolsList = successProfile.toolbox
    .flatMap((cat) => cat.tools.map((t) => `- "${t.name}" (${cat.category})`))
    .join('\n');

  // Build attributes list
  const attributesList = successProfile.attributeConfig
    ? successProfile.attributeConfig.map((attr) => `- ${attr.key}: ${attr.label}`).join('\n')
    : `- problemSolving: Problem Solving
- stakeholderManagement: Stakeholder Management
- technicalExpertise: Technical Expertise
- leadership: Leadership
- customerFocus: Customer Focus
- adaptability: Adaptability`;

  // Build expected attributes JSON
  const attributeKeysJson = successProfile.attributeConfig
    ? successProfile.attributeConfig.map((attr) => `      "${attr.key}": <0-100>`).join(',\n')
    : `      "problemSolving": <0-100>,
      "stakeholderManagement": <0-100>,
      "technicalExpertise": <0-100>,
      "leadership": <0-100>,
      "customerFocus": <0-100>,
      "adaptability": <0-100>`;

  return `You are an expert HR analyst evaluating multiple candidates from a CSV file against a success profile for the role: "${successProfile.role.title}".

## CSV Columns Available:
${columnsList}

## Candidate Data:
${rowsData}

## Success Profile Requirements:

### Required Experiences:
${experiencesList}

### Required Skill Proficiencies/Tools:
${toolsList}

### Attribute Categories to Score:
${attributesList}

## Instructions:
For EACH candidate in the CSV data:
1. Extract their name, current role, and years of experience
2. Score their attributes based on available information (0-100 scale)
3. Determine which required experiences they have achieved
4. Determine which skill proficiencies they have

### Matching Rules:
- Mark experience as "achieved: true" if ANY evidence suggests the candidate has it
- Mark skill as "achieved: true" if ANY evidence suggests proficiency
- Be GENEROUS in matching - look for synonyms and related concepts
- Attribute scores: 50=average, 70+=strong, 85+=exceptional

Respond with ONLY a valid JSON object (no markdown, no explanation) in this format:
{
  "candidates": [
    {
      "name": "Full name of candidate",
      "currentRole": "Current or most recent job title",
      "yearsExperience": <total years>,
      "attributes": {
${attributeKeysJson}
      },
      "experiences": [
        {
          "name": "<EXACT experience name from list>",
          "achieved": true/false,
          "relevance": "<evidence from CSV>"
        }
      ],
      "skillProficiencies": [
        {
          "toolName": "<EXACT tool name from list>",
          "achieved": true/false,
          "evidence": "<evidence from CSV>"
        }
      ],
      "summary": "Brief summary of candidate fit"
    }
  ]
}

REQUIREMENTS:
- Include ALL candidates from the CSV (${rows.length} total)
- Use EXACT experience names and tool names as provided
- Include ALL required experiences and tools for each candidate
- If a field is missing from CSV, make reasonable inferences`;
}

async function callClaudeAPI(
  apiKey: string,
  prompt: string
): Promise<ClaudeMultipleCandidatesResponse> {
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
      max_tokens: 8192,
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

function buildCandidateProfile(
  claudeResponse: ClaudeCandidateResponse,
  successProfile: SuccessProfileContext
): CandidateProfile {
  // Build competency stats
  const competencyStats: CompetencyStats = {};

  if (successProfile.attributeConfig && successProfile.attributeConfig.length > 0) {
    successProfile.attributeConfig.forEach((attr) => {
      competencyStats[attr.key] = claudeResponse.attributes[attr.key] || 50;
    });
  } else {
    competencyStats.problemSolving = claudeResponse.attributes.problemSolving || 50;
    competencyStats.stakeholderManagement = claudeResponse.attributes.stakeholderManagement || 50;
    competencyStats.technicalExpertise = claudeResponse.attributes.technicalExpertise || 50;
    competencyStats.leadership = claudeResponse.attributes.leadership || 50;
    competencyStats.customerFocus = claudeResponse.attributes.customerFocus || 50;
    competencyStats.adaptability = claudeResponse.attributes.adaptability || 50;
  }

  // Map experiences
  const requiredExperiences = successProfile.requiredExperiences.map((exp) => {
    const claudeExp = claudeResponse.experiences.find(
      (e) => e.name.toLowerCase().trim() === exp.name.toLowerCase().trim()
    );
    return {
      ...exp,
      achieved: claudeExp?.achieved ?? false,
    };
  });

  // Map toolbox
  const toolbox: ToolCategory[] = successProfile.toolbox.map((category) => ({
    category: category.category,
    tools: category.tools.map((tool) => {
      const claudeTool = claudeResponse.skillProficiencies.find(
        (t) => t.toolName.toLowerCase().trim() === tool.name.toLowerCase().trim()
      );
      return {
        ...tool,
        proficiency: tool.proficiency,
        achieved: claudeTool?.achieved ?? false,
      };
    }),
  }));

  // Build attributeConfig
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

/**
 * Download a CSV template for candidate bulk upload
 */
export function downloadCandidatesCSVTemplate(): void {
  const templateContent = `name,currentRole,yearsExperience,email,phone,skills,education,certifications,summary
John Smith,Senior Customer Support Manager,8,john.smith@email.com,+1-555-0101,"Team Leadership, CRM Systems, Process Improvement, Customer Service",Bachelor's in Business Administration,"ITIL v4, Customer Service Excellence",Experienced customer support leader with track record of team development
Sarah Johnson,Support Team Lead,5,sarah.j@email.com,+1-555-0102,"Team Management, Zendesk, KPI Analysis, Training",Master's in Communications,PMP,Results-driven team lead focused on customer satisfaction metrics
Michael Chen,Technical Support Specialist,3,m.chen@email.com,+1-555-0103,"Technical Troubleshooting, SQL, Phone Support, Documentation",Bachelor's in Computer Science,AWS Certified,Technical specialist with strong problem-solving abilities`;

  const blob = new Blob([templateContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidates-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
