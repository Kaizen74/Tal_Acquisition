/**
 * Claude AI-based Candidates CSV Parser
 * Uses Claude to extract candidate profiles from CSV data with multiple candidates
 * Supports flexible CSV formats including HR talent management exports
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const BATCH_SIZE = 5; // Process candidates in batches to avoid token limits

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
 * Identify key columns from the CSV that map to important candidate data
 */
function identifyKeyColumns(columns: string[]): Record<string, string | null> {
  const lowerColumns = columns.map(c => c.toLowerCase().trim());

  const findColumn = (patterns: string[]): string | null => {
    for (const pattern of patterns) {
      const idx = lowerColumns.findIndex(c => c.includes(pattern));
      if (idx !== -1) return columns[idx];
    }
    return null;
  };

  return {
    name: findColumn(['name', 'employee', 'ex. name', 'full name', 'candidate']),
    job: findColumn(['job', 'title', 'role', 'position', 'currentrole']),
    tenure: findColumn(['tenure', 'years', 'experience', 'yearsexperience']),
    strengths: findColumn(['strength']),
    weaknesses: findColumn(['opportunit', 'weakness', 'development area']),
    competencySelf: findColumn(['managing self', 'self management', 'self-management']),
    competencyInterpersonal: findColumn(['interpersonal', 'managing interpersonal']),
    competencyOrganizational: findColumn(['organizational', 'managing organizational']),
    coreSkills: findColumn(['core skill', 'skills', 'key skill']),
    workHistory: findColumn(['history', 'work history', 'career history']),
    jobGrade: findColumn(['grade', 'job grade', 'level']),
    department: findColumn(['department', 'division', 'unit']),
    criticalExperiences: findColumn(['critical experience', 'key experience']),
    potentialAttributes: findColumn(['potential', 'potential attribute', 'aced']),
    talentCategory: findColumn(['talent category', 'talent pool']),
  };
}

/**
 * Extract relevant data from a row based on identified key columns
 */
function extractCandidateData(
  row: Record<string, string>,
  keyColumns: Record<string, string | null>,
  allColumns: string[]
): string {
  const data: string[] = [];

  // Add key fields with labels
  if (keyColumns.name && row[keyColumns.name]) {
    data.push(`Name: ${row[keyColumns.name]}`);
  }
  if (keyColumns.job && row[keyColumns.job]) {
    data.push(`Current Job/Title: ${row[keyColumns.job]}`);
  }
  if (keyColumns.jobGrade && row[keyColumns.jobGrade]) {
    data.push(`Job Grade/Level: ${row[keyColumns.jobGrade]}`);
  }
  if (keyColumns.tenure && row[keyColumns.tenure]) {
    data.push(`Tenure/Experience: ${row[keyColumns.tenure]}`);
  }
  if (keyColumns.department && row[keyColumns.department]) {
    data.push(`Department: ${row[keyColumns.department]}`);
  }
  if (keyColumns.strengths && row[keyColumns.strengths]) {
    data.push(`Strengths: ${row[keyColumns.strengths]}`);
  }
  if (keyColumns.weaknesses && row[keyColumns.weaknesses]) {
    data.push(`Development Areas/Weaknesses: ${row[keyColumns.weaknesses]}`);
  }
  if (keyColumns.competencySelf && row[keyColumns.competencySelf]) {
    data.push(`Competency - Managing Self: ${row[keyColumns.competencySelf]}`);
  }
  if (keyColumns.competencyInterpersonal && row[keyColumns.competencyInterpersonal]) {
    data.push(`Competency - Interpersonal: ${row[keyColumns.competencyInterpersonal]}`);
  }
  if (keyColumns.competencyOrganizational && row[keyColumns.competencyOrganizational]) {
    data.push(`Competency - Organizational: ${row[keyColumns.competencyOrganizational]}`);
  }
  if (keyColumns.coreSkills && row[keyColumns.coreSkills]) {
    data.push(`Core Skills: ${row[keyColumns.coreSkills]}`);
  }
  if (keyColumns.workHistory && row[keyColumns.workHistory]) {
    data.push(`Work History: ${row[keyColumns.workHistory]}`);
  }
  if (keyColumns.criticalExperiences && row[keyColumns.criticalExperiences]) {
    data.push(`Critical Experiences: ${row[keyColumns.criticalExperiences]}`);
  }
  if (keyColumns.potentialAttributes && row[keyColumns.potentialAttributes]) {
    data.push(`Potential Attributes: ${row[keyColumns.potentialAttributes]}`);
  }
  if (keyColumns.talentCategory && row[keyColumns.talentCategory]) {
    data.push(`Talent Category: ${row[keyColumns.talentCategory]}`);
  }

  // If we didn't find key columns, include all non-empty fields
  if (data.length < 3) {
    for (const col of allColumns) {
      if (row[col] && row[col].trim() && !data.some(d => d.includes(row[col]))) {
        data.push(`${col}: ${row[col]}`);
      }
    }
  }

  return data.join('\n');
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
      transformHeader: (header) => header.trim(),
    });

    if (parsedCSV.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsedCSV.errors);
    }

    const rows = parsedCSV.data.filter(row => {
      // Filter out empty rows
      return Object.values(row).some(val => val && val.trim());
    });

    if (rows.length === 0) {
      errors.push('No candidate data found in CSV');
      return { candidates, errors };
    }

    const columns = parsedCSV.meta.fields || [];
    const keyColumns = identifyKeyColumns(columns);

    console.log('Identified key columns:', keyColumns);
    console.log(`Processing ${rows.length} candidates in batches of ${BATCH_SIZE}`);

    // Process candidates in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, Math.min(i + BATCH_SIZE, rows.length));
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} candidates)`);

      try {
        // Build prompt for this batch
        const prompt = buildCandidatesPrompt(batch, columns, keyColumns, successProfile);

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
      } catch (batchError) {
        const errorMsg = batchError instanceof Error ? batchError.message : 'Unknown error';
        errors.push(`Batch ${batchNumber} failed: ${errorMsg}`);
        console.error(`Batch ${batchNumber} error:`, batchError);
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
  keyColumns: Record<string, string | null>,
  successProfile: SuccessProfileContext
): string {
  // Build candidate data with focus on key fields
  const candidatesData = rows.map((row, index) => {
    const candidateData = extractCandidateData(row, keyColumns, columns);
    return `=== CANDIDATE ${index + 1} ===\n${candidateData}`;
  }).join('\n\n');

  // Build experiences list (simplified)
  const experiencesList = successProfile.requiredExperiences
    .map((exp) => `"${exp.name}"`)
    .join(', ');

  // Build tools list (simplified)
  const toolsList = successProfile.toolbox
    .flatMap((cat) => cat.tools.map((t) => `"${t.name}"`))
    .join(', ');

  // Build attributes list
  const attributeKeys = successProfile.attributeConfig
    ? successProfile.attributeConfig.map((attr) => attr.key)
    : ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];

  return `Analyze these candidates for the role: "${successProfile.role.title}" (${successProfile.role.level}).

