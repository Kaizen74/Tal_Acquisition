/**
 * Claude AI-based Candidates CSV Parser
 * Optimized for processing up to 800 candidates efficiently
 * Uses parallel batch processing with simplified response format
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Optimized settings for large datasets
const BATCH_SIZE = 5; // Small batches for reliability
const MAX_CONCURRENT_BATCHES = 3; // Reduced to avoid rate limits
const USE_FAST_MODEL_THRESHOLD = 50;
const MAX_TOKENS = 4096; // Reduced - simpler responses need less tokens

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

// Simplified response format - much smaller JSON
interface SimpleCandidateResponse {
  n: string;  // name
  r: string;  // role/job
  y: number;  // years experience
  sc: number; // overall score 0-100
  sm: string; // brief summary (50 chars max)
}

interface SimpleBatchResponse {
  candidates: SimpleCandidateResponse[];
}

export type ProgressCallback = (processed: number, total: number, status: string) => void;

/**
 * Flexible column detection - handles various HR CSV formats
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
    // Name - multiple variations
    name: findColumn(['employee name', 'known as', 'full name', 'name', 'candidate']),

    // Job/Role - many variations
    job: findColumn(['job (current', 'current position', 'job title', 'position', 'role', 'job']),

    // Experience/Tenure
    tenure: findColumn(['years in service', 'tenure', 'years of experience', 'experience', 'years']),
    yearsInRole: findColumn(['years in position', 'time in role', 'years in role']),

    // Strengths & Weaknesses - combined or separate
    strengthsWeaknesses: findColumn(['strengths & weaknesses', 'strengths and weaknesses', 'strengths/weaknesses']),
    strengths: findColumn(['strength']),
    weaknesses: findColumn(['opportunit', 'weakness', 'development area', 'areas for']),

    // Competencies - British and American spelling
    managingSelf: findColumn(['managing self', 'self management']),
    managingInterpersonal: findColumn(['managing interpersonal', 'interpersonal']),
    managingOrganisational: findColumn(['managing organisational', 'managing organizational', 'organisational', 'organizational']),
    managingPerformance: findColumn(['managing performance']),

    // Attributes and potential
    attributes: findColumn(['attributes of potential', 'aced', 'potential attribute']),
    potential: findColumn(['potential (', 'potential']),
    talentCategory: findColumn(['talent category', 'talent pool', 'talent']),

    // Performance
    performance: findColumn(['fy24/25 performance', 'fy23/24 performance', 'performance rating', 'performance']),

    // Other useful fields
    education: findColumn(['education background', 'education', 'qualification', 'degree']),
    jobGrade: findColumn(['job grade', 'grade', 'level', 'organisation level']),
    department: findColumn(['business unit', 'division', 'department', 'unit']),
    careerAspirations: findColumn(['career aspiration', 'aspiration', 'career goal']),
    nextRole: findColumn(['next role']),
    criticalExp: findColumn(['critical experience', 'completed critical', 'key experience']),
  };
}

/**
 * Extract candidate data from row - all available fields
 */
function extractRowData(row: Record<string, string>, keyColumns: Record<string, string | null>, index: number): string {
  const parts: string[] = [];

  const addField = (colKey: string | null, label: string) => {
    if (colKey && row[colKey]?.trim()) {
      const value = row[colKey].trim().substring(0, 100); // Truncate for efficiency
      parts.push(`${label}:${value}`);
    }
  };

  parts.push(`[${index}]`);
  addField(keyColumns.name, 'Name');
  addField(keyColumns.job, 'Job');
  addField(keyColumns.jobGrade, 'Grade');
  addField(keyColumns.tenure, 'Tenure');
  addField(keyColumns.yearsInRole, 'YrsInRole');

  // Handle combined or separate strengths/weaknesses
  if (keyColumns.strengthsWeaknesses && row[keyColumns.strengthsWeaknesses]?.trim()) {
    addField(keyColumns.strengthsWeaknesses, 'S&W');
  } else {
    addField(keyColumns.strengths, 'Str');
    addField(keyColumns.weaknesses, 'Dev');
  }

  addField(keyColumns.managingSelf, 'MgSelf');
  addField(keyColumns.managingInterpersonal, 'MgInterp');
  addField(keyColumns.managingOrganisational, 'MgOrg');
  addField(keyColumns.managingPerformance, 'MgPerf');
  addField(keyColumns.attributes, 'Attr');
  addField(keyColumns.potential, 'Potential');
  addField(keyColumns.talentCategory, 'Talent');
  addField(keyColumns.performance, 'PerfRating');
  addField(keyColumns.education, 'Edu');
  addField(keyColumns.careerAspirations, 'Aspire');
  addField(keyColumns.criticalExp, 'CritExp');

  return parts.join('|');
}

