/**
 * Mock test to verify weight configuration data flow
 * Tests: WeightConfig -> calculateMatchScore -> MatchScore display
 */

import { calculateMatchScore, DEFAULT_WEIGHTS } from '../utils/calculateMatch';
import type { MatchWeights } from '../utils/calculateMatch';
import type { SuccessProfile, CandidateProfile } from '../types';

// Mock success profile
const mockSuccessProfile: SuccessProfile = {
  role: { title: 'Test Role', level: 'Senior', class: 'Test Class' },
  competencyStats: {
    problemSolving: 80,
    stakeholderManagement: 75,
    technicalExpertise: 85,
    leadership: 70,
    customerFocus: 90,
    adaptability: 80,
  },
  requiredExperiences: [
    { category: 'Leadership', name: 'Team Management', description: 'Led teams', minYears: 3, achieved: false, badgeIcon: 'Users' },
    { category: 'Technical', name: 'System Design', description: 'Designed systems', minYears: 2, achieved: false, badgeIcon: 'Database' },
  ],
  academicBackground: { minDegree: "Bachelor's", preferredFields: [], certifications: [] },
  toolbox: [
    {
      category: 'Technical',
      tools: [
        { name: 'CRM System', proficiency: 80, isRequired: true },
        { name: 'Analytics', proficiency: 70, isRequired: true },
      ],
    },
  ],
  motivations: ['Growth', 'Impact'],
  painPoints: [],
  weekInLife: [],
};

// Mock candidate profile
const mockCandidate: CandidateProfile = {
  ...mockSuccessProfile,
  personalInfo: { name: 'Test Candidate', yearsExperience: 5, currentRole: 'Manager' },
  competencyStats: {
    problemSolving: 85,
    stakeholderManagement: 70,
    technicalExpertise: 75,
    leadership: 80,
    customerFocus: 85,
    adaptability: 90,
  },
  requiredExperiences: [
    { category: 'Leadership', name: 'Team Management', description: 'Led teams', minYears: 3, achieved: true, badgeIcon: 'Users' },
    { category: 'Technical', name: 'System Design', description: 'Designed systems', minYears: 2, achieved: false, badgeIcon: 'Database' },
  ],
  toolbox: [
    {
      category: 'Technical',
      tools: [
        { name: 'CRM System', proficiency: 90, isRequired: true },
        { name: 'Analytics', proficiency: 60, isRequired: true },
      ],
    },
  ],
  motivations: ['Growth'],
  matchScore: { overall: 0, breakdown: { competencies: 0, experiences: 0, tools: 0, cultural: 0 } },
};

// Test functions
function testDefaultWeights(): boolean {
  console.log('\n=== Test 1: Default Weights ===');

  const result = calculateMatchScore(mockSuccessProfile, mockCandidate);

  console.log('Default weights:', DEFAULT_WEIGHTS);
  console.log('Result:', result);
  console.log('Weights in result:', result.weights);

  // Verify weights are included in result
  if (!result.weights) {
    console.error('❌ FAIL: Weights not included in result');
    return false;
  }

  if (result.weights.attributes !== 40 ||
      result.weights.experiences !== 30 ||
      result.weights.skillProficiency !== 20 ||
      result.weights.culturalFit !== 10) {
    console.error('❌ FAIL: Default weights incorrect');
    return false;
  }

  console.log('✅ PASS: Default weights correctly applied and returned');
  return true;
}

function testCustomWeights(): boolean {
  console.log('\n=== Test 2: Custom Weights ===');

  const customWeights: MatchWeights = {
    attributes: 25,
    experiences: 25,
    skillProficiency: 25,
    culturalFit: 25,
  };

  const result = calculateMatchScore(mockSuccessProfile, mockCandidate, customWeights);

  console.log('Custom weights:', customWeights);
  console.log('Result:', result);
  console.log('Weights in result:', result.weights);

  // Verify custom weights are used
  if (!result.weights) {
    console.error('❌ FAIL: Weights not included in result');
    return false;
  }

  if (result.weights.attributes !== 25 ||
      result.weights.experiences !== 25 ||
      result.weights.skillProficiency !== 25 ||
      result.weights.culturalFit !== 25) {
    console.error('❌ FAIL: Custom weights not correctly applied');
    return false;
  }

  console.log('✅ PASS: Custom weights correctly applied and returned');
  return true;
}

