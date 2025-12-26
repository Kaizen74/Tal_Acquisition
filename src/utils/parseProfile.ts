import Papa from 'papaparse';
import type { SuccessProfile, CandidateProfile, CompetencyStats, ToolCategory } from '../types';

interface CSVRow {
  [key: string]: string;
}

export function parseProfileCSV(csvContent: string): SuccessProfile | null {
  const result = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing errors:', result.errors);
    return null;
  }

  const data = result.data;
  if (data.length === 0) return null;

  try {
    // Parse role information (first row)
    // Support both new (seniority, objective) and old (level, class) column names
    const roleRow = data.find((row) => row.section === 'role');
    const role = roleRow
      ? {
          title: roleRow.value || '',
          level: roleRow.seniority || roleRow.level || '',
          class: roleRow.objective || roleRow.class || '',
        }
      : { title: '', level: '', class: '' };

    // Parse attribute stats (also supports old 'competency' section name)
    const statsRows = data.filter((row) => row.section === 'attribute' || row.section === 'competency');
    const competencyStats: CompetencyStats = {
      problemSolving: 0,
      stakeholderManagement: 0,
      technicalExpertise: 0,
      leadership: 0,
      customerFocus: 0,
      adaptability: 0,
    };
    statsRows.forEach((row) => {
      const key = row.key as keyof CompetencyStats;
      if (key in competencyStats) {
        competencyStats[key] = parseInt(row.value, 10) || 0;
      }
    });

    // Parse experiences
    const experienceRows = data.filter((row) => row.section === 'experience');
    const requiredExperiences = experienceRows.map((row) => ({
      category: row.category || '',
      name: row.name || '',
      description: row.description || '',
      minYears: parseInt(row.minYears, 10) || 0,
      achieved: row.achieved === 'true',
      badgeIcon: row.badgeIcon || 'Award',
    }));

    // Parse tools
    const toolRows = data.filter((row) => row.section === 'tool');
    const toolCategoriesMap: { [key: string]: ToolCategory } = {};
    toolRows.forEach((row) => {
      const category = row.category || 'Other';
      if (!toolCategoriesMap[category]) {
        toolCategoriesMap[category] = { category, tools: [] };
      }
      toolCategoriesMap[category].tools.push({
        name: row.name || '',
        proficiency: parseInt(row.proficiency, 10) || 0,
        isRequired: row.isRequired === 'true',
      });
    });
    const toolbox: ToolCategory[] = Object.values(toolCategoriesMap);

    // Parse academic background
    const academicRow = data.find((row) => row.section === 'academic');
    const academicBackground = academicRow
      ? {
          minDegree: academicRow.minDegree || '',
          preferredFields: (academicRow.preferredFields || '')
            .split(';')
            .filter(Boolean),
          certifications: (academicRow.certifications || '')
            .split(';')
            .filter(Boolean),
        }
      : { minDegree: '', preferredFields: [], certifications: [] };

    // Parse motivations, pain points, week in life
    const motivations = data
      .filter((row) => row.section === 'motivation')
      .map((row) => row.value);
    const painPoints = data
      .filter((row) => row.section === 'painpoint')
      .map((row) => row.value);
    const weekInLife = data
      .filter((row) => row.section === 'week')
      .map((row) => row.value);

    return {
      role,
      competencyStats,
      requiredExperiences,
      academicBackground,
      toolbox,
      motivations,
      painPoints,
      weekInLife,
    };
  } catch (error) {
    console.error('Error parsing profile:', error);
    return null;
  }
}

export function parseCandidateCSV(
  csvContent: string,
  _baseProfile?: SuccessProfile
): CandidateProfile | null {
  const profile = parseProfileCSV(csvContent);
  if (!profile) return null;

  const data = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  }).data;

  const personalRow = data.find((row) => row.section === 'personal');
  const personalInfo = personalRow
    ? {
        name: personalRow.name || 'Unknown',
        avatarUrl: personalRow.avatarUrl,
        yearsExperience: parseInt(personalRow.yearsExperience, 10) || 0,
        currentRole: personalRow.currentRole || '',
      }
    : { name: 'Unknown', yearsExperience: 0, currentRole: '' };

  return {
    ...profile,
    personalInfo,
    matchScore: {
      overall: 0,
      breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 },
    },
  };
}

export function validateProfileData(profile: SuccessProfile): string[] {
  const errors: string[] = [];

  if (!profile.role.title) {
    errors.push('Role title is required');
  }

  const stats = Object.values(profile.competencyStats);
  if (stats.some((s) => s < 0 || s > 100)) {
    errors.push('Attribute stats must be between 0 and 100');
  }

  if (profile.requiredExperiences.length === 0) {
    errors.push('At least one experience is required');
  }

  if (profile.toolbox.length === 0) {
    errors.push('At least one tool category is required');
  }

  return errors;
}
