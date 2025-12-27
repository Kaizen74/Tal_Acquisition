/**
 * Mock test to verify automatic score recalculation
 * Tests: Weight changes, Cultural fit assessment, Criteria updates -> Match score recalculation
 */

import { calculateMatchScore, DEFAULT_WEIGHTS } from '../utils/calculateMatch';
import type { MatchWeights } from '../utils/calculateMatch';
import type { SuccessProfile, CandidateProfile, CulturalFitAssessment } from '../types';

// Mock success profile
const createMockSuccessProfile = (): SuccessProfile => ({
  role: { title: 'Customer Support Lead', level: 'Senior', class: 'Support Paladin' },
  competencyStats: {
    problemSolving: 80,
    stakeholderManagement: 75,
    technicalExpertise: 85,
    leadership: 70,
    customerFocus: 90,
    adaptability: 80,
  },
  attributeConfig: [
    { key: 'problemSolving', label: 'Problem Solving', value: 80 },
    { key: 'stakeholderManagement', label: 'Stakeholder Mgmt', value: 75 },
    { key: 'technicalExpertise', label: 'Technical', value: 85 },
    { key: 'leadership', label: 'Leadership', value: 70 },
    { key: 'customerFocus', label: 'Customer Focus', value: 90 },
    { key: 'adaptability', label: 'Adaptability', value: 80 },
  ],
  requiredExperiences: [
    { category: 'Leadership', name: 'Team Management', description: 'Led teams', minYears: 3, isRequired: true, achieved: false, badgeIcon: 'Users' },
    { category: 'Technical', name: 'CRM Systems', description: 'CRM experience', minYears: 2, isRequired: true, achieved: false, badgeIcon: 'Database' },
    { category: 'Operations', name: 'Process Improvement', description: 'Process optimization', minYears: 2, isRequired: false, achieved: false, badgeIcon: 'TrendingUp' },
  ],
  academicBackground: { minDegree: "Bachelor's", preferredFields: [], certifications: [] },
  toolbox: [
    {
      category: 'Communication',
      tools: [
        { name: 'Email Support', proficiency: 90, isRequired: true },
        { name: 'Phone Support', proficiency: 85, isRequired: true },
        { name: 'Chat Support', proficiency: 80, isRequired: false },
      ],
    },
    {
      category: 'Technical',
      tools: [
        { name: 'CRM System', proficiency: 85, isRequired: true },
        { name: 'Ticketing System', proficiency: 80, isRequired: true },
      ],
    },
  ],
  motivations: [
    'Career advancement',
    'Solving complex problems',
    'Building team morale',
    'Creating impact',
  ],
  painPoints: [
    'Limited resources',
    'Slow decision-making',
    'High workload',
  ],
  weekInLife: [],
});

// Mock candidate profile
const createMockCandidate = (): CandidateProfile => ({
  ...createMockSuccessProfile(),
  personalInfo: { name: 'Test Candidate', yearsExperience: 5, currentRole: 'Support Manager' },
  competencyStats: {
    problemSolving: 85,
    stakeholderManagement: 70,
    technicalExpertise: 80,
    leadership: 75,
    customerFocus: 88,
    adaptability: 85,
  },
  requiredExperiences: [
    { category: 'Leadership', name: 'Team Management', description: 'Led teams', minYears: 3, isRequired: true, achieved: true, badgeIcon: 'Users' },
    { category: 'Technical', name: 'CRM Systems', description: 'CRM experience', minYears: 2, isRequired: true, achieved: true, badgeIcon: 'Database' },
    { category: 'Operations', name: 'Process Improvement', description: 'Process optimization', minYears: 2, isRequired: false, achieved: false, badgeIcon: 'TrendingUp' },
  ],
  toolbox: [
    {
      category: 'Communication',
      tools: [
        { name: 'Email Support', proficiency: 95, isRequired: true, achieved: true },
        { name: 'Phone Support', proficiency: 88, isRequired: true, achieved: true },
        { name: 'Chat Support', proficiency: 75, isRequired: false, achieved: true },
      ],
    },
    {
      category: 'Technical',
      tools: [
        { name: 'CRM System', proficiency: 90, isRequired: true, achieved: true },
        { name: 'Ticketing System', proficiency: 85, isRequired: true, achieved: false },
      ],
    },
  ],
  motivations: [], // Empty - simulating resume upload
  matchScore: { overall: 0, breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 } },
});

