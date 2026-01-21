/**
 * Semantic Matching Module
 *
 * Provides deep language and sentence structure analysis to detect "closeness of fit"
 * between candidate data and success profile descriptors.
 *
 * Works with both CSV and PDF file formats.
 * Does NOT use quantitative ratings - uses semantic/contextual analysis instead.
 */

import type { SuccessProfile } from '../types';

const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

/**
 * Success Profile Descriptors extracted for semantic matching
 */
export interface ProfileDescriptors {
  // Role context
  roleTitle: string;
  roleDescription: string;
  roleLevel: string;

  // Attributes: behavioral and leadership traits
  attributeDescriptors: Array<{
    key: string;
    label: string;
    description: string; // Combined from responsibilities/accountabilities
  }>;

  // Experience: work history expectations
  experienceDescriptors: Array<{
    name: string;
    category: string;
    description: string;
    context: string; // Decision rights, accountabilities
  }>;

  // Skills: qualifications and competencies
  skillDescriptors: Array<{
    name: string;
    category: string;
    context: string; // How this skill is used in the role
  }>;

  // Cultural: motivations and pain points
  culturalDescriptors: {
    motivations: string[];
    painPoints: string[];
    values: string[]; // Inferred from role description
  };
}

/**
 * Candidate Text extracted for semantic matching
 */
export interface CandidateText {
  // Personal context
  name: string;
  currentRole: string;

  // Attributes: behavioral indicators
  attributeText: {
    strengths: string;
    weaknesses: string;
    managingSelf: string;
    managingInterpersonal: string;
    managingOrganisational: string;
    managingPerformance: string;
    attributesOfPotential: string;
    otherBehavioral: string;
  };

  // Experience: career history
  experienceText: {
    careerHistory: string;
    jobTitles: string;
    responsibilities: string;
    achievements: string;
    yearsExperience: number;
  };

  // Skills: qualifications
  skillText: {
    education: string;
    certifications: string;
    technicalSkills: string;
    professionalDiscipline: string;
    toolsUsed: string;
  };

  // Cultural: values and motivations
  culturalText: {
    explicitStrengths: string;
    inferredStrengths: string;
    careerAspirations: string;
    workStyle: string;
    values: string;
  };
}

/**
 * Semantic Match Result for each dimension
 */
export interface SemanticMatchResult {
  // Scores are 0-100 representing "closeness of fit"
  attributes: {
    overall: number;
    breakdown: Record<string, { score: number; reasoning: string }>;
  };

  experiences: {
    overall: number;
    breakdown: Array<{ name: string; achieved: boolean; fitScore: number; reasoning: string }>;
  };

  skills: {
    overall: number;
    breakdown: Array<{ name: string; achieved: boolean; fitScore: number; reasoning: string }>;
  };

  cultural: {
    overall: number;
    motivationAlignment: number;
    painPointUnderstanding: number;
    reasoning: string;
  };
}

/**
 * Extract descriptors from success profile for semantic matching
 */
export function extractProfileDescriptors(profile: SuccessProfile): ProfileDescriptors {
  // Extract attribute descriptors with behavioral context
  const attributeDescriptors = (profile.attributeConfig || []).map(attr => ({
    key: attr.key,
    label: attr.label,
    description: `${attr.label} competency as demonstrated through responsibilities and accountabilities in a ${profile.role.title} role at ${profile.role.level} level.`,
  }));

  // Extract experience descriptors with decision context
  const experienceDescriptors = profile.requiredExperiences.map(exp => ({
    name: exp.name,
    category: exp.category,
    description: exp.description,
    context: `Required for ${profile.role.title}: ${exp.description}. Minimum ${exp.minYears} years expected.`,
  }));

  // Extract skill descriptors with usage context
  const skillDescriptors = profile.toolbox.flatMap(cat =>
    cat.tools.map(tool => ({
      name: tool.name,
      category: cat.category,
      context: `${tool.name} proficiency in the context of ${cat.category} for a ${profile.role.title} role.`,
    }))
  );

  // Extract cultural descriptors
  const culturalDescriptors = {
    motivations: profile.motivations || [],
    painPoints: profile.painPoints || [],
    values: extractValuesFromRole(profile.role.description || '', profile.role.title),
  };

  return {
    roleTitle: profile.role.title,
    roleDescription: profile.role.description || '',
    roleLevel: profile.role.level,
    attributeDescriptors,
    experienceDescriptors,
    skillDescriptors,
    culturalDescriptors,
  };
}

