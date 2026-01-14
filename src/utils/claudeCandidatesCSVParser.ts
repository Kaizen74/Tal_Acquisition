/**
 * Claude AI-based Candidates CSV Parser
 * Optimized for processing up to 800 candidates efficiently
 * Uses parallel batch processing and compact prompts
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Optimized settings for large datasets
const BATCH_SIZE = 15; // Larger batches for efficiency
const MAX_CONCURRENT_BATCHES = 4; // Parallel processing
const USE_FAST_MODEL_THRESHOLD = 50; // Use faster model for large datasets

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
  n: string; // name (shortened)
  r: string; // role
  y: number; // years
  a: Record<string, number>; // attributes
  e: Array<{ n: string; v: boolean }>; // experiences (name, achieved)
  s: Array<{ n: string; v: boolean }>; // skills (name, achieved)
  m: string; // summary
}

interface ClaudeMultipleCandidatesResponse {
  c: ClaudeCandidateResponse[]; // candidates (shortened)
}

// Progress callback type for UI updates
export type ProgressCallback = (processed: number, total: number, status: string) => void;

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
 * Extract relevant data from a row - compact format for efficiency
 */
function extractCandidateDataCompact(
  row: Record<string, string>,
  keyColumns: Record<string, string | null>,
  index: number
): string {
  const parts: string[] = [`[${index}]`];

  const addField = (key: string | null, prefix: string) => {
    if (key && row[key]?.trim()) {
      // Truncate long fields for efficiency
      const value = row[key].trim().substring(0, 150);
      parts.push(`${prefix}:${value}`);
    }
  };

  addField(keyColumns.name, 'N');
  addField(keyColumns.job, 'J');
  addField(keyColumns.jobGrade, 'G');
  addField(keyColumns.tenure, 'T');
  addField(keyColumns.strengths, 'S+');
  addField(keyColumns.weaknesses, 'S-');
  addField(keyColumns.competencySelf, 'CS');
  addField(keyColumns.competencyInterpersonal, 'CI');
  addField(keyColumns.competencyOrganizational, 'CO');
  addField(keyColumns.coreSkills, 'SK');
  addField(keyColumns.workHistory, 'H');

  return parts.join('|');
}

/**
 * Parse a CSV file containing multiple candidates using Claude AI
 * Optimized for up to 800 candidates with parallel processing
 */
export async function parseCandidatesCSVWithClaude(
  file: File,
  apiKey: string,
  successProfile: SuccessProfileContext,
  onProgress?: ProgressCallback
): Promise<{ candidates: CandidateProfile[]; errors: string[] }> {
  const candidates: CandidateProfile[] = [];
  const errors: string[] = [];

  try {
    const csvText = await readFileAsText(file);

    const parsedCSV = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsedCSV.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsedCSV.errors);
    }

    const rows = parsedCSV.data.filter(row =>
      Object.values(row).some(val => val && val.trim())
    );

    if (rows.length === 0) {
      errors.push('No candidate data found in CSV');
      return { candidates, errors };
    }

    const columns = parsedCSV.meta.fields || [];
    const keyColumns = identifyKeyColumns(columns);

    console.log(`Processing ${rows.length} candidates (batch size: ${BATCH_SIZE}, parallel: ${MAX_CONCURRENT_BATCHES})`);
    onProgress?.(0, rows.length, 'Starting analysis...');

    // Determine model based on dataset size
    const useFastModel = rows.length >= USE_FAST_MODEL_THRESHOLD;
    const modelId = useFastModel ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-20250514';
    console.log(`Using model: ${modelId} for ${rows.length} candidates`);

    // Create batches
    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, Math.min(i + BATCH_SIZE, rows.length)));
    }

    // Process batches in parallel with concurrency limit
    let processedCount = 0;
    const batchResults: { candidates: CandidateProfile[]; errors: string[] }[] = [];

    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
      const batchStartIndex = i;

      const promises = concurrentBatches.map(async (batch, batchOffset) => {
        const batchNumber = batchStartIndex + batchOffset + 1;
        const startIndex = (batchStartIndex + batchOffset) * BATCH_SIZE;

        try {
          const prompt = buildCompactPrompt(batch, keyColumns, successProfile, startIndex);
          const response = await callClaudeAPIOptimized(apiKey, prompt, modelId);

          const batchCandidates: CandidateProfile[] = [];
          const batchErrors: string[] = [];

          for (const candidateResponse of response.c) {
            try {
              const profile = buildCandidateProfileFromCompact(candidateResponse, successProfile);
              batchCandidates.push(profile);
            } catch (err) {
              batchErrors.push(`Failed to process candidate: ${err instanceof Error ? err.message : 'Unknown'}`);
            }
          }

          return { candidates: batchCandidates, errors: batchErrors };
        } catch (batchError) {
          const errorMsg = batchError instanceof Error ? batchError.message : 'Unknown error';
          console.error(`Batch ${batchNumber} error:`, batchError);
          return { candidates: [], errors: [`Batch ${batchNumber}: ${errorMsg}`] };
        }
      });

      const results = await Promise.all(promises);
      batchResults.push(...results);

      processedCount += concurrentBatches.reduce((sum, batch) => sum + batch.length, 0);
      onProgress?.(processedCount, rows.length, `Processed ${processedCount}/${rows.length} candidates...`);
    }

    // Aggregate results
    for (const result of batchResults) {
      candidates.push(...result.candidates);
      errors.push(...result.errors);
    }

    onProgress?.(rows.length, rows.length, 'Complete!');

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