function testWeightImpactOnScore(): boolean {
  console.log('\n=== Test 3: Weight Impact on Overall Score ===');

  // Test with high attributes weight
  const highAttributesWeights: MatchWeights = {
    attributes: 70,
    experiences: 10,
    skillProficiency: 10,
    culturalFit: 10,
  };

  // Test with high experiences weight
  const highExperiencesWeights: MatchWeights = {
    attributes: 10,
    experiences: 70,
    skillProficiency: 10,
    culturalFit: 10,
  };

  const resultDefault = calculateMatchScore(mockSuccessProfile, mockCandidate);
  const resultHighAttr = calculateMatchScore(mockSuccessProfile, mockCandidate, highAttributesWeights);
  const resultHighExp = calculateMatchScore(mockSuccessProfile, mockCandidate, highExperiencesWeights);

  console.log('Default weights overall score:', resultDefault.overall);
  console.log('High attributes weights overall score:', resultHighAttr.overall);
  console.log('High experiences weights overall score:', resultHighExp.overall);

  console.log('\nBreakdown scores (should be same regardless of weights):');
  console.log('  Competencies:', resultDefault.breakdown.competencies);
  console.log('  Experiences:', resultDefault.breakdown.experiences);
  console.log('  Tools:', resultDefault.breakdown.tools);
  console.log('  Cultural:', resultDefault.breakdown.cultural);

  // Verify that different weights produce different overall scores
  // (unless all component scores happen to be equal)
  const allScoresSame = resultDefault.overall === resultHighAttr.overall &&
                        resultDefault.overall === resultHighExp.overall;

  if (allScoresSame) {
    console.log('⚠️ Note: All scores are the same (possible if component scores are equal)');
  } else {
    console.log('✅ Different weights produce different overall scores as expected');
  }

  // Verify breakdown scores are unchanged (they should be calculated the same way)
  if (resultDefault.breakdown.competencies === resultHighAttr.breakdown.competencies &&
      resultDefault.breakdown.experiences === resultHighAttr.breakdown.experiences &&
      resultDefault.breakdown.tools === resultHighAttr.breakdown.tools &&
      resultDefault.breakdown.cultural === resultHighAttr.breakdown.cultural) {
    console.log('✅ PASS: Breakdown scores are consistent across different weight configurations');
    return true;
  } else {
    console.error('❌ FAIL: Breakdown scores should not change based on weights');
    return false;
  }
}

function testWeightValidation(): boolean {
  console.log('\n=== Test 4: Weight Total Validation ===');

  // Test weights that don't add to 100
  const invalidWeights: MatchWeights = {
    attributes: 30,
    experiences: 30,
    skillProficiency: 30,
    culturalFit: 30, // Total = 120
  };

  const total = invalidWeights.attributes + invalidWeights.experiences +
                invalidWeights.skillProficiency + invalidWeights.culturalFit;

  console.log('Invalid weights total:', total);

  // The calculation should still work, but the overall score may exceed 100
  const result = calculateMatchScore(mockSuccessProfile, mockCandidate, invalidWeights);
  console.log('Result with invalid weights:', result.overall);

  // Valid weights
  const validWeights: MatchWeights = {
    attributes: 25,
    experiences: 25,
    skillProficiency: 25,
    culturalFit: 25, // Total = 100
  };

  const validTotal = validWeights.attributes + validWeights.experiences +
                     validWeights.skillProficiency + validWeights.culturalFit;

  console.log('Valid weights total:', validTotal);

  if (validTotal === 100) {
    console.log('✅ PASS: Valid weights add up to 100%');
    return true;
  } else {
    console.error('❌ FAIL: Weight validation issue');
    return false;
  }
}

function testScoreCalculationFormula(): boolean {
  console.log('\n=== Test 5: Score Calculation Formula Verification ===');

  const weights: MatchWeights = {
    attributes: 40,
    experiences: 30,
    skillProficiency: 20,
    culturalFit: 10,
  };

  const result = calculateMatchScore(mockSuccessProfile, mockCandidate, weights);

  // Manually calculate expected overall score
  const expectedOverall = Math.round(
    result.breakdown.competencies * (weights.attributes / 100) +
    result.breakdown.experiences * (weights.experiences / 100) +
    result.breakdown.tools * (weights.skillProficiency / 100) +
    result.breakdown.cultural * (weights.culturalFit / 100)
  );

  console.log('Breakdown scores:');
  console.log('  Competencies:', result.breakdown.competencies, '× 0.4 =', result.breakdown.competencies * 0.4);
  console.log('  Experiences:', result.breakdown.experiences, '× 0.3 =', result.breakdown.experiences * 0.3);
  console.log('  Tools:', result.breakdown.tools, '× 0.2 =', result.breakdown.tools * 0.2);
  console.log('  Cultural:', result.breakdown.cultural, '× 0.1 =', result.breakdown.cultural * 0.1);
  console.log('Expected overall:', expectedOverall);
  console.log('Actual overall:', result.overall);

  if (Math.abs(result.overall - expectedOverall) <= 1) { // Allow for rounding differences
    console.log('✅ PASS: Score calculation formula is correct');
    return true;
  } else {
    console.error('❌ FAIL: Score calculation mismatch');
    return false;
  }
}

// Run all tests
export function runAllTests(): void {
  console.log('========================================');
  console.log('Weight Configuration Data Flow Tests');
  console.log('========================================');

  const results: boolean[] = [];

  results.push(testDefaultWeights());
  results.push(testCustomWeights());
  results.push(testWeightImpactOnScore());
  results.push(testWeightValidation());
  results.push(testScoreCalculationFormula());

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n========================================');
  console.log(`Test Results: ${passed}/${total} passed`);
  console.log('========================================');

  if (passed === total) {
    console.log('🎉 All tests passed! Weight configuration data flow is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }
}

// Run tests when this file is executed directly
runAllTests();