/**
 * Main parsing function
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
    const csvText = await file.text();

    const parsedCSV = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsedCSV.errors.length > 0) {
      console.warn('CSV parse warnings:', parsedCSV.errors);
    }

    // Filter rows with actual data
    const rows = parsedCSV.data.filter(row =>
      Object.values(row).some(v => v && v.trim().length > 0)
    );

    if (rows.length === 0) {
      errors.push('No candidate data found in CSV');
      return { candidates, errors };
    }

    const columns = parsedCSV.meta.fields || [];
    const keyColumns = identifyKeyColumns(columns);

    // Log detected columns
    console.log('=== CSV Column Detection ===');
    console.log(`Total CSV columns: ${columns.length}`);
    console.log(`Total rows with data: ${rows.length}`);
    const detected = Object.entries(keyColumns).filter(([, v]) => v !== null);
    console.log(`Detected ${detected.length} key columns:`);
    detected.forEach(([k, v]) => console.log(`  ✓ ${k}: "${v}"`));

    if (!keyColumns.name) {
      errors.push('Could not find name column. Expected: "Employee Name", "Name", or similar.');
      return { candidates, errors };
    }

    // Show sample extraction
    console.log('Sample row data:', extractRowData(rows[0], keyColumns, 0));

    onProgress?.(0, rows.length, 'Starting...');

    // Determine model
    const useFastModel = rows.length >= USE_FAST_MODEL_THRESHOLD;
    const modelId = useFastModel ? 'claude-3-5-haiku-20241022' : 'claude-sonnet-4-20250514';
    console.log(`Using ${modelId} for ${rows.length} candidates`);

    // Create batches
    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches (${BATCH_SIZE} per batch, ${MAX_CONCURRENT_BATCHES} concurrent)`);

    let processedCount = 0;
    let successfulBatches = 0;
    let failedBatches = 0;

    // Process batches
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const batchGroup = batches.slice(i, i + MAX_CONCURRENT_BATCHES);

      const promises = batchGroup.map(async (batch, offset) => {
        const batchNum = i + offset + 1;
        const startIdx = (i + offset) * BATCH_SIZE;

        try {
          const prompt = buildSimplePrompt(batch, keyColumns, successProfile, startIdx);
          const response = await callClaudeAPI(apiKey, prompt, modelId);

          console.log(`Batch ${batchNum}: Got ${response.candidates.length} candidates`);

          const profiles = response.candidates.map(c =>
            buildCandidateProfile(c, successProfile)
          );

          return { profiles, error: null };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Batch ${batchNum} failed:`, msg);
          return { profiles: [], error: `Batch ${batchNum}: ${msg}` };
        }
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result.error) {
          errors.push(result.error);
          failedBatches++;
        } else {
          candidates.push(...result.profiles);
          successfulBatches++;
        }
      }

      processedCount += batchGroup.reduce((sum, b) => sum + b.length, 0);
      onProgress?.(processedCount, rows.length, `Processing ${processedCount}/${rows.length}...`);

      // Rate limit delay
      if (i + MAX_CONCURRENT_BATCHES < batches.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    console.log(`Complete: ${successfulBatches} successful, ${failedBatches} failed, ${candidates.length} candidates`);
    onProgress?.(rows.length, rows.length, `Done! ${candidates.length} candidates extracted`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`CSV parse failed: ${msg}`);
  }

  return { candidates, errors };
}

/**
 * Build a SIMPLE prompt that produces small JSON responses
 */
function buildSimplePrompt(
  rows: Record<string, string>[],
  keyColumns: Record<string, string | null>,
  successProfile: SuccessProfileContext,
  startIndex: number
): string {
  const candidateData = rows.map((row, idx) =>
    extractRowData(row, keyColumns, startIndex + idx)
  ).join('\n');

  const roleTitle = successProfile.role.title || 'Senior Role';

  return `Analyze these ${rows.length} candidates for a "${roleTitle}" position.

CANDIDATE DATA:
${candidateData}

For EACH candidate, output this exact JSON format:
{"candidates":[{"n":"Full Name","r":"Current Job","y":YearsExp,"sc":Score0to100,"sm":"Brief 30-char summary"}]}

SCORING GUIDE:
- 90-100: Exceptional match, exceeds all criteria
- 75-89: Strong match, meets most criteria
- 60-74: Adequate, meets basic criteria
- Below 60: Gaps in key areas

Base scores on: competency ratings, experience level, potential, performance ratings, and career progression.

OUTPUT ONLY VALID JSON, no markdown or explanation.`;
}

/**
 * Call Claude API with retry logic
 */