/**
 * Infer organizational values from role description
 */
function extractValuesFromRole(description: string, _title: string): string[] {
  const values: string[] = [];
  const descLower = description.toLowerCase();

  // Infer values based on common role characteristics
  if (descLower.includes('customer') || descLower.includes('client')) {
    values.push('Customer-centricity');
  }
  if (descLower.includes('innovation') || descLower.includes('transform')) {
    values.push('Innovation and continuous improvement');
  }
  if (descLower.includes('team') || descLower.includes('collaborat')) {
    values.push('Collaboration and teamwork');
  }
  if (descLower.includes('integrit') || descLower.includes('ethic')) {
    values.push('Integrity and ethical conduct');
  }
  if (descLower.includes('result') || descLower.includes('performance') || descLower.includes('deliver')) {
    values.push('Results orientation');
  }
  if (descLower.includes('global') || descLower.includes('international') || descLower.includes('diverse')) {
    values.push('Global mindset and diversity');
  }

  // Add default values if none inferred
  if (values.length === 0) {
    values.push('Professional excellence', 'Accountability', 'Adaptability');
  }

  return values;
}

/**
 * Extract candidate text from CSV row data
 */
export function extractCandidateTextFromCSV(
  row: Record<string, string>,
  keyColumns: Record<string, string | null>
): CandidateText {
  const getField = (key: string): string => {
    const colName = keyColumns[key];
    return colName && row[colName] ? row[colName].trim() : '';
  };

  // Gather all text from the row for full context
  const allRowText = Object.values(row).filter(v => v && v.trim()).join(' ');

  return {
    name: getField('name') || 'Unknown',
    currentRole: getField('job') || '',

    attributeText: {
      strengths: getField('strengths') || '',
      weaknesses: getField('weaknesses') || '',
      managingSelf: getField('managingSelf') || '',
      managingInterpersonal: getField('managingInterpersonal') || '',
      managingOrganisational: getField('managingOrganisational') || '',
      managingPerformance: getField('managingPerformance') || '',
      attributesOfPotential: getField('attributes') || '',
      otherBehavioral: getField('strengthsWeaknesses') || '',
    },

    experienceText: {
      careerHistory: `${getField('job')} ${getField('department')} ${getField('criticalExp')}`,
      jobTitles: getField('job') || '',
      responsibilities: getField('criticalExp') || '',
      achievements: getField('strengthsWeaknesses') || '',
      yearsExperience: parseInt(getField('tenure') || '0', 10) || 0,
    },

    skillText: {
      education: getField('education') || '',
      certifications: '', // Extract from education if present
      technicalSkills: extractTechnicalSkills(allRowText),
      professionalDiscipline: inferDiscipline(getField('job'), getField('education')),
      toolsUsed: extractToolsFromText(allRowText),
    },

    culturalText: {
      explicitStrengths: getField('strengths') || getField('strengthsWeaknesses') || '',
      inferredStrengths: inferStrengthsFromRole(getField('job'), getField('attributes')),
      careerAspirations: getField('careerAspirations') || getField('nextRole') || '',
      workStyle: inferWorkStyle(getField('managingSelf'), getField('managingInterpersonal')),
      values: inferValuesFromText(allRowText),
    },
  };
}

/**
 * Extract candidate text from PDF/resume text
 */