## KEY EVALUATION CRITERIA:
1. **Job Title/Role**: Assess if candidate's current job type and seniority aligns with the target role
2. **Strengths & Weaknesses**: Evaluate probability of success based on their documented strengths and development areas
3. **Competencies (Managing Self, Interpersonal, Organizational)**: Score eligibility and success potential
4. **Core Skills & Work History**: Match against required experiences and skill proficiencies

## CANDIDATE DATA:
${candidatesData}

## REQUIRED EXPERIENCES TO MATCH:
${experiencesList}

## REQUIRED SKILLS TO MATCH:
${toolsList}

## ATTRIBUTES TO SCORE (0-100):
${attributeKeys.join(', ')}

Scoring Guide:
- 90-100: Exceptional, clearly exceeds requirements
- 75-89: Strong, meets requirements well
- 60-74: Adequate, meets basic requirements
- Below 60: Gap identified, may need development

Return ONLY valid JSON (no markdown):
{"candidates":[{"name":"<name>","currentRole":"<job title>","yearsExperience":<number>,"attributes":{${attributeKeys.map(k => `"${k}":<score>`).join(',')}},"experiences":[${successProfile.requiredExperiences.map(e => `{"name":"${e.name}","achieved":<true/false>,"relevance":"<brief evidence>"}`).join(',')}],"skillProficiencies":[${successProfile.toolbox.flatMap(c => c.tools).map(t => `{"toolName":"${t.name}","achieved":<true/false>,"evidence":"<brief evidence>"}`).join(',')}],"summary":"<1-2 sentence fit summary>"}]}`;
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

  // Parse the JSON response with improved error handling
  try {
    // Clean up the response
    let cleanedContent = content.trim();

    // Remove markdown code blocks if present
    cleanedContent = cleanedContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Try to find JSON object in the response
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanedContent);

    // Validate the response structure
    if (!parsed.candidates || !Array.isArray(parsed.candidates)) {
      throw new Error('Response missing candidates array');
    }

    return parsed;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content);
    console.error('Parse error:', parseError);
    throw new Error(`Failed to parse Claude API response as JSON: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
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
    const claudeExp = claudeResponse.experiences?.find(
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
      const claudeTool = claudeResponse.skillProficiencies?.find(
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
 * Updated to match common HR talent management export formats
 */
export function downloadCandidatesCSVTemplate(): void {
  const templateContent = `ID,Name,Job,Department,Job Grade,Tenure (years),Strengths,Opportunities,Competency - Managing Self,Competency - Managing Interpersonal,Competency - Managing Organizational,Core Skills,Work History
1,John Smith,Senior Operations Manager,Operations,JG3,8,"Strategic thinking, Team leadership, Process improvement","Delegation, Work-life balance",Exceeds,Meets,Exceeds,"Leadership, Project Management, Six Sigma, Stakeholder Engagement","10 years in operations, led transformation projects"
2,Sarah Johnson,Team Lead - Customer Service,Customer Support,JG4,5,"Communication, Problem solving, Customer focus","Technical depth, Data analysis",Meets,Exceeds,Meets,"CRM Systems, Team Management, Customer Service Excellence","5 years customer service, 2 years team lead"
3,Michael Chen,Technical Specialist,IT Operations,JG5,3,"Technical expertise, Analytical thinking, Documentation","Leadership, Presentation skills",Exceeds,Meets,Developing,"SQL, System Administration, Technical Support, Process Documentation","3 years IT support, technical certifications"`;

  const blob = new Blob([templateContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidates-bulk-upload-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
