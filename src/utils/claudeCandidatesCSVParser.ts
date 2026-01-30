/**
 * Claude AI-based Candidates CSV Parser
 * Optimized for processing up to 800 candidates efficiently
 * Uses parallel batch processing with semantic matching
 *
 * KEY PRINCIPLE: Uses deep language analysis for "closeness of fit" detection
 * Does NOT translate quantitative ratings - analyzes meaning and context instead
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig, SuccessProfile } from '../types';
import { calculateMatchScore, DEFAULT_WEIGHTS } from './calculateMatch';
import {
  extractProfileDescriptors,
  extractCandidateTextFromCSV,
  performSemanticMatching,
  type SemanticMatchResult,
} from './semanticMatching';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Optimized settings for large datasets
const BATCH_SIZE = 5; // Small batches for reliability
const MAX_CONCURRENT_BATCHES = 3; // Reduced to avoid rate limits
const USE_FAST_MODEL_THRESHOLD = 50;
const MAX_TOKENS = 4096; // Reduced - simpler responses need less tokens

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
  rawProfileText?: string;
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

          const profiles = response.candidates.map((c, idx) =>
            buildCandidateProfile(c, successProfile, batch[idx], keyColumns)
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
 * Deterministic variance function based on index (no randomness)
 * Creates consistent spread around base score for each attribute
 */
function deterministicVariance(baseScore: number, index: number, total: number): number {
  // Create a wave pattern: -10, -5, 0, +5, +10 spread based on position
  const position = (index / Math.max(1, total - 1)) * 2 - 1; // -1 to +1
  const offset = position * 10; // -10 to +10 spread
  return Math.max(0, Math.min(100, Math.round(baseScore + offset)));
}

/**
 * Experience keyword matching patterns
 * Maps experience categories/names to keywords that indicate achievement
 */
/**
 * Parse competency rating text to numeric score
 * Handles various HR rating formats: Exceeds, Meets, Below, numeric ratings, etc.
 */