export function extractCandidateTextFromPDF(
  resumeText: string,
  name: string,
  currentRole: string,
  yearsExperience: number
): CandidateText {
  return {
    name,
    currentRole,

    attributeText: {
      strengths: extractSection(resumeText, ['strengths', 'key skills', 'core competencies', 'achievements']),
      weaknesses: '',
      managingSelf: extractBehavioralIndicators(resumeText, 'self-management'),
      managingInterpersonal: extractBehavioralIndicators(resumeText, 'interpersonal'),
      managingOrganisational: extractBehavioralIndicators(resumeText, 'organizational'),
      managingPerformance: extractBehavioralIndicators(resumeText, 'performance'),
      attributesOfPotential: extractSection(resumeText, ['leadership', 'potential', 'growth']),
      otherBehavioral: '',
    },

    experienceText: {
      careerHistory: resumeText, // Full resume for experience matching
      jobTitles: extractJobTitles(resumeText),
      responsibilities: extractSection(resumeText, ['responsibilities', 'duties', 'accountabilities']),
      achievements: extractSection(resumeText, ['achievements', 'accomplishments', 'results']),
      yearsExperience,
    },

    skillText: {
      education: extractSection(resumeText, ['education', 'academic', 'degree', 'university']),
      certifications: extractSection(resumeText, ['certification', 'certificate', 'certified']),
      technicalSkills: extractSection(resumeText, ['technical skills', 'technologies', 'tools']),
      professionalDiscipline: inferDiscipline(currentRole, extractSection(resumeText, ['education'])),
      toolsUsed: extractToolsFromText(resumeText),
    },

    culturalText: {
      explicitStrengths: extractSection(resumeText, ['strengths', 'skills', 'expertise']),
      inferredStrengths: inferStrengthsFromRole(currentRole, resumeText),
      careerAspirations: extractSection(resumeText, ['objective', 'goal', 'aspiration', 'seeking']),
      workStyle: inferWorkStyle(resumeText, ''),
      values: inferValuesFromText(resumeText),
    },
  };
}

// Helper functions for text extraction

function extractSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  const relevantLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    if (keywords.some(kw => lineLower.includes(kw))) {
      // Include this line and a few following lines
      relevantLines.push(...lines.slice(i, i + 5));
    }
  }

  return relevantLines.join(' ').substring(0, 500);
}

function extractJobTitles(text: string): string {
  // Common job title patterns
  const titlePatterns = [
    /(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*[-–]\s*[A-Z][a-z]+)/gm,
    /(?:position|title|role):\s*([^\n]+)/gi,
    /(CEO|CFO|COO|CTO|VP|Director|Manager|Lead|Head|Chief)[^\n]*/gi,
  ];

  const titles: string[] = [];
  for (const pattern of titlePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      titles.push(...matches.slice(0, 5));
    }
  }

  return titles.join(', ').substring(0, 300);
}

function extractBehavioralIndicators(text: string, type: string): string {
  const indicators: Record<string, string[]> = {
    'self-management': ['self-directed', 'autonomous', 'initiative', 'self-motivated', 'independent'],
    'interpersonal': ['collaborated', 'partnered', 'communicated', 'negotiated', 'influenced', 'stakeholder'],
    'organizational': ['implemented', 'established', 'designed', 'structured', 'developed systems'],
    'performance': ['achieved', 'delivered', 'exceeded', 'results', 'KPI', 'metrics', 'performance'],
  };

  const keywords = indicators[type] || [];

  const relevantSentences: string[] = [];
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (keywords.some(kw => sentence.toLowerCase().includes(kw))) {
      relevantSentences.push(sentence.trim());
    }
  }

  return relevantSentences.slice(0, 3).join('. ').substring(0, 300);
}

