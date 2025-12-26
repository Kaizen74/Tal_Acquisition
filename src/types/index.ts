export interface CompetencyStats {
  problemSolving: number;
  stakeholderManagement: number;
  technicalExpertise: number;
  leadership: number;
  customerFocus: number;
  adaptability: number;
}

export interface RequiredExperience {
  category: string;
  name: string;
  description: string;
  minYears: number;
  achieved: boolean;
  badgeIcon: string;
}

export interface Tool {
  name: string;
  proficiency: number;
  isRequired: boolean;
}

export interface ToolCategory {
  category: string;
  tools: Tool[];
}

export interface AcademicBackground {
  minDegree: string;
  preferredFields: string[];
  certifications: string[];
}

export interface SuccessProfile {
  role: {
    title: string;
    level: string;
    class: string;
  };
  competencyStats: CompetencyStats;
  requiredExperiences: RequiredExperience[];
  academicBackground: AcademicBackground;
  toolbox: ToolCategory[];
  motivations: string[];
  painPoints: string[];
  weekInLife: string[];
}

export interface PersonalInfo {
  name: string;
  avatarUrl?: string;
  yearsExperience: number;
  currentRole: string;
}

export interface MatchBreakdown {
  competencies: number;
  experiences: number;
  tools: number;
  cultural: number;
}

export interface MatchScore {
  overall: number;
  breakdown: MatchBreakdown;
}

export interface CandidateProfile extends SuccessProfile {
  personalInfo: PersonalInfo;
  matchScore: MatchScore;
}

export type BadgeStatus = 'achieved' | 'missing' | 'partial';

export interface RadarDataPoint {
  subject: string;
  profile: number;
  candidate?: number;
  fullMark: number;
}