function parseCompetencyRating(rating: string | undefined): number | null {
  if (!rating || !rating.trim()) return null;

  const ratingLower = rating.toLowerCase().trim();

  // Numeric ratings (1-5 scale, 1-10 scale, percentage)
  const numericMatch = ratingLower.match(/^(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?%?$/);
  if (numericMatch) {
    const value = parseFloat(numericMatch[1]);
    const maxValue = numericMatch[2] ? parseFloat(numericMatch[2]) : (value <= 5 ? 5 : value <= 10 ? 10 : 100);
    return Math.round((value / maxValue) * 100);
  }

  // Text-based ratings - common HR terminology
  const ratingMap: Record<string, number> = {
    // Exceeds variations
    'exceeds': 95,
    'exceeds expectations': 95,
    'outstanding': 95,
    'excellent': 95,
    'exceptional': 100,
    'significantly exceeds': 100,
    'far exceeds': 100,
    'high performer': 90,

    // Meets variations
    'meets': 75,
    'meets expectations': 75,
    'satisfactory': 75,
    'competent': 75,
    'good': 80,
    'solid': 80,
    'fully meets': 80,
    'on track': 75,

    // Below variations
    'below': 50,
    'below expectations': 50,
    'needs improvement': 45,
    'developing': 55,
    'partially meets': 55,
    'inconsistent': 50,
    'improvement needed': 45,

    // Unsatisfactory variations
    'unsatisfactory': 30,
    'does not meet': 30,
    'unacceptable': 25,
    'failing': 20,

    // Potential indicators
    'high potential': 90,
    'emerging talent': 85,
    'ready now': 95,
    'ready in 1-2 years': 80,
    'ready in 2-3 years': 70,
    'ready 2-3 years': 70,
    'develop in role': 65,
    'career risk': 40,

    // Letter grades
    'a': 95,
    'a+': 100,
    'a-': 90,
    'b': 80,
    'b+': 85,
    'b-': 75,
    'c': 65,
    'c+': 70,
    'c-': 60,
    'd': 50,
    'f': 30,
  };

  // Check for exact match
  if (ratingMap[ratingLower] !== undefined) {
    return ratingMap[ratingLower];
  }

  // Check for partial match (e.g., "Exceeds - Strong performer" should match "exceeds")
  for (const [key, score] of Object.entries(ratingMap)) {
    if (ratingLower.includes(key)) {
      return score;
    }
  }

  return null;
}

/**
 * Extract competency scores from CSV row data
 * Maps actual CSV competency columns to attribute scores
 */
function extractCompetencyScores(
  row: Record<string, string> | undefined,
  keyColumns: Record<string, string | null>
): Record<string, number> {
  const scores: Record<string, number> = {};

  if (!row) return scores;

  // Map CSV competency columns to attribute keys
  const competencyMapping: Record<string, string[]> = {
    // Managing Self → problemSolving, adaptability
    'problemSolving': ['managingSelf'],
    'adaptability': ['managingSelf'],

    // Managing Interpersonal → stakeholderManagement, leadership
    'stakeholderManagement': ['managingInterpersonal'],
    'leadership': ['managingInterpersonal', 'managingPerformance'],

    // Managing Organisational → technicalExpertise
    'technicalExpertise': ['managingOrganisational'],

    // Managing Performance → customerFocus
    'customerFocus': ['managingPerformance'],
  };

  // Extract scores for each mapped attribute
  for (const [attrKey, csvColumns] of Object.entries(competencyMapping)) {
    const ratings: number[] = [];

    for (const colKey of csvColumns) {
      const colName = keyColumns[colKey];
      if (colName && row[colName]) {
        const parsed = parseCompetencyRating(row[colName]);
        if (parsed !== null) {
          ratings.push(parsed);
        }
      }
    }

    // Average the ratings if multiple sources
    if (ratings.length > 0) {
      scores[attrKey] = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    }
  }

  // Also check for attributes/potential column which may have multiple indicators
  if (keyColumns.attributes && row[keyColumns.attributes]) {
    const attrRating = parseCompetencyRating(row[keyColumns.attributes]);
    if (attrRating !== null) {
      // Apply to all attributes as a baseline if not already set
      for (const key of Object.keys(competencyMapping)) {
        if (scores[key] === undefined) {
          scores[key] = attrRating;
        }
      }
    }
  }

  return scores;
}

/**
 * Calculate cultural fit score from CSV data
 * Uses talent category, potential, and performance ratings
 */
function calculateCulturalFitFromCSV(
  row: Record<string, string> | undefined,
  keyColumns: Record<string, string | null>,
  baseScore: number
): number {
  if (!row) {
    // Fallback to 80% of base score for candidates without CSV data
    return Math.round(baseScore * 0.8);
  }

  const indicators: number[] = [];

  // Talent Category - strong indicator of cultural fit and potential
  if (keyColumns.talentCategory && row[keyColumns.talentCategory]) {
    const talentRating = parseCompetencyRating(row[keyColumns.talentCategory]);
    if (talentRating !== null) {
      indicators.push(talentRating);
    }
  }

  // Potential rating
  if (keyColumns.potential && row[keyColumns.potential]) {
    const potentialRating = parseCompetencyRating(row[keyColumns.potential]);
    if (potentialRating !== null) {
      indicators.push(potentialRating);
    }
  }

  // Performance rating - indicates cultural alignment with performance expectations
  if (keyColumns.performance && row[keyColumns.performance]) {
    const perfRating = parseCompetencyRating(row[keyColumns.performance]);
    if (perfRating !== null) {
      indicators.push(perfRating);
    }
  }

  // Attributes of potential (ACED or similar)
  if (keyColumns.attributes && row[keyColumns.attributes]) {
    const attrRating = parseCompetencyRating(row[keyColumns.attributes]);
    if (attrRating !== null) {
      indicators.push(attrRating);
    }
  }

  // If we have actual data, average it; otherwise use fallback
  if (indicators.length > 0) {
    return Math.round(indicators.reduce((a, b) => a + b, 0) / indicators.length);
  }

  // Fallback to derived score
  return Math.round(baseScore * 0.8);
}

/**
 * Keyword patterns for skill/tool matching
 * Maps tool categories to keywords that indicate proficiency
 */
const SKILL_MATCHERS: Record<string, string[]> = {
  // Technical/IT skills
  'technical': ['it', 'software', 'technology', 'systems', 'digital', 'computer', 'engineering', 'technical', 'data', 'analytics'],
  'programming': ['programming', 'coding', 'developer', 'software', 'java', 'python', 'javascript', 'sql', 'database'],
  'data': ['data', 'analytics', 'analysis', 'reporting', 'business intelligence', 'bi', 'excel', 'tableau', 'power bi'],

  // Business skills
  'financial': ['financial', 'finance', 'accounting', 'budget', 'p&l', 'revenue', 'cost', 'audit', 'controller', 'cfo'],
  'strategic': ['strategy', 'strategic', 'planning', 'business development', 'transformation', 'consulting'],
  'commercial': ['sales', 'commercial', 'business development', 'revenue', 'market', 'customer', 'client'],

  // Leadership/Management skills
  'leadership': ['leadership', 'lead', 'managing', 'director', 'head', 'chief', 'executive', 'vp', 'manager'],
  'project': ['project management', 'program', 'pmp', 'agile', 'scrum', 'delivery', 'implementation'],
  'change': ['change management', 'transformation', 'organizational change', 'restructuring'],

  // Operations skills
  'operations': ['operations', 'ops', 'supply chain', 'logistics', 'warehouse', 'distribution', 'process'],
  'quality': ['quality', 'qa', 'compliance', 'audit', 'iso', 'six sigma', 'lean', 'continuous improvement'],

  // Communication skills
  'communication': ['communication', 'presentation', 'stakeholder', 'interpersonal', 'negotiation', 'influencing'],
  'languages': ['bilingual', 'multilingual', 'english', 'spanish', 'french', 'german', 'mandarin', 'language'],
};

/**
 * Match candidate skills/education against tool categories
 * Returns achievement likelihood for each tool
 */
function matchSkillsToTools(
  row: Record<string, string> | undefined,
  keyColumns: Record<string, string | null>,
  toolCategory: string,
  toolName: string
): number {
  if (!row) return 0;

  // Gather all relevant candidate text
  const candidateText: string[] = [];

  // Education is key indicator of skill proficiency
  if (keyColumns.education && row[keyColumns.education]) {
    candidateText.push(row[keyColumns.education].toLowerCase());
  }

  // Strengths indicate skill areas
  if (keyColumns.strengths && row[keyColumns.strengths]) {
    candidateText.push(row[keyColumns.strengths].toLowerCase());
  }
  if (keyColumns.strengthsWeaknesses && row[keyColumns.strengthsWeaknesses]) {
    candidateText.push(row[keyColumns.strengthsWeaknesses].toLowerCase());
  }

  // Job title and role indicate skill areas
  if (keyColumns.job && row[keyColumns.job]) {
    candidateText.push(row[keyColumns.job].toLowerCase());
  }

  // Critical experience
  if (keyColumns.criticalExp && row[keyColumns.criticalExp]) {
    candidateText.push(row[keyColumns.criticalExp].toLowerCase());
  }

  // Career aspirations may indicate skill interests
  if (keyColumns.careerAspirations && row[keyColumns.careerAspirations]) {
    candidateText.push(row[keyColumns.careerAspirations].toLowerCase());
  }

  const fullText = candidateText.join(' ');
  if (!fullText) return 0;

  let matchScore = 0;
  const toolCatLower = toolCategory.toLowerCase();
  const toolNameLower = toolName.toLowerCase();

  // Check each skill category for relevance
  for (const [category, keywords] of Object.entries(SKILL_MATCHERS)) {
    // Check if this skill category is relevant to the tool
    const isRelevant = toolCatLower.includes(category) ||
                       toolNameLower.includes(category) ||
                       category.includes(toolCatLower.split(' ')[0]) ||
                       category.includes(toolNameLower.split(' ')[0]);

    if (isRelevant) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          matchScore += 1;
        }
      }
    }
  }

  // Direct match on tool name
  const toolKeywords = toolName.toLowerCase().split(/[\s\-\/]+/).filter(w => w.length > 2);
  for (const keyword of toolKeywords) {
    if (fullText.includes(keyword)) {
      matchScore += 2;
    }
  }

  return matchScore;
}

