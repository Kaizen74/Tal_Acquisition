import type { SuccessProfile, CandidateProfile, CompetencyStats, MatchScore } from '../types';

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

// Calculate tool proficiency match
function calculateToolMatch(
  profile: SuccessProfile,
  candidate: CandidateProfile
): number {
  let totalRequired = 0;
  let totalScore = 0;

  profile.toolbox.forEach((category, catIndex) => {
    category.tools.forEach((tool, toolIndex) => {
      if (tool.isRequired) {
        totalRequired++;
        const candidateTool = candidate.toolbox[catIndex]?.tools[toolIndex];
        if (candidateTool) {
          // Score based on how close candidate is to required proficiency
          const ratio = Math.min(
            candidateTool.proficiency / tool.proficiency,
            1
          );
          totalScore += ratio * 100;
        }
      }
    });
  });

  if (totalRequired === 0) return 100;
  return Math.round(totalScore / totalRequired);
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
  candidate: CandidateProfile
): MatchScore {
  const competencies = calculateRadarSimilarity(
    profile.competencyStats,
    candidate.competencyStats
  );
  const experiences = calculateExperienceMatch(profile, candidate);
  const tools = calculateToolMatch(profile, candidate);
  const cultural = calculateCulturalFit(profile, candidate);

  // Weighted overall score
  const overall = Math.round(
    competencies * 0.4 + experiences * 0.3 + tools * 0.2 + cultural * 0.1
  );

  return {
    overall,
    breakdown: {
      competencies: Math.round(competencies),
      experiences,
      tools,
      cultural,
    },
  };
}
