/**
 * Claude AI-based Candidates CSV Parser
 * Optimized for processing up to 800 candidates efficiently
 * Uses parallel batch processing with simplified response format
 */

import Papa from 'papaparse';
import type { CandidateProfile, CompetencyStats, ToolCategory, AttributeConfig } from '../types';
import { calculateMatchScore, DEFAULT_WEIGHTS } from './calculateMatch';

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
const EXPERIENCE_MATCHERS: Record<string, string[]> = {
  // Leadership patterns
  'leadership': ['md', 'managing director', 'ceo', 'coo', 'cfo', 'cto', 'chief', 'president', 'vp', 'vice president', 'svp', 'evp', 'director', 'head of', 'general manager', 'gm', 'gmb', 'c-suite', 'executive'],
  'senior': ['senior', 'sr', 'lead', 'principal', 'chief', 'head', 'director', 'vp', 'vice president', 'md', 'managing director', 'gmb', 'gm-', 'jg1', 'jg2', 'jg3', 'executive', 'c-level'],
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
 * Analyze candidate data to determine if an experience requirement is met
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

  // Extract key terms from the experience requirement
  const expTerms = `${expName} ${expCategory} ${expDesc}`.split(/\s+/);

  let matchScore = 0;
  let matchedPatterns: string[] = [];

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

  // Check years requirement (with some flexibility)
  const meetsYearsRequirement = yearsExperience >= (experience.minYears * 0.7); // 70% threshold for flexibility

  // Determine achievement based on match score and years
  // Higher match scores = more confident the candidate has the experience
  const achieved = matchScore >= 2 && meetsYearsRequirement;

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

  // Generate DETERMINISTIC attribute scores based on overall score with predictable variance
  const competencyStats: CompetencyStats = {};
  attrKeys.forEach((key, index) => {
    competencyStats[key] = deterministicVariance(baseScore, index, attrKeys.length);
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

  // Mark tools as achieved DETERMINISTICALLY based on score threshold and position
  // FIXED formula: ensures all tools are potentially achievable
  let toolIndex = 0;
  const totalTools = successProfile.toolbox.reduce((sum, cat) => sum + cat.tools.length, 0);
  const toolbox: ToolCategory[] = successProfile.toolbox.map(cat => ({
    category: cat.category,
    tools: cat.tools.map(tool => {
      // Fixed threshold calculation - now first tool requires ~90, last requires ~40
      const achievementThreshold = 90 - (toolIndex / Math.max(1, totalTools)) * 50;
      toolIndex++;
      return {
        ...tool,
        achieved: baseScore >= achievementThreshold,
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
    // Initialize cultural fit based on AI's overall assessment
    // This gives CSV candidates a reasonable cultural baseline
    culturalFitAssessment: {
      score: Math.round(baseScore * 0.8), // Derive from overall score (80% of base)
      assessedAt: new Date().toISOString(),
      assessedBy: 'AI Assessment',
      notes: 'Auto-assessed based on overall candidate profile',
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