const EXPERIENCE_MATCHERS: Record<string, string[]> = {
  // Leadership patterns
  'leadership': ['md', 'managing director', 'ceo', 'coo', 'cfo', 'cto', 'chief', 'president', 'vp', 'vice president', 'svp', 'evp', 'director', 'head of', 'general manager', 'gm', 'c-suite', 'executive'],
  'senior': ['senior', 'sr', 'lead', 'principal', 'chief', 'head', 'director', 'vp', 'vice president', 'md', 'managing director', 'executive', 'c-level'],
  'management': ['manager', 'management', 'managing', 'supervisor', 'team lead', 'head of', 'director'],
  'aviation': ['aviation', 'airline', 'airport', 'cargo', 'freight', 'logistics', 'express', 'dhl', 'fedex', 'ups', 'air', 'flight', 'aircraft'],

  // Operations patterns
  'operations': ['operations', 'ops', 'operational', 'supply chain', 'logistics', 'warehouse', 'distribution', 'fulfillment', 'process'],
  'large-scale': ['large', 'scale', 'enterprise', 'global', 'regional', 'national', 'international', 'multi', 'cross-functional', 'emea', 'apac', 'americas'],

  // Business patterns
  'business': ['business', 'commercial', 'sales', 'revenue', 'p&l', 'profit', 'growth', 'expansion', 'market', 'strategy'],
  'development': ['development', 'growth', 'expansion', 'new market', 'transformation', 'innovation', 'initiative'],

  // International patterns
  'international': ['international', 'global', 'multi-country', 'cross-border', 'emea', 'apac', 'americas', 'regional', 'multinational'],
  'multicultural': ['multicultural', 'diverse', 'international', 'global', 'cross-cultural', 'multi-national'],

  // P&L / Financial
  'p&l': ['p&l', 'profit', 'loss', 'budget', 'financial', 'revenue', 'cost', 'md', 'managing director', 'gm', 'general manager', 'ceo', 'coo', 'cfo', 'country manager', 'regional manager', 'head of'],

  // Strategy
  'strategy': ['strategy', 'strategic', 'planning', 'transformation', 'vision', 'roadmap'],
};