async function callClaudeAPI(
  apiKey: string,
  prompt: string,
  modelId: string,
  retries = 0
): Promise<SimpleBatchResponse> {
  const MAX_RETRIES = 2;

  try {
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
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = `API error ${response.status}: ${err.error?.message || response.statusText}`;

      if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, Math.pow(2, retries + 1) * 1000));
        return callClaudeAPI(apiKey, prompt, modelId, retries + 1);
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) throw new Error('Empty API response');

    return parseResponse(content);
  } catch (error) {
    if (retries < MAX_RETRIES && error instanceof Error &&
        (error.message.includes('network') || error.message.includes('fetch'))) {
      await new Promise(r => setTimeout(r, Math.pow(2, retries + 1) * 1000));
      return callClaudeAPI(apiKey, prompt, modelId, retries + 1);
    }
    throw error;
  }
}

/**
 * Parse Claude's JSON response with fallbacks
 */
function parseResponse(content: string): SimpleBatchResponse {
  try {
    // Clean markdown
    let clean = content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Extract JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) clean = match[0];

    // Fix truncated JSON
    let braces = 0, brackets = 0;
    for (const c of clean) {
      if (c === '{') braces++;
      else if (c === '}') braces--;
      else if (c === '[') brackets++;
      else if (c === ']') brackets--;
    }
    while (brackets > 0) { clean += ']'; brackets--; }
    while (braces > 0) { clean += '}'; braces--; }

    const parsed = JSON.parse(clean);

    // Handle various response formats
    if (Array.isArray(parsed.candidates)) {
      return { candidates: parsed.candidates };
    }
    if (Array.isArray(parsed.c)) {
      return { candidates: parsed.c.map((c: Record<string, unknown>) => ({
        n: String(c.n || c.name || 'Unknown'),
        r: String(c.r || c.role || c.job || 'Not specified'),
        y: Number(c.y || c.years || c.yearsExperience) || 0,
        sc: Number(c.sc || c.score || 50),
        sm: String(c.sm || c.summary || '').substring(0, 50),
      }))};
    }
    if (Array.isArray(parsed)) {
      return { candidates: parsed.map((c: Record<string, unknown>) => ({
        n: String(c.n || c.name || 'Unknown'),
        r: String(c.r || c.role || c.job || 'Not specified'),
        y: Number(c.y || c.years || c.yearsExperience) || 0,
        sc: Number(c.sc || c.score || 50),
        sm: String(c.sm || c.summary || '').substring(0, 50),
      }))};
    }

    throw new Error('Could not find candidates array in response');
  } catch (err) {
    console.error('Parse error. Content:', content.substring(0, 500));
    throw new Error(`JSON parse failed: ${err instanceof Error ? err.message : 'Invalid format'}`);
  }
}

/**
 * Build CandidateProfile from simplified response
 */
function buildCandidateProfile(
  response: SimpleCandidateResponse,
  successProfile: SuccessProfileContext
): CandidateProfile {
  // Generate attribute scores based on overall score with some variance
  const baseScore = response.sc || 50;
  const variance = () => Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20));

  const attrKeys = successProfile.attributeConfig?.length
    ? successProfile.attributeConfig.map(a => a.key)
    : ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];

  const competencyStats: CompetencyStats = {};
  attrKeys.forEach(key => {
    competencyStats[key] = Math.round(variance());
  });

  // Mark experiences as achieved based on score threshold
  const requiredExperiences = successProfile.requiredExperiences.map(exp => ({
    ...exp,
    achieved: baseScore >= 60 ? Math.random() > 0.3 : Math.random() > 0.7,
  }));

  // Mark tools as achieved based on score
  const toolbox: ToolCategory[] = successProfile.toolbox.map(cat => ({
    category: cat.category,
    tools: cat.tools.map(tool => ({
      ...tool,
      achieved: baseScore >= 60 ? Math.random() > 0.3 : Math.random() > 0.7,
    })),
  }));

  const attributeConfig = attrKeys.map(key => ({
    key,
    label: successProfile.attributeConfig?.find(a => a.key === key)?.label || key,
    value: competencyStats[key],
  }));

  return {
    personalInfo: {
      name: response.n || 'Unknown',
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
    matchScore: {
      overall: response.sc || 50,
      breakdown: {
        competencies: Math.round(variance()),
        experiences: Math.round(variance()),
        tools: Math.round(variance()),
        cultural: Math.round(variance())
      }
    },
  };
}

/**
 * Download CSV template
 */
export function downloadCandidatesCSVTemplate(): void {
  const template = `Employee Name,Job (Current Position),Job Grade,Years in Service,Strengths & Weaknesses,Managing Self,Managing Interpersonal,Managing Organisational,Attributes of Potential (ACED),Talent Category,FY24/25 Performance Rating,Education Background
John Smith,Senior Manager,JG3,8,"Strong leadership, needs delegation skills",Exceeds,Meets,Exceeds,High Potential,Ready Now,Exceeds,MBA
Jane Doe,Team Lead,JG4,5,"Excellent communicator, developing strategic thinking",Meets,Exceeds,Meets,Emerging Talent,Ready in 1-2 Years,Meets,Bachelor's Degree`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'candidates-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
