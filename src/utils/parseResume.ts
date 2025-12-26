import * as pdfjsLib from 'pdfjs-dist';
import type { CandidateProfile, CompetencyStats } from '../types';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedResume {
  fileName: string;
  rawText: string;
  extractedData: ExtractedResumeData;
}

export interface ExtractedResumeData {
  name: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  yearsExperience: number;
  skills: string[];
  experiences: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    field: string;
    institution: string;
    year?: string;
  }>;
  certifications: string[];
  languages: string[];
}

// Extract text content from a PDF file
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => {
        const textItem = item as { str?: string };
        return textItem.str || '';
      })
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// Parse resume text to extract structured data
export function parseResumeText(text: string, fileName: string): ExtractedResumeData {
  // Extract name (usually first line or first significant text)
  const name = extractName(text, fileName);

  // Extract contact info
  const email = extractEmail(text);
  const phone = extractPhone(text);

  // Extract current role
  const currentRole = extractCurrentRole(text);

  // Extract years of experience
  const yearsExperience = extractYearsExperience(text);

  // Extract skills
  const skills = extractSkills(text);

  // Extract work experiences
  const experiences = extractExperiences(text);

  // Extract education
  const education = extractEducation(text);

  // Extract certifications
  const certifications = extractCertifications(text);

  // Extract languages
  const languages = extractLanguages(text);

  return {
    name,
    email,
    phone,
    currentRole,
    yearsExperience,
    skills,
    experiences,
    education,
    certifications,
    languages,
  };
}

function extractName(text: string, fileName: string): string {
  // Try to find name from common patterns
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // First non-empty line that looks like a name (2-4 words, capitalized)
  for (const line of lines.slice(0, 5)) {
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isName = words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]+$/.test(w));
      if (isName) {
        return words.join(' ');
      }
    }
  }

  // Fallback: use filename without extension
  return fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
}

function extractEmail(text: string): string | undefined {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0].toLowerCase() : undefined;
}

function extractPhone(text: string): string | undefined {
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return phoneMatch ? phoneMatch[0] : undefined;
}

function extractCurrentRole(text: string): string | undefined {
  const rolePatterns = [
    /(?:current(?:ly)?|present)\s*(?:position|role|title)?[:\s]*([^\n]+)/i,
    /(?:job title|position|role)[:\s]*([^\n]+)/i,
    /^([A-Za-z\s]+(?:Manager|Lead|Director|Engineer|Developer|Analyst|Specialist|Coordinator|Executive|Consultant))/mi,
  ];

  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 50);
    }
  }

  return undefined;
}

function extractYearsExperience(text: string): number {
  // Look for explicit mentions of years of experience
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)/i,
    /(?:experience|exp)[:\s]*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(?:over|more than)\s*(\d+)\s*(?:years?|yrs?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Estimate from work history dates
  const yearMatches = text.match(/20\d{2}|19\d{2}/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(y => parseInt(y, 10));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return Math.min(maxYear - minYear, 30);
  }

  return 0;
}

function extractSkills(text: string): string[] {
  const skills: Set<string> = new Set();

  // Common skill keywords
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Git',
    'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch',
    'Machine Learning', 'AI', 'Data Science', 'Analytics', 'Statistics',
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'JIRA',
    'Leadership', 'Team Management', 'Communication', 'Problem Solving',
    'Customer Service', 'Sales', 'Marketing', 'Business Development',
    'CRM', 'Salesforce', 'HubSpot', 'SAP', 'Oracle', 'ERP',
    'Excel', 'PowerPoint', 'Word', 'Office', 'Google Suite',
    'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'UI/UX',
    'ITIL', 'Six Sigma', 'Lean', 'PMP', 'Certified',
  ];

  const lowerText = text.toLowerCase();

  for (const skill of skillKeywords) {
    if (lowerText.includes(skill.toLowerCase())) {
      skills.add(skill);
    }
  }

  // Look for skills section
  const skillsSectionMatch = text.match(/(?:skills|technical skills|core competencies)[:\s]*([^\n]+(?:\n[^\n]+)*?)(?=\n\n|\n[A-Z]|$)/i);
  if (skillsSectionMatch) {
    const skillsText = skillsSectionMatch[1];
    const extractedSkills = skillsText.split(/[,;•|\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30);
    extractedSkills.forEach(s => skills.add(s));
  }

  return Array.from(skills).slice(0, 20);
}