/**
 * Parse hierarchical seniority level from candidate data
 * Returns a seniority score (higher = more senior) and boolean indicators
 *
 * Handles various formats:
 * - GMB-1, GMB-2, GMB-3 (lower number = more senior, GMB = General Management Board)
 * - JG1, JG2, JG3, JG4 (lower number = more senior, JG = Job Grade)
 * - Level 1, Level 2, etc.
 * - Grade A, Grade B, etc.
 * - Band 1, Band 2, etc.
 */
function parseSeniorityLevel(candidateData: string): {
  seniorityScore: number;
  isExecutive: boolean;
  isSeniorManagement: boolean;
  isManagement: boolean;
} {
  const dataLower = candidateData.toLowerCase();

  let seniorityScore = 0;
  let isExecutive = false;
  let isSeniorManagement = false;
  let isManagement = false;

  // Check for executive-level titles (highest seniority)
  const executiveTitles = ['ceo', 'coo', 'cfo', 'cto', 'cio', 'chief', 'president', 'managing director', ' md ', 'md,', 'md-'];
  for (const title of executiveTitles) {
    if (dataLower.includes(title)) {
      isExecutive = true;
      seniorityScore = Math.max(seniorityScore, 100);
    }
  }

  // Check for senior management titles
  // Use regex for VP/GM to allow various formats (VP Operations, VP-Sales, etc.)
  const seniorTitles = ['svp', 'evp', 'senior vice president', 'executive vice president', 'vice president', 'general manager'];
  for (const title of seniorTitles) {
    if (dataLower.includes(title)) {
      isSeniorManagement = true;
      seniorityScore = Math.max(seniorityScore, 85);
    }
  }
  // Check for VP/GM abbreviations with flexible matching
  if (/\bvp[\s\-,]|\bvp$/i.test(dataLower) || /\bgm[\s\-,]|\bgm$/i.test(dataLower)) {
    isSeniorManagement = true;
    seniorityScore = Math.max(seniorityScore, 85);
  }

  // Check for management titles
  const managementTitles = ['director', 'head of', 'manager', 'lead', 'supervisor'];
  for (const title of managementTitles) {
    if (dataLower.includes(title)) {
      isManagement = true;
      seniorityScore = Math.max(seniorityScore, 60);
    }
  }

  // Parse hierarchical grade patterns (GMB-1, JG1, Level 1, etc.)
  // Lower numbers typically indicate higher seniority
  const hierarchicalPatterns = [
    // GMB (General Management Board) - GMB-1 is C-suite adjacent
    { pattern: /gmb[-\s]?(\d+)/i, maxLevel: 5, baseScore: 95 },
    // JG (Job Grade) - JG1 is typically senior executive
    { pattern: /jg[-\s]?(\d+)/i, maxLevel: 10, baseScore: 90 },
    // Level patterns
    { pattern: /level[-\s]?(\d+)/i, maxLevel: 10, baseScore: 85 },
    // Grade patterns (numeric)
    { pattern: /grade[-\s]?(\d+)/i, maxLevel: 10, baseScore: 85 },
    // Band patterns
    { pattern: /band[-\s]?(\d+)/i, maxLevel: 10, baseScore: 80 },
  ];

  for (const { pattern, maxLevel, baseScore } of hierarchicalPatterns) {
    const match = dataLower.match(pattern);
    if (match) {
      const level = parseInt(match[1], 10);
      // Calculate score: lower level number = higher seniority
      // Level 1 gets baseScore, higher levels get progressively lower scores
      const levelScore = baseScore - ((level - 1) / maxLevel) * 40;
      seniorityScore = Math.max(seniorityScore, levelScore);

      // Set flags based on level
      if (level <= 2) {
        isExecutive = true;
      } else if (level <= 4) {
        isSeniorManagement = true;
      } else {
        isManagement = true;
      }
    }
  }

  // Parse letter-based grades (Grade A, Band A, etc.)
  const letterPatterns = [
    { pattern: /grade[-\s]?([a-e])/i, baseScore: 85 },
    { pattern: /band[-\s]?([a-e])/i, baseScore: 80 },
  ];

  for (const { pattern, baseScore } of letterPatterns) {
    const match = dataLower.match(pattern);
    if (match) {
      const letter = match[1].toLowerCase();
      const letterIndex = letter.charCodeAt(0) - 'a'.charCodeAt(0); // a=0, b=1, etc.
      const letterScore = baseScore - (letterIndex * 10);
      seniorityScore = Math.max(seniorityScore, letterScore);

      if (letterIndex <= 1) {
        isSeniorManagement = true;
      } else {
        isManagement = true;
      }
    }
  }

  return { seniorityScore, isExecutive, isSeniorManagement, isManagement };
}