function extractTechnicalSkills(text: string): string {
  const techKeywords = [
    'SAP', 'Oracle', 'Excel', 'PowerPoint', 'SQL', 'Python', 'Java',
    'Salesforce', 'Tableau', 'Power BI', 'CRM', 'ERP', 'AWS', 'Azure',
    'analytics', 'data', 'digital', 'software', 'systems', 'platform'
  ];

  const found = techKeywords.filter(kw =>
    text.toLowerCase().includes(kw.toLowerCase())
  );

  return found.join(', ');
}

function extractToolsFromText(text: string): string {
  return extractTechnicalSkills(text);
}

function inferDiscipline(role: string, education: string): string {
  const combined = `${role} ${education}`.toLowerCase();

  if (combined.includes('finance') || combined.includes('accounting') || combined.includes('cfo')) {
    return 'Finance/Accounting';
  }
  if (combined.includes('engineer') || combined.includes('technical') || combined.includes('it')) {
    return 'Engineering/Technology';
  }
  if (combined.includes('marketing') || combined.includes('sales') || combined.includes('commercial')) {
    return 'Marketing/Sales';
  }
  if (combined.includes('hr') || combined.includes('human resource') || combined.includes('people')) {
    return 'Human Resources';
  }
  if (combined.includes('operation') || combined.includes('supply') || combined.includes('logistics')) {
    return 'Operations/Supply Chain';
  }
  if (combined.includes('legal') || combined.includes('compliance')) {
    return 'Legal/Compliance';
  }

  return 'General Management';
}

function inferStrengthsFromRole(role: string, context: string): string {
  const combined = `${role} ${context}`.toLowerCase();
  const strengths: string[] = [];

  if (combined.includes('director') || combined.includes('head') || combined.includes('vp')) {
    strengths.push('Strategic leadership');
  }
  if (combined.includes('manager') || combined.includes('lead')) {
    strengths.push('Team management');
  }
  if (combined.includes('senior') || combined.includes('principal')) {
    strengths.push('Deep expertise');
  }
  if (combined.includes('global') || combined.includes('regional') || combined.includes('international')) {
    strengths.push('Cross-cultural competence');
  }

  return strengths.join(', ');
}

function inferWorkStyle(managingSelf: string, managingInterpersonal: string): string {
  const combined = `${managingSelf} ${managingInterpersonal}`.toLowerCase();
  const styles: string[] = [];

  if (combined.includes('exceed') || combined.includes('outstanding')) {
    styles.push('High performer');
  }
  if (combined.includes('collaborat') || combined.includes('team')) {
    styles.push('Collaborative');
  }
  if (combined.includes('independen') || combined.includes('autonomous')) {
    styles.push('Self-directed');
  }

  return styles.join(', ') || 'Professional';
}

function inferValuesFromText(text: string): string {
  const textLower = text.toLowerCase();
  const values: string[] = [];

  if (textLower.includes('integrit') || textLower.includes('ethic') || textLower.includes('honest')) {
    values.push('Integrity');
  }
  if (textLower.includes('innovat') || textLower.includes('creative') || textLower.includes('improve')) {
    values.push('Innovation');
  }
  if (textLower.includes('customer') || textLower.includes('client') || textLower.includes('service')) {
    values.push('Customer focus');
  }
  if (textLower.includes('team') || textLower.includes('collaborat') || textLower.includes('together')) {
    values.push('Teamwork');
  }
  if (textLower.includes('excel') || textLower.includes('quality') || textLower.includes('standard')) {
    values.push('Excellence');
  }

  return values.join(', ');
}

/**
 * Perform semantic matching using Claude AI
 * This is the core function that analyzes "closeness of fit" through deep language analysis
 */
export async function performSemanticMatching(
  apiKey: string,
  candidateText: CandidateText,
  profileDescriptors: ProfileDescriptors
): Promise<SemanticMatchResult> {
  const prompt = buildSemanticMatchingPrompt(candidateText, profileDescriptors);

  const response = await fetch(CLAUDE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022', // Fast model for batch processing
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Semantic matching API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No content in semantic matching response');
  }

  return parseSemanticMatchingResponse(content, profileDescriptors);
}