function extractExperiences(text: string): ExtractedResumeData['experiences'] {
  const experiences: ExtractedResumeData['experiences'] = [];

  // Look for experience section
  const expPatterns = [
    /(?:work experience|experience|employment|professional experience|career history)[:\s]*\n([\s\S]*?)(?=\n(?:education|skills|certifications|languages|references)|$)/i,
  ];

  for (const pattern of expPatterns) {
    const match = text.match(pattern);
    if (match) {
      const expSection = match[1];

      // Try to parse individual jobs
      const jobMatches = expSection.matchAll(/([A-Za-z\s]+(?:Manager|Lead|Director|Engineer|Developer|Analyst|Specialist|Coordinator|Executive|Consultant|Associate|Officer))[,\s]*(?:at|@|-)?\s*([A-Za-z\s&.,]+?)(?:\s*[\|•-]\s*|\s+)((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})[^\n]*)/gi);

      for (const jobMatch of jobMatches) {
        experiences.push({
          title: jobMatch[1].trim(),
          company: jobMatch[2].trim(),
          duration: jobMatch[3].trim(),
          description: '',
        });
      }

      break;
    }
  }

  // If no structured experiences found, create placeholder
  if (experiences.length === 0) {
    const roleMatch = text.match(/([A-Za-z\s]+(?:Manager|Lead|Director|Engineer|Developer|Analyst|Specialist))/i);
    if (roleMatch) {
      experiences.push({
        title: roleMatch[1].trim(),
        company: 'Previous Company',
        duration: 'Recent',
        description: '',
      });
    }
  }

  return experiences.slice(0, 5);
}

function extractEducation(text: string): ExtractedResumeData['education'] {
  const education: ExtractedResumeData['education'] = [];

  const degreePatterns = [
    /(?:Bachelor|B\.?S\.?|B\.?A\.?|Master|M\.?S\.?|M\.?A\.?|MBA|Ph\.?D\.?|Doctor|Associate)[^\n]*/gi,
  ];

  for (const pattern of degreePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const degreeText = match[0];
      education.push({
        degree: degreeText.slice(0, 50),
        field: '',
        institution: '',
      });
    }
  }

  return education.slice(0, 3);
}

function extractCertifications(text: string): string[] {
  const certs: string[] = [];

  const certKeywords = [
    'PMP', 'ITIL', 'AWS Certified', 'Azure Certified', 'Google Certified',
    'Scrum Master', 'Six Sigma', 'CISSP', 'CISM', 'CPA', 'CFA',
    'SHRM', 'PHR', 'SPHR', 'Certified', 'License',
  ];

  for (const cert of certKeywords) {
    if (text.toLowerCase().includes(cert.toLowerCase())) {
      certs.push(cert);
    }
  }

  return certs.slice(0, 10);
}

function extractLanguages(text: string): string[] {
  const languages: string[] = [];

  const langKeywords = [
    'English', 'Spanish', 'French', 'German', 'Chinese', 'Mandarin',
    'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic',
    'Hindi', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  ];

  for (const lang of langKeywords) {
    if (text.toLowerCase().includes(lang.toLowerCase())) {
      languages.push(lang);
    }
  }

  return languages;
}