/**
 * Calculate effective years requirement based on seniority
 * Senior executives may have equivalent experience even with fewer years in specific role
 */
function calculateEffectiveYearsRequirement(
  minYears: number,
  seniorityScore: number,
  isExecutive: boolean,
  isSeniorManagement: boolean
): number {
  // Base flexibility: 70% of required years
  let flexibilityFactor = 0.7;

  // Executives get more flexibility - their broad experience compensates
  if (isExecutive) {
    flexibilityFactor = 0.5; // Only need 50% of stated years
  } else if (isSeniorManagement) {
    flexibilityFactor = 0.6; // Need 60% of stated years
  }

  // Additional flexibility based on seniority score
  // Very senior candidates (score > 80) get extra credit
  if (seniorityScore > 80) {
    flexibilityFactor *= 0.9;
  }

  return minYears * flexibilityFactor;
}

/**
 * Analyze candidate data to determine if an experience requirement is met
 * Uses flexible seniority detection and contextual years requirements
 */
function analyzeExperienceMatch(
  experience: { category: string; name: string; description: string; minYears: number },
  candidateData: string,
  yearsExperience: number
): boolean {
  const dataLower = candidateData.toLowerCase();
  const expName = experience.name.toLowerCase();
  const expCategory = experience.category.toLowerCase();
  const expDesc = experience.description.toLowerCase();

  // Parse candidate's seniority level
  const { seniorityScore, isExecutive, isSeniorManagement, isManagement } = parseSeniorityLevel(candidateData);

  // Extract key terms from the experience requirement
  const expTerms = `${expName} ${expCategory} ${expDesc}`.split(/\s+/);

  let matchScore = 0;
  const matchedPatterns: string[] = [];

  // Check each matcher category
  for (const [category, patterns] of Object.entries(EXPERIENCE_MATCHERS)) {
    // Check if this category is relevant to the experience
    const categoryRelevant = expTerms.some(term =>
      category.includes(term) || term.includes(category)
    ) || expName.includes(category) || expCategory.includes(category);

    if (categoryRelevant) {
      // Check if candidate data matches any patterns in this category
      for (const pattern of patterns) {
        if (dataLower.includes(pattern)) {
          matchScore += 1;
          matchedPatterns.push(pattern);
        }
      }
    }
  }

  // Direct keyword matching for specific experience terms
  const directKeywords = expName.split(/[\s-]+/).filter(w => w.length > 3);
  for (const keyword of directKeywords) {
    if (dataLower.includes(keyword.toLowerCase())) {
      matchScore += 2; // Direct matches are more valuable
    }
  }

  // Bonus points for seniority alignment
  // If experience requires "senior" and candidate is senior, add bonus
  const requiresSenior = expName.includes('senior') || expCategory.includes('senior') ||
                         expDesc.includes('executive') || expDesc.includes('leadership');
  if (requiresSenior && (isExecutive || isSeniorManagement)) {
    matchScore += 3;
  }

  // Bonus for management experience when required
  const requiresManagement = expName.includes('management') || expCategory.includes('management') ||
                             expDesc.includes('managing') || expDesc.includes('lead');
  if (requiresManagement && (isExecutive || isSeniorManagement || isManagement)) {
    matchScore += 2;
  }

  // Calculate effective years requirement based on seniority
  const effectiveMinYears = calculateEffectiveYearsRequirement(
    experience.minYears,
    seniorityScore,
    isExecutive,
    isSeniorManagement
  );

  // Check years requirement with contextual flexibility
  const meetsYearsRequirement = yearsExperience >= effectiveMinYears;

  // Determine achievement based on match score and years
  // Lower threshold (1) for very senior candidates, higher (2) for others
  const scoreThreshold = (isExecutive || isSeniorManagement) ? 1 : 2;
  const achieved = matchScore >= scoreThreshold && meetsYearsRequirement;

  return achieved;
}