/**
 * Build a compact prompt optimized for token efficiency
 */
function buildCompactPrompt(
  rows: Record<string, string>[],
  keyColumns: Record<string, string | null>,
  successProfile: SuccessProfileContext,
  startIndex: number
): string {
  // Compact candidate data
  const candidatesData = rows.map((row, idx) =>
    extractCandidateDataCompact(row, keyColumns, startIndex + idx)
  ).join('\n');

  // Compact experience names
  const expNames = successProfile.requiredExperiences.map(e => e.name).join(',');

  // Compact skill names
  const skillNames = successProfile.toolbox.flatMap(c => c.tools.map(t => t.name)).join(',');

  // Compact attribute keys
  const attrKeys = successProfile.attributeConfig
    ? successProfile.attributeConfig.map(a => a.key)
    : ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];

  return `Analyze candidates for "${successProfile.role.title}" (${successProfile.role.level}).

DATA FORMAT: [idx]|N:name|J:job|G:grade|T:tenure|S+:strengths|S-:weaknesses|CS:compSelf|CI:compInterp|CO:compOrg|SK:skills|H:history

CANDIDATES:
${candidatesData}

MATCH AGAINST:
EXP:${expNames}
SKILLS:${skillNames}
ATTRS:${attrKeys.join(',')}

OUTPUT JSON (no markdown):
{"c":[{"n":"name","r":"role","y":years,"a":{${attrKeys.map(k => `"${k}":score`).join(',')}},"e":[${successProfile.requiredExperiences.map(e => `{"n":"${e.name}","v":bool}`).join(',')}],"s":[${successProfile.toolbox.flatMap(c => c.tools).map(t => `{"n":"${t.name}","v":bool}`).join(',')}],"m":"summary"}]}

SCORING: 90-100=exceptional, 75-89=strong, 60-74=adequate, <60=gap. Match exp/skills as true if evidence exists.`;
}

async function callClaudeAPIOptimized(
  apiKey: string,
  prompt: string,
  modelId: string
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
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No content in Claude API response');
  }

  try {
    let cleanedContent = content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedContent = jsonMatch[0];

    const parsed = JSON.parse(cleanedContent);

    if (!parsed.c || !Array.isArray(parsed.c)) {
      // Try legacy format
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        return {
          c: parsed.candidates.map((c: Record<string, unknown>) => ({
            n: c.name || c.n,
            r: c.currentRole || c.r,
            y: c.yearsExperience || c.y || 0,
            a: c.attributes || c.a || {},
            e: (Array.isArray(c.experiences) ? c.experiences : Array.isArray(c.e) ? c.e : []).map((e: Record<string, unknown>) => ({ n: e.name || e.n, v: e.achieved ?? e.v ?? false })),
            s: (Array.isArray(c.skillProficiencies) ? c.skillProficiencies : Array.isArray(c.s) ? c.s : []).map((s: Record<string, unknown>) => ({ n: s.toolName || s.n, v: s.achieved ?? s.v ?? false })),
            m: c.summary || c.m || '',
          })),
        };
      }
      throw new Error('Response missing candidates array');
    }

    return parsed;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', content.substring(0, 500));
    throw new Error(`Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}

function buildCandidateProfileFromCompact(
  response: ClaudeCandidateResponse,
  successProfile: SuccessProfileContext
): CandidateProfile {
  const competencyStats: CompetencyStats = {};

  if (successProfile.attributeConfig && successProfile.attributeConfig.length > 0) {
    successProfile.attributeConfig.forEach((attr) => {
      competencyStats[attr.key] = response.a[attr.key] || 50;
    });
  } else {
    const defaultAttrs = ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];
    defaultAttrs.forEach(key => {
      competencyStats[key] = response.a[key] || 50;
    });
  }

  const requiredExperiences = successProfile.requiredExperiences.map((exp) => {
    const matched = response.e?.find(e => e.n.toLowerCase().trim() === exp.name.toLowerCase().trim());
    return { ...exp, achieved: matched?.v ?? false };
  });

  const toolbox: ToolCategory[] = successProfile.toolbox.map((category) => ({
    category: category.category,
    tools: category.tools.map((tool) => {
      const matched = response.s?.find(s => s.n.toLowerCase().trim() === tool.name.toLowerCase().trim());
      return { ...tool, achieved: matched?.v ?? false };
    }),
  }));

  const attributeConfig = Object.entries(competencyStats).map(([key, value]) => ({
    key,
    label: successProfile.attributeConfig?.find(a => a.key === key)?.label || key,
    value,
  }));

  return {
    personalInfo: {
      name: response.n || 'Unknown Candidate',
      yearsExperience: response.y || 0,
      currentRole: response.r || 'Not specified',
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
    matchScore: { overall: 0, breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 } },
  };
}

/**
 * Download a CSV template for candidate bulk upload
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