/**
 * Build the prompt for semantic matching analysis
 */
function buildSemanticMatchingPrompt(
  candidate: CandidateText,
  profile: ProfileDescriptors
): string {
  return `You are an expert talent assessment analyst. Analyze the semantic "closeness of fit" between a candidate and a success profile.

## CRITICAL DISTINCTION: FUNCTIONAL ROLE vs INDUSTRY
This is the most important concept for accurate matching:

1. **FUNCTIONAL ROLE/EXPERTISE** = What the candidate DOES (their job function)
   - Examples: Finance, Operations, Marketing, Engineering, HR, Legal, Sales
   - A "Finance Director at an airline" has FINANCE expertise, NOT aviation operations expertise
   - A "VP Operations at a bank" has OPERATIONS expertise in banking, NOT financial trading expertise

2. **INDUSTRY** = What sector/company they work FOR
   - Examples: Aviation, Healthcare, Manufacturing, Retail, Banking
   - Working FOR an aviation company does NOT mean having aviation operations expertise
   - A CFO at Boeing has Finance expertise in the aviation INDUSTRY, not aviation/aerospace engineering expertise

## EXPERIENCE MATCHING RULES (VERY IMPORTANT):
When matching required experiences like "Aviation Experience" or "Operations Experience":
- ✅ ACHIEVED = Candidate's JOB FUNCTION directly involves the required domain
- ❌ NOT ACHIEVED = Candidate merely works in that INDUSTRY but different function

Examples:
- "Aviation, Logistics, or Cargo Handling Experience" requirement:
  - ✅ VP Operations at cargo airline (function IS operations/logistics)
  - ✅ Supply Chain Director at aviation company (function IS logistics)
  - ❌ Finance Director at aviation company (function is Finance, not operations)
  - ❌ HR Manager at cargo handling company (function is HR, not cargo operations)

- "Manufacturing Experience" requirement:
  - ✅ Plant Manager at auto company (function IS manufacturing)
  - ❌ CFO at manufacturing company (function is Finance)
  - ❌ Legal Counsel at factory (function is Legal)

## IMPORTANT: Use LANGUAGE ANALYSIS, not quantitative ratings
- Do NOT convert text like "Exceeds" or "Meets" to scores
- Instead, analyze the MEANING and CONTEXT of descriptions
- Look for semantic similarity between candidate descriptors and role requirements
- Consider synonyms, related concepts, and implied capabilities

## Success Profile: ${profile.roleTitle} (${profile.roleLevel})
${profile.roleDescription}

### Required Attributes (Behavioral/Leadership Traits):
${profile.attributeDescriptors.map(a => `- ${a.label}: ${a.description}`).join('\n')}

### Required Experiences (Work History Expectations):
${profile.experienceDescriptors.map(e => `- ${e.name} (${e.category}): ${e.context}`).join('\n')}

### Required Skills (Qualifications/Competencies):
${profile.skillDescriptors.map(s => `- ${s.name} (${s.category}): ${s.context}`).join('\n')}

### Cultural Fit Indicators:
Motivations: ${profile.culturalDescriptors.motivations.join(', ') || 'Not specified'}
Pain Points to Address: ${profile.culturalDescriptors.painPoints.join(', ') || 'Not specified'}
Organizational Values: ${profile.culturalDescriptors.values.join(', ')}

## Candidate: ${candidate.name}
Current Role: ${candidate.currentRole}
Professional Discipline: ${candidate.skillText.professionalDiscipline || 'Unknown'}
Years Experience: ${candidate.experienceText.yearsExperience}

### Candidate's Behavioral Indicators:
Strengths: ${candidate.attributeText.strengths || 'Not specified'}
Self-Management: ${candidate.attributeText.managingSelf || 'Not specified'}
Interpersonal: ${candidate.attributeText.managingInterpersonal || 'Not specified'}
Organizational: ${candidate.attributeText.managingOrganisational || 'Not specified'}
Performance: ${candidate.attributeText.managingPerformance || 'Not specified'}
Potential Attributes: ${candidate.attributeText.attributesOfPotential || 'Not specified'}
Other: ${candidate.attributeText.otherBehavioral || 'Not specified'}

### Candidate's Career History:
Job Titles: ${candidate.experienceText.jobTitles || 'Not specified'}
Responsibilities: ${candidate.experienceText.responsibilities || 'Not specified'}
Achievements: ${candidate.experienceText.achievements || 'Not specified'}

### Candidate's Qualifications:
Education: ${candidate.skillText.education || 'Not specified'}
Certifications: ${candidate.skillText.certifications || 'Not specified'}
Technical Skills: ${candidate.skillText.technicalSkills || 'Not specified'}
Professional Discipline: ${candidate.skillText.professionalDiscipline || 'Not specified'}

### Candidate's Cultural Indicators:
Explicit Strengths: ${candidate.culturalText.explicitStrengths || 'Not specified'}
Inferred Strengths: ${candidate.culturalText.inferredStrengths || 'Not specified'}
Career Aspirations: ${candidate.culturalText.careerAspirations || 'Not specified'}
Work Style: ${candidate.culturalText.workStyle || 'Not specified'}
Values: ${candidate.culturalText.values || 'Not specified'}

## ANALYSIS TASK:
For each dimension, analyze the SEMANTIC CLOSENESS between candidate descriptors and profile requirements.

CRITICAL FOR EXPERIENCE MATCHING:
- Carefully identify the candidate's FUNCTIONAL EXPERTISE from their job titles and responsibilities
- Only mark experience as "achieved" if the candidate's FUNCTION matches the required domain
- Do NOT credit industry exposure as functional expertise

Respond with ONLY valid JSON (no markdown):
{
  "attributes": {
    "overall": <0-100 closeness score>,
    "breakdown": {
${profile.attributeDescriptors.map(a => `      "${a.key}": {"score": <0-100>, "reasoning": "<brief explanation of semantic fit>"}`).join(',\n')}
    }
  },
  "experiences": {
    "overall": <0-100 closeness score>,
    "items": [
${profile.experienceDescriptors.map(e => `      {"name": "${e.name}", "achieved": <true/false - based on FUNCTIONAL match not industry>, "fitScore": <0-100>, "reasoning": "<explain if function matches or just industry>"}`).join(',\n')}
    ]
  },
  "skills": {
    "overall": <0-100 closeness score>,
    "items": [
${profile.skillDescriptors.map(s => `      {"name": "${s.name}", "achieved": <true/false>, "fitScore": <0-100>, "reasoning": "<semantic analysis>"}`).join(',\n')}
    ]
  },
  "cultural": {
    "overall": <0-100 closeness score>,
    "motivationAlignment": <0-100>,
    "painPointUnderstanding": <0-100>,
    "reasoning": "<SPECIFIC assessment: Start with candidate name. Mention their current role and key background. State 2-3 specific strengths that match the ${profile.roleTitle} requirements. State 1-2 gaps or concerns. End with a clear recommendation (Strong/Good/Moderate/Weak fit). Example format: '[Name], currently [Role], brings [specific strength 1] and [specific strength 2]. Their experience in [area] aligns well with the [requirement]. However, [gap/concern]. Overall: [Strong/Good/Moderate/Weak] fit for ${profile.roleTitle}.'>"
  }
}

SCORING GUIDANCE (based on semantic closeness, NOT ratings):
- 90-100: Strong semantic alignment - candidate's FUNCTION directly matches requirements
- 75-89: Good alignment - related functional experience with transferable skills
- 60-74: Moderate alignment - some functional overlap but gaps exist
- 40-59: Weak alignment - different function but same industry (industry exposure only)
- Below 40: Poor alignment - different function AND different industry`;
}