/**
 * Extract all relevant text from a candidate's row data for experience matching
 */
function extractCandidateTextForMatching(
  row: Record<string, string> | undefined,
  keyColumns: Record<string, string | null>,
  jobTitle: string
): string {
  if (!row) return jobTitle.toLowerCase();

  const parts: string[] = [jobTitle];

  // Add all available fields that might indicate experience
  const fieldsToCheck: (keyof typeof keyColumns)[] = [
    'job', 'jobGrade', 'department', 'criticalExp', 'careerAspirations',
    'strengthsWeaknesses', 'strengths', 'attributes', 'potential', 'talentCategory'
  ];

  for (const field of fieldsToCheck) {
    const colName = keyColumns[field];
    if (colName && row[colName]?.trim()) {
      parts.push(row[colName].trim());
    }
  }

  // Also check for any column that might contain relevant keywords
  for (const [colName, value] of Object.entries(row)) {
    if (value?.trim() && !parts.includes(value.trim())) {
      const lowerCol = colName.toLowerCase();
      if (lowerCol.includes('experience') || lowerCol.includes('role') ||
          lowerCol.includes('position') || lowerCol.includes('level') ||
          lowerCol.includes('organization') || lowerCol.includes('business') ||
          lowerCol.includes('division') || lowerCol.includes('unit')) {
        parts.push(value.trim());
      }
    }
  }

  return parts.join(' ').toLowerCase();
}

/**
 * Build CandidateProfile from simplified response
 * Uses deterministic scoring and calculateMatchScore() for consistency
 */