// Convert extracted resume data to CandidateProfile
export function resumeToCandidate(
  extractedData: ExtractedResumeData,
  successProfile: {
    role: { title: string; level: string; class: string };
    requiredExperiences: Array<{ category: string; name: string; description: string; minYears: number; badgeIcon: string }>;
    toolbox: Array<{ category: string; tools: Array<{ name: string; proficiency: number; isRequired: boolean }> }>;
  }
): CandidateProfile {
  // Estimate competency stats based on resume content
  const competencyStats: CompetencyStats = estimateCompetencies(extractedData);

  // Map experiences to required experiences
  const requiredExperiences = successProfile.requiredExperiences.map(exp => ({
    ...exp,
    achieved: checkExperienceMatch(extractedData, exp),
  }));

  // Map tools based on skills
  const toolbox = successProfile.toolbox.map(category => ({
    category: category.category,
    tools: category.tools.map(tool => ({
      ...tool,
      proficiency: estimateToolProficiency(extractedData, tool.name),
    })),
  }));

  return {
    personalInfo: {
      name: extractedData.name,
      yearsExperience: extractedData.yearsExperience,
      currentRole: extractedData.currentRole || 'Not specified',
    },
    role: successProfile.role,
    competencyStats,
    requiredExperiences,
    academicBackground: {
      minDegree: extractedData.education[0]?.degree || '',
      preferredFields: extractedData.education.map(e => e.field).filter(Boolean),
      certifications: extractedData.certifications,
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

function estimateCompetencies(data: ExtractedResumeData): CompetencyStats {
  const skills = data.skills.map(s => s.toLowerCase());
  const text = data.experiences.map(e => e.description).join(' ').toLowerCase();

  // Problem Solving
  const problemSolving = calculateSkillScore([
    'problem solving', 'analytical', 'troubleshooting', 'debugging',
    'critical thinking', 'solution', 'resolve', 'analyze',
  ], skills, text);

  // Stakeholder Management
  const stakeholderManagement = calculateSkillScore([
    'stakeholder', 'client', 'customer', 'relationship', 'partner',
    'collaboration', 'communication', 'presentation', 'negotiation',
  ], skills, text);

  // Technical Expertise
  const technicalExpertise = calculateSkillScore([
    'technical', 'programming', 'software', 'system', 'database',
    'api', 'development', 'engineering', 'architecture',
  ], skills, text);

  // Leadership
  const leadership = calculateSkillScore([
    'leadership', 'lead', 'manage', 'team', 'supervise', 'mentor',
    'coach', 'direct', 'head', 'director', 'manager',
  ], skills, text);

  // Customer Focus
  const customerFocus = calculateSkillScore([
    'customer', 'client', 'service', 'support', 'satisfaction',
    'user', 'experience', 'feedback', 'relationship',
  ], skills, text);

  // Adaptability
  const adaptability = calculateSkillScore([
    'adaptable', 'flexible', 'agile', 'change', 'dynamic',
    'fast-paced', 'multi-task', 'versatile', 'quick learner',
  ], skills, text);

  return {
    problemSolving: Math.min(100, 50 + problemSolving),
    stakeholderManagement: Math.min(100, 50 + stakeholderManagement),
    technicalExpertise: Math.min(100, 50 + technicalExpertise),
    leadership: Math.min(100, 50 + leadership),
    customerFocus: Math.min(100, 50 + customerFocus),
    adaptability: Math.min(100, 50 + adaptability),
  };
}

function calculateSkillScore(keywords: string[], skills: string[], text: string): number {
  let score = 0;

  for (const keyword of keywords) {
    if (skills.some(s => s.includes(keyword))) score += 8;
    if (text.includes(keyword)) score += 3;
  }

  return Math.min(score, 40);
}

function checkExperienceMatch(data: ExtractedResumeData, exp: { name: string; category: string }): boolean {
  const searchTerms = [exp.name.toLowerCase(), exp.category.toLowerCase()];
  const allText = [
    ...data.skills,
    ...data.experiences.map(e => e.title),
    ...data.experiences.map(e => e.description),
    data.currentRole || '',
  ].join(' ').toLowerCase();

  return searchTerms.some(term => allText.includes(term));
}

function estimateToolProficiency(data: ExtractedResumeData, toolName: string): number {
  const allText = [
    ...data.skills,
    ...data.experiences.map(e => e.description),
    data.currentRole || '',
  ].join(' ').toLowerCase();

  const toolLower = toolName.toLowerCase();

  // Direct match
  if (data.skills.some(s => s.toLowerCase().includes(toolLower))) {
    return 70 + Math.floor(Math.random() * 25);
  }

  // Partial match
  if (allText.includes(toolLower)) {
    return 60 + Math.floor(Math.random() * 20);
  }

  // Related skill match
  const relatedTerms: Record<string, string[]> = {
    'email support': ['email', 'communication', 'correspondence'],
    'phone support': ['phone', 'call', 'telephone', 'customer service'],
    'chat support': ['chat', 'messaging', 'live support'],
    'kpi dashboard': ['analytics', 'reporting', 'metrics', 'dashboard', 'data'],
    'crm system': ['crm', 'salesforce', 'hubspot', 'customer relationship'],
    'ticketing system': ['jira', 'zendesk', 'ticket', 'support system'],
  };

  const related = relatedTerms[toolLower] || [];
  if (related.some(r => allText.includes(r))) {
    return 50 + Math.floor(Math.random() * 20);
  }

  return 30 + Math.floor(Math.random() * 20);
}

// Parse multiple PDF files
export async function parseMultipleResumes(
  files: File[],
  successProfile: Parameters<typeof resumeToCandidate>[1]
): Promise<{ candidates: CandidateProfile[]; errors: string[] }> {
  const candidates: CandidateProfile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const text = await extractTextFromPDF(file);
      const extractedData = parseResumeText(text, file.name);
      const candidate = resumeToCandidate(extractedData, successProfile);
      candidates.push(candidate);
    } catch (error) {
      errors.push(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { candidates, errors };
}