/**
 * Parse the semantic matching response
 */
function parseSemanticMatchingResponse(
  content: string,
  profile: ProfileDescriptors
): SemanticMatchResult {
  try {
    // Clean markdown if present
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Build result with proper structure
    const result: SemanticMatchResult = {
      attributes: {
        overall: parsed.attributes?.overall || 50,
        breakdown: {},
      },
      experiences: {
        overall: parsed.experiences?.overall || 50,
        breakdown: [],
      },
      skills: {
        overall: parsed.skills?.overall || 50,
        breakdown: [],
      },
      cultural: {
        overall: parsed.cultural?.overall || 50,
        motivationAlignment: parsed.cultural?.motivationAlignment || 50,
        painPointUnderstanding: parsed.cultural?.painPointUnderstanding || 50,
        reasoning: parsed.cultural?.reasoning || '',
      },
    };

    // Parse attribute breakdown
    if (parsed.attributes?.breakdown) {
      for (const [key, value] of Object.entries(parsed.attributes.breakdown)) {
        const v = value as { score: number; reasoning: string };
        result.attributes.breakdown[key] = {
          score: v.score || 50,
          reasoning: v.reasoning || '',
        };
      }
    }

    // Parse experience breakdown
    if (parsed.experiences?.items) {
      result.experiences.breakdown = parsed.experiences.items.map((item: {
        name: string;
        achieved: boolean;
        fitScore: number;
        reasoning: string;
      }) => ({
        name: item.name || '',
        achieved: item.achieved ?? false,
        fitScore: item.fitScore || 50,
        reasoning: item.reasoning || '',
      }));
    }

    // Parse skills breakdown
    if (parsed.skills?.items) {
      result.skills.breakdown = parsed.skills.items.map((item: {
        name: string;
        achieved: boolean;
        fitScore: number;
        reasoning: string;
      }) => ({
        name: item.name || '',
        achieved: item.achieved ?? false,
        fitScore: item.fitScore || 50,
        reasoning: item.reasoning || '',
      }));
    }

    return result;
  } catch (error) {
    console.error('Failed to parse semantic matching response:', error);
    console.error('Content:', content.substring(0, 500));

    // Return default result on parse error
    return createDefaultSemanticResult(profile);
  }
}