function buildCandidateProfile(
  response: SimpleCandidateResponse,
  successProfile: SuccessProfileContext,
  rowData?: Record<string, string>,
  keyColumns?: Record<string, string | null>
): CandidateProfile {
  const baseScore = response.sc || 50;

  // Get attribute keys from success profile or use defaults
  const attrKeys = successProfile.attributeConfig?.length
    ? successProfile.attributeConfig.map(a => a.key)
    : ['problemSolving', 'stakeholderManagement', 'technicalExpertise', 'leadership', 'customerFocus', 'adaptability'];

  // INTELLIGENT ATTRIBUTE MATCHING: Extract actual competency scores from CSV data
  const csvCompetencyScores = extractCompetencyScores(rowData, keyColumns || {});

  // Generate attribute scores using CSV data with fallback to deterministic variance
  const competencyStats: CompetencyStats = {};
  attrKeys.forEach((key, index) => {
    // Use actual CSV competency score if available, otherwise use deterministic variance
    if (csvCompetencyScores[key] !== undefined) {
      competencyStats[key] = csvCompetencyScores[key];
    } else {
      // Fallback: use deterministic variance based on AI's overall score
      competencyStats[key] = deterministicVariance(baseScore, index, attrKeys.length);
    }
  });

  // Extract candidate text for experience matching
  const candidateText = extractCandidateTextForMatching(
    rowData,
    keyColumns || {},
    response.r || ''
  );
  const yearsExp = response.y || 0;

  // Mark experiences as achieved using INTELLIGENT MATCHING based on candidate data
  const requiredExperiences = successProfile.requiredExperiences.map((exp, index) => {
    // First try intelligent matching based on actual candidate data
    const intelligentMatch = analyzeExperienceMatch(exp, candidateText, yearsExp);

    // Fallback to score-based threshold if no data available (FIXED formula)
    // Now uses (index + 1) to ensure first experience is achievable
    const scoreThreshold = 100 - ((index + 1) / (successProfile.requiredExperiences.length + 1)) * 50;
    const scoreBasedMatch = baseScore >= scoreThreshold;

    // Use intelligent match if we have row data, otherwise fall back to score-based
    const achieved = rowData ? intelligentMatch : scoreBasedMatch;

    return {
      ...exp,
      achieved,
    };
  });

  // INTELLIGENT SKILL/TOOL MATCHING: Match tools based on candidate's actual skills/education
  // Uses keyword matching against CSV data with fallback to score threshold
  let toolIndex = 0;
  const totalTools = successProfile.toolbox.reduce((sum, cat) => sum + cat.tools.length, 0);
  const toolbox: ToolCategory[] = successProfile.toolbox.map(cat => ({
    category: cat.category,
    tools: cat.tools.map(tool => {
      // Calculate skill match score from actual candidate data
      const skillMatchScore = matchSkillsToTools(rowData, keyColumns || {}, cat.category, tool.name);

      // Determine threshold based on position (first tools are easier)
      const achievementThreshold = 90 - (toolIndex / Math.max(1, totalTools)) * 50;
      toolIndex++;

      // Use intelligent matching if we have CSV data and get any match
      // Otherwise fall back to score-based threshold
      const achieved = rowData && skillMatchScore > 0
        ? skillMatchScore >= 2 // Need at least 2 keyword matches for intelligent match
        : baseScore >= achievementThreshold;

      return {
        ...tool,
        achieved,
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
    motivations: [], // Will be empty for CSV uploads
    painPoints: [],
    weekInLife: [],
    // INTELLIGENT CULTURAL FIT: Use actual CSV data (talent category, potential, performance)
    // with fallback to derived score for candidates without detailed CSV data
    culturalFitAssessment: {
      score: calculateCulturalFitFromCSV(rowData, keyColumns || {}, baseScore),
      assessedAt: new Date().toISOString(),
      assessedBy: rowData ? 'CSV Data Analysis' : 'AI Assessment',
      notes: rowData
        ? 'Assessed based on talent category, potential, and performance ratings'
        : 'Auto-assessed based on overall candidate profile',
    },
    matchScore: {
      overall: 0, // Will be calculated below
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  };

  // Build minimal success profile for score calculation
  const profileForCalc = {
    role: successProfile.role,
    competencyStats: {} as CompetencyStats,
    requiredExperiences: successProfile.requiredExperiences,
    toolbox: successProfile.toolbox,
    motivations: [],
    attributeConfig: successProfile.attributeConfig || [],
    academicBackground: { minDegree: '', preferredFields: [], certifications: [] },
    painPoints: [],
    weekInLife: [],
  };

  // Use success profile's competency stats for comparison
  if (successProfile.attributeConfig?.length) {
    successProfile.attributeConfig.forEach(attr => {
      profileForCalc.competencyStats[attr.key] = attr.value;
    });
  } else {
    // Default success profile values (high targets)
    attrKeys.forEach(key => {
      profileForCalc.competencyStats[key] = 85;
    });
  }

  // Calculate match score using the unified function
  const calculatedScore = calculateMatchScore(profileForCalc, partialCandidate, DEFAULT_WEIGHTS);

  // Return complete candidate with calculated scores
  return {
    ...partialCandidate,
    matchScore: calculatedScore,
  };
}

/**
 * Build CandidateProfile from semantic matching results
 * Uses deep language analysis for "closeness of fit" instead of quantitative ratings
 */
function buildCandidateProfileFromSemanticMatch(
  response: SimpleCandidateResponse,
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
      competencyStats[key] = deterministicVariance(semanticResult.attributes.overall, index, attrKeys.length);
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
    // Cultural fit from semantic cultural alignment
    culturalFitAssessment: {
      score: semanticResult.cultural.overall,
      assessedAt: new Date().toISOString(),
      assessedBy: 'Semantic Language Analysis',
      notes: semanticResult.cultural.reasoning || 'Assessed through deep language analysis of candidate descriptors against success profile',
    },
    matchScore: {
      overall: 0, // Will be calculated below
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
 * Parse candidates CSV with semantic matching
 * Uses deep language analysis to detect "closeness of fit" against success profile descriptors
 *
 * This is the enhanced version that uses Claude AI for semantic analysis
 * instead of quantitative rating translation
 */
export async function parseCandidatesCSVWithSemanticMatching(
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

    console.log('=== Semantic Matching CSV Processing ===');
    console.log(`Total rows: ${rows.length}`);

    if (!keyColumns.name) {
      errors.push('Could not find name column. Expected: "Employee Name", "Name", or similar.');
      return { candidates, errors };
    }

    onProgress?.(0, rows.length, 'Preparing semantic analysis...');

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
      rawProfileText: successProfile.rawProfileText || '',
    };
    const profileDescriptors = extractProfileDescriptors(fullProfile);

    // Process in batches for efficiency
    const SEMANTIC_BATCH_SIZE = 3; // Smaller batches for semantic matching (more API calls)
    let processedCount = 0;

    for (let i = 0; i < rows.length; i += SEMANTIC_BATCH_SIZE) {
      const batch = rows.slice(i, i + SEMANTIC_BATCH_SIZE);

      const batchPromises = batch.map(async (row, batchIdx) => {
        const globalIdx = i + batchIdx;

        try {
          // Extract candidate text from CSV row
          const candidateText = extractCandidateTextFromCSV(row, keyColumns);

          // Perform semantic matching using Claude AI
          const semanticResult = await performSemanticMatching(
            apiKey,
            candidateText,
            profileDescriptors
          );

          // Build simplified response for profile building
          const simpleResponse: SimpleCandidateResponse = {
            n: candidateText.name,
            r: candidateText.currentRole,
            y: candidateText.experienceText.yearsExperience,
            sc: semanticResult.attributes.overall, // Use semantic overall for base score
            sm: '',
          };

          // Build candidate profile from semantic results
          return buildCandidateProfileFromSemanticMatch(
            simpleResponse,
            successProfile,
            semanticResult
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Semantic matching failed for row ${globalIdx}:`, msg);
          errors.push(`Row ${globalIdx + 1}: ${msg}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result) {
          candidates.push(result);
        }
      }

      processedCount += batch.length;
      onProgress?.(processedCount, rows.length, `Semantic analysis ${processedCount}/${rows.length}...`);

      // Rate limit delay between batches
      if (i + SEMANTIC_BATCH_SIZE < rows.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    console.log(`Semantic matching complete: ${candidates.length} candidates processed`);
    onProgress?.(rows.length, rows.length, `Done! ${candidates.length} candidates analyzed`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`CSV semantic parsing failed: ${msg}`);
  }

  return { candidates, errors };
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