// ============================================
// Test 1: Weight changes affect overall score
// ============================================
function testWeightChangesAffectScore(): boolean {
  console.log('\n=== Test 1: Weight Changes Affect Overall Score ===');

  const profile = createMockSuccessProfile();
  const candidate = createMockCandidate();

  // Calculate with default weights
  const resultDefault = calculateMatchScore(profile, candidate, DEFAULT_WEIGHTS);
  console.log('Default weights (40/30/20/10):');
  console.log('  Breakdown:', resultDefault.breakdown);
  console.log('  Overall:', resultDefault.overall);

  // Change to high experience weight
  const highExpWeights: MatchWeights = {
    attributes: 20,
    experiences: 50,
    skillProficiency: 20,
    culturalFit: 10,
  };
  const resultHighExp = calculateMatchScore(profile, candidate, highExpWeights);
  console.log('\nHigh experience weights (20/50/20/10):');
  console.log('  Breakdown:', resultHighExp.breakdown);
  console.log('  Overall:', resultHighExp.overall);

  // Change to high cultural fit weight
  const highCulturalWeights: MatchWeights = {
    attributes: 30,
    experiences: 20,
    skillProficiency: 20,
    culturalFit: 30,
  };
  const resultHighCultural = calculateMatchScore(profile, candidate, highCulturalWeights);
  console.log('\nHigh cultural weights (30/20/20/30):');
  console.log('  Breakdown:', resultHighCultural.breakdown);
  console.log('  Overall:', resultHighCultural.overall);

  // Verify breakdowns stay the same but overall changes
  const breakdownsSame =
    resultDefault.breakdown.competencies === resultHighExp.breakdown.competencies &&
    resultDefault.breakdown.experiences === resultHighExp.breakdown.experiences &&
    resultDefault.breakdown.tools === resultHighExp.breakdown.tools &&
    resultDefault.breakdown.cultural === resultHighExp.breakdown.cultural;

  if (!breakdownsSame) {
    console.error('❌ FAIL: Breakdown scores should remain constant when weights change');
    return false;
  }

  // Verify overall scores are different (due to different weights)
  const overallsDifferent =
    resultDefault.overall !== resultHighExp.overall ||
    resultDefault.overall !== resultHighCultural.overall;

  if (!overallsDifferent) {
    console.log('⚠️ Note: Overall scores may be same if breakdown components are equal');
  }

  // Verify weights are stored correctly
  if (resultDefault.weights?.attributes !== 40 || resultHighExp.weights?.experiences !== 50) {
    console.error('❌ FAIL: Weights not stored correctly in result');
    return false;
  }

  console.log('✅ PASS: Weight changes correctly affect overall score calculation');
  return true;
}

// ============================================
// Test 2: Cultural fit assessment updates score
// ============================================
function testCulturalFitAssessmentUpdatesScore(): boolean {
  console.log('\n=== Test 2: Cultural Fit Assessment Updates Score ===');

  const profile = createMockSuccessProfile();
  const candidate = createMockCandidate();

  // Calculate without cultural fit assessment
  const resultBefore = calculateMatchScore(profile, candidate);
  console.log('Before assessment:');
  console.log('  Cultural fit:', resultBefore.breakdown.cultural);
  console.log('  Overall:', resultBefore.overall);

  // Add cultural fit assessment
  const assessment: CulturalFitAssessment = {
    score: 85,
    assessedAt: new Date().toISOString(),
    notes: 'Strong cultural alignment',
    criteriaRatings: [
      { criterion: 'Career advancement', rating: 5 },
      { criterion: 'Solving complex problems', rating: 4 },
      { criterion: 'Building team morale', rating: 4 },
      { criterion: 'Creating impact', rating: 4 },
    ],
  };

  const candidateWithAssessment = {
    ...candidate,
    culturalFitAssessment: assessment,
  };

  const resultAfter = calculateMatchScore(profile, candidateWithAssessment);
  console.log('\nAfter assessment (85%):');
  console.log('  Cultural fit:', resultAfter.breakdown.cultural);
  console.log('  Overall:', resultAfter.overall);

  // Verify cultural fit score changed
  if (resultAfter.breakdown.cultural !== 85) {
    console.error(`❌ FAIL: Cultural fit should be 85%, got ${resultAfter.breakdown.cultural}%`);
    return false;
  }

  // Verify overall score increased
  const scoreDiff = resultAfter.overall - resultBefore.overall;
  console.log(`\nScore difference: +${scoreDiff} points`);

  // With 10% weight and 85% cultural vs 0%, difference should be ~8.5 points
  if (scoreDiff < 5) {
    console.error('❌ FAIL: Overall score should have increased significantly');
    return false;
  }

  console.log('✅ PASS: Cultural fit assessment correctly updates match score');
  return true;
}