/**
 * Create default semantic result when parsing fails
 */
function createDefaultSemanticResult(profile: ProfileDescriptors): SemanticMatchResult {
  return {
    attributes: {
      overall: 50,
      breakdown: Object.fromEntries(
        profile.attributeDescriptors.map(a => [a.key, { score: 50, reasoning: 'Unable to analyze' }])
      ),
    },
    experiences: {
      overall: 50,
      breakdown: profile.experienceDescriptors.map(e => ({
        name: e.name,
        achieved: false,
        fitScore: 50,
        reasoning: 'Unable to analyze',
      })),
    },
    skills: {
      overall: 50,
      breakdown: profile.skillDescriptors.map(s => ({
        name: s.name,
        achieved: false,
        fitScore: 50,
        reasoning: 'Unable to analyze',
      })),
    },
    cultural: {
      overall: 50,
      motivationAlignment: 50,
      painPointUnderstanding: 50,
      reasoning: 'Unable to analyze',
    },
  };
}

/**
 * Batch semantic matching for efficiency (used by CSV parser)
 * Processes multiple candidates in batches to reduce API calls
 */
export async function performBatchSemanticMatching(
  apiKey: string,
  candidates: CandidateText[],
  profileDescriptors: ProfileDescriptors,
  batchSize: number = 3
): Promise<SemanticMatchResult[]> {
  const results: SemanticMatchResult[] = [];

  // Process in batches
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(candidate =>
      performSemanticMatching(apiKey, candidate, profileDescriptors)
        .catch(error => {
          console.error(`Semantic matching failed for ${candidate.name}:`, error);
          return createDefaultSemanticResult(profileDescriptors);
        })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Rate limit delay between batches
    if (i + batchSize < candidates.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}
