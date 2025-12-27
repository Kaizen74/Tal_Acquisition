import type { SuccessProfile, CandidateProfile, CompetencyStats, MatchScore } from '../types';

export interface MatchWeights {
  attributes: number;
  experiences: number;
  skillProficiency: number;
  culturalFit: number;
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  attributes: 40,
  experiences: 30,
  skillProficiency: 20,
  culturalFit: 10,
};

// Calculate radar similarity using cosine similarity
function calculateRadarSimilarity(
  profile: CompetencyStats,
  candidate: CompetencyStats
): number {
  const profileValues = Object.values(profile);
  const candidateValues = Object.values(candidate);

  let dotProduct = 0;
  let profileMagnitude = 0;
  let candidateMagnitude = 0;

  for (let i = 0; i < profileValues.length; i++) {
    dotProduct += profileValues[i] * candidateValues[i];
    profileMagnitude += profileValues[i] * profileValues[i];
    candidateMagnitude += candidateValues[i] * candidateValues[i];
  }

  const similarity =
    dotProduct / (Math.sqrt(profileMagnitude) * Math.sqrt(candidateMagnitude));

  // Also factor in how close the candidate is to the required values
  let totalDiff = 0;
  for (let i = 0; i < profileValues.length; i++) {
    const diff = Math.max(0, profileValues[i] - candidateValues[i]);
    totalDiff += diff;
  }
  const avgDiff = totalDiff / profileValues.length;
  const closenessScore = Math.max(0, 100 - avgDiff);

  // Combine cosine similarity with closeness score
  return Math.round((similarity * 50 + closenessScore * 0.5) * 100) / 100;
}

// Calculate experience match based on achieved experiences
function calculateExperienceMatch(
  profile: SuccessProfile,
  candidate: CandidateProfile
): number {
  const totalExperiences = profile.requiredExperiences.length;
  if (totalExperiences === 0) return 100;

  const achievedCount = candidate.requiredExperiences.filter(
    (exp) => exp.achieved
  ).length;

  return Math.round((achievedCount / totalExperiences) * 100);
}

// Calculate tool match based on achieved status
function calculateToolMatch(
  profile: SuccessProfile,
  candidate: CandidateProfile
): number {
  let totalRequired = 0;
  let achievedCount = 0;

  profile.toolbox.forEach((category, catIndex) => {
    category.tools.forEach((tool, toolIndex) => {
      if (tool.isRequired) {
        totalRequired++;
        const candidateTool = candidate.toolbox[catIndex]?.tools[toolIndex];
        if (candidateTool?.achieved) {
          achievedCount++;
        }
      }
    });
  });

  if (totalRequired === 0) return 100;
  return Math.round((achievedCount / totalRequired) * 100);
}

// Calculate cultural fit based on matching motivations and pain points
function calculateCulturalFit(
  profile: SuccessProfile,
  candidate: CandidateProfile
): number {
  const profileMotivations = new Set(
    profile.motivations.map((m) => m.toLowerCase())
  );
  const candidateMotivations = new Set(
    candidate.motivations.map((m) => m.toLowerCase())
  );

  let matchCount = 0;
  profileMotivations.forEach((m) => {
    if (candidateMotivations.has(m)) matchCount++;
  });

  const matchRatio =
    profileMotivations.size > 0 ? matchCount / profileMotivations.size : 1;

  return Math.round(matchRatio * 100);
}

export function calculateMatchScore(
  profile: SuccessProfile,
  candidate: CandidateProfile,
  weights: MatchWeights = DEFAULT_WEIGHTS
): MatchScore {
  const competencies = calculateRadarSimilarity(
    profile.competencyStats,
    candidate.competencyStats
  );
  const experiences = calculateExperienceMatch(profile, candidate);
  const tools = calculateToolMatch(profile, candidate);
  const cultural = calculateCulturalFit(profile, candidate);

  // Cap individual scores at 100
  const cappedCompetencies = Math.min(100, Math.round(competencies));
  const cappedExperiences = Math.min(100, experiences);
  const cappedTools = Math.min(100, tools);
  const cappedCultural = Math.min(100, cultural);

  // Weighted overall score using configurable weights (convert percentages to decimals)
  const overall = Math.min(100, Math.round(
    cappedCompetencies * (weights.attributes / 100) +
    cappedExperiences * (weights.experiences / 100) +
    cappedTools * (weights.skillProficiency / 100) +
    cappedCultural * (weights.culturalFit / 100)
  ));

  return {
    overall,
    breakdown: {
      competencies: cappedCompetencies,
      experiences: cappedExperiences,
      tools: cappedTools,
      cultural: cappedCultural,
    },
    weights, // Include weights in the result for display
  };
}