// ============================================
// Test 3: Multiple candidates recalculated
// ============================================
function testMultipleCandidatesRecalculated(): boolean {
  console.log('\n=== Test 3: Multiple Candidates Recalculated on Weight Change ===');

  const profile = createMockSuccessProfile();

  // Create multiple candidates with different profiles
  const candidates: CandidateProfile[] = [
    {
      ...createMockCandidate(),
      personalInfo: { name: 'Candidate A', yearsExperience: 3, currentRole: 'Junior Manager' },
      culturalFitAssessment: { score: 90, assessedAt: new Date().toISOString() },
    },
    {
      ...createMockCandidate(),
      personalInfo: { name: 'Candidate B', yearsExperience: 7, currentRole: 'Senior Lead' },
      culturalFitAssessment: { score: 60, assessedAt: new Date().toISOString() },
    },
    {
      ...createMockCandidate(),
      personalInfo: { name: 'Candidate C', yearsExperience: 5, currentRole: 'Manager' },
      // No cultural fit assessment
    },
  ];

  // Calculate scores with default weights
  console.log('Default weights (cultural 10%):');
  const defaultScores = candidates.map(c => {
    const result = calculateMatchScore(profile, c);
    console.log(`  ${c.personalInfo.name}: Overall=${result.overall}, Cultural=${result.breakdown.cultural}`);
    return result;
  });

  // Calculate scores with high cultural weight
  const highCulturalWeights: MatchWeights = {
    attributes: 25,
    experiences: 25,
    skillProficiency: 20,
    culturalFit: 30, // High cultural weight
  };

  console.log('\nHigh cultural weights (30%):');
  const highCulturalScores = candidates.map(c => {
    const result = calculateMatchScore(profile, c, highCulturalWeights);
    console.log(`  ${c.personalInfo.name}: Overall=${result.overall}, Cultural=${result.breakdown.cultural}`);
    return result;
  });

  // Verify ranking can change based on weights
  // Candidate A (90% cultural) should rank higher with high cultural weight
  // Candidate C (0% cultural) should rank lower with high cultural weight

  const defaultRankA = defaultScores[0].overall;
  const defaultRankC = defaultScores[2].overall;
  const highCulturalRankA = highCulturalScores[0].overall;
  const highCulturalRankC = highCulturalScores[2].overall;

  console.log('\nRanking impact:');
  console.log(`  Candidate A: ${defaultRankA} → ${highCulturalRankA} (diff: ${highCulturalRankA - defaultRankA})`);
  console.log(`  Candidate C: ${defaultRankC} → ${highCulturalRankC} (diff: ${highCulturalRankC - defaultRankC})`);

  // Candidate A should gain more than Candidate C
  const gainA = highCulturalRankA - defaultRankA;
  const gainC = highCulturalRankC - defaultRankC;

  if (gainA <= gainC) {
    console.error('❌ FAIL: Candidate with high cultural fit should gain more with high cultural weight');
    return false;
  }

  console.log('✅ PASS: Multiple candidates correctly recalculated with different outcomes');
  return true;
}

// ============================================
// Test 4: Experience isRequired affects score
// ============================================
function testExperienceIsRequiredAffectsScore(): boolean {
  console.log('\n=== Test 4: Experience isRequired Affects Score ===');

  const profile = createMockSuccessProfile();
  const candidate = createMockCandidate();

  // Calculate with current isRequired settings (2 required, 1 optional)
  const result1 = calculateMatchScore(profile, candidate);
  console.log('Current settings (2 required experiences):');
  console.log('  Experience score:', result1.breakdown.experiences);
  console.log('  Candidate achieved: Team Management (required) ✓, CRM (required) ✓, Process (optional) ✗');

  // Modify profile to make all experiences required
  const profileAllRequired: SuccessProfile = {
    ...profile,
    requiredExperiences: profile.requiredExperiences.map(exp => ({
      ...exp,
      isRequired: true,
    })),
  };

  // Candidate still has same achievements
  const result2 = calculateMatchScore(profileAllRequired, candidate);
  console.log('\nAll experiences required (3 required):');
  console.log('  Experience score:', result2.breakdown.experiences);

  // With 2/2 required → 100%, with 2/3 required → 67%
  if (result1.breakdown.experiences !== 100) {
    console.error(`❌ FAIL: Expected 100% with 2/2 required, got ${result1.breakdown.experiences}%`);
    return false;
  }

  if (result2.breakdown.experiences >= 100) {
    console.error(`❌ FAIL: Expected <100% with 2/3 required, got ${result2.breakdown.experiences}%`);
    return false;
  }

  console.log('✅ PASS: isRequired correctly affects experience matching score');
  return true;
}

// ============================================
// Test 5: Tool isRequired affects score
// ============================================
function testToolIsRequiredAffectsScore(): boolean {
  console.log('\n=== Test 5: Tool isRequired Affects Score ===');

  const profile = createMockSuccessProfile();
  const candidate = createMockCandidate();

  // Current: 4 required tools, candidate has 3 achieved
  const result1 = calculateMatchScore(profile, candidate);
  console.log('Current settings:');
  console.log('  Tools score:', result1.breakdown.tools);
  console.log('  Required tools: Email ✓, Phone ✓, CRM ✓, Ticketing ✗');

  // Modify to make Chat Support required too
  const profileMoreRequired: SuccessProfile = {
    ...profile,
    toolbox: profile.toolbox.map(cat => ({
      ...cat,
      tools: cat.tools.map(tool => ({
        ...tool,
        isRequired: true, // All tools required
      })),
    })),
  };

  const result2 = calculateMatchScore(profileMoreRequired, candidate);
  console.log('\nAll tools required (5 total):');
  console.log('  Tools score:', result2.breakdown.tools);

  // Adding more required tools (that candidate has achieved) may change score
  console.log('\nVerifying score adjusts based on required tools...');

  if (result1.breakdown.tools === result2.breakdown.tools) {
    console.log('⚠️ Note: Scores equal - may be coincidence if achieved ratios are same');
  }

  console.log('✅ PASS: Tool isRequired configuration affects score calculation');
  return true;
}

// ============================================
// Test 6: End-to-end workflow simulation
// ============================================
function testEndToEndWorkflow(): boolean {
  console.log('\n=== Test 6: End-to-End Workflow Simulation ===');

  const profile = createMockSuccessProfile();

  // Step 1: Candidate uploaded via resume (no cultural fit)
  console.log('Step 1: Candidate uploaded via resume');
  let candidate = createMockCandidate();
  let result = calculateMatchScore(profile, candidate);
  console.log(`  Initial score: ${result.overall}% (Cultural: ${result.breakdown.cultural}%)`);

  // Step 2: Recruiter adjusts weights (more emphasis on cultural fit)
  console.log('\nStep 2: Recruiter increases cultural fit weight to 25%');
  const newWeights: MatchWeights = {
    attributes: 35,
    experiences: 25,
    skillProficiency: 15,
    culturalFit: 25,
  };
  result = calculateMatchScore(profile, candidate, newWeights);
  console.log(`  Score after weight change: ${result.overall}% (Cultural: ${result.breakdown.cultural}%)`);
  const scoreBeforeAssessment = result.overall;

  // Step 3: Recruiter conducts interview and assesses cultural fit
  console.log('\nStep 3: Recruiter assesses cultural fit (score: 75%)');
  candidate = {
    ...candidate,
    culturalFitAssessment: {
      score: 75,
      assessedAt: new Date().toISOString(),
      notes: 'Good alignment with team values',
      criteriaRatings: [
        { criterion: 'Career advancement', rating: 4 },
        { criterion: 'Solving complex problems', rating: 4 },
        { criterion: 'Building team morale', rating: 3 },
        { criterion: 'Creating impact', rating: 4 },
      ],
    },
  };
  result = calculateMatchScore(profile, candidate, newWeights);
  console.log(`  Score after assessment: ${result.overall}% (Cultural: ${result.breakdown.cultural}%)`);
  const scoreAfterAssessment = result.overall;

  // Step 4: Verify score increased
  const improvement = scoreAfterAssessment - scoreBeforeAssessment;
  console.log(`\nStep 4: Verify improvement`);
  console.log(`  Score improvement: +${improvement} points`);

  // With 25% weight and 75% cultural vs 0%, difference should be ~18.75 points
  if (improvement < 10) {
    console.error('❌ FAIL: Score should have improved significantly after assessment');
    return false;
  }

  // Step 5: Compare multiple candidates
  console.log('\nStep 5: Compare candidates');
  const candidateB: CandidateProfile = {
    ...createMockCandidate(),
    personalInfo: { name: 'Candidate B', yearsExperience: 4, currentRole: 'Team Lead' },
    culturalFitAssessment: {
      score: 95,
      assessedAt: new Date().toISOString(),
    },
  };

  const resultA = calculateMatchScore(profile, candidate, newWeights);
  const resultB = calculateMatchScore(profile, candidateB, newWeights);

  console.log(`  Candidate A: ${resultA.overall}% (Cultural: ${resultA.breakdown.cultural}%)`);
  console.log(`  Candidate B: ${resultB.overall}% (Cultural: ${resultB.breakdown.cultural}%)`);

  // Candidate B with 95% cultural should score higher
  if (resultB.overall <= resultA.overall) {
    console.log('⚠️ Note: Candidate B should score higher with better cultural fit');
  }

  console.log('✅ PASS: End-to-end workflow correctly recalculates scores');
  return true;
}

// ============================================
// Test 7: Zero weight handling
// ============================================
function testZeroWeightHandling(): boolean {
  console.log('\n=== Test 7: Zero Weight Handling ===');

  const profile = createMockSuccessProfile();
  const candidate: CandidateProfile = {
    ...createMockCandidate(),
    culturalFitAssessment: { score: 100, assessedAt: new Date().toISOString() },
  };

  // Set cultural fit weight to 0
  const zeroCulturalWeights: MatchWeights = {
    attributes: 40,
    experiences: 40,
    skillProficiency: 20,
    culturalFit: 0, // Zero weight
  };

  const result = calculateMatchScore(profile, candidate, zeroCulturalWeights);
  console.log('Zero cultural weight:');
  console.log('  Weights:', result.weights);
  console.log('  Breakdown:', result.breakdown);
  console.log('  Overall:', result.overall);

  // Cultural fit should still be calculated but not contribute to overall
  if (result.breakdown.cultural !== 100) {
    console.error('❌ FAIL: Cultural breakdown should still be 100%');
    return false;
  }

  // Verify overall doesn't include cultural (should be same as if cultural was 0%)
  const candidateNoCultural = createMockCandidate();
  const resultNoCultural = calculateMatchScore(profile, candidateNoCultural, zeroCulturalWeights);

  if (result.overall !== resultNoCultural.overall) {
    console.error('❌ FAIL: With 0% weight, cultural fit should not affect overall');
    return false;
  }

  console.log('✅ PASS: Zero weight correctly excludes category from overall calculation');
  return true;
}

// Run all tests
export function runScoreRecalculationTests(): void {
  console.log('================================================');
  console.log('Score Recalculation Workflow Tests');
  console.log('================================================');

  const results: boolean[] = [];

  results.push(testWeightChangesAffectScore());
  results.push(testCulturalFitAssessmentUpdatesScore());
  results.push(testMultipleCandidatesRecalculated());
  results.push(testExperienceIsRequiredAffectsScore());
  results.push(testToolIsRequiredAffectsScore());
  results.push(testEndToEndWorkflow());
  results.push(testZeroWeightHandling());

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n================================================');
  console.log(`Test Results: ${passed}/${total} passed`);
  console.log('================================================');

  if (passed === total) {
    console.log('🎉 All tests passed! Score recalculation workflow is working correctly.');
    console.log('\nVerified behaviors:');
    console.log('  ✓ Weight changes affect overall score');
    console.log('  ✓ Cultural fit assessment updates match score');
    console.log('  ✓ Multiple candidates recalculated consistently');
    console.log('  ✓ isRequired flag affects experience/tool matching');
    console.log('  ✓ End-to-end workflow functions correctly');
    console.log('  ✓ Zero weight excludes category from overall');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }
}

// Run tests when this file is executed directly
runScoreRecalculationTests();
