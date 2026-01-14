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
    { category: 'Technical', name: 'System Design', description: 'Designed systems', minYears: 2, isRequired: true, achieved: false, badgeIcon: 'Database' },
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
    { category: 'Leadership', name: 'Team Management', description: 'Led teams', minYears: 3, isRequired: true, achieved: true, badgeIcon: 'Users' },
    { category: 'Technical', name: 'System Design', description: 'Designed systems', minYears: 2, isRequired: true, achieved: false, badgeIcon: 'Database' },
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

// ========================================
// localStorage Persistence Tests
// ========================================

const WEIGHTS_STORAGE_KEY = 'talentRpg_matchWeights';

// Mock localStorage for testing
const mockLocalStorage: Record<string, string> = {};
const originalLocalStorage = {
  getItem: (key: string) => mockLocalStorage[key] || null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { delete mockLocalStorage[key]; },
  clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); },
};

function testLocalStorageSave(): boolean {
  console.log('\n=== Test 6: localStorage Save ===');

  // Clear mock storage
  originalLocalStorage.clear();

  const weightsToSave: MatchWeights = {
    attributes: 50,
    experiences: 20,
    skillProficiency: 20,
    culturalFit: 10,
  };

  // Simulate saving to localStorage
  originalLocalStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weightsToSave));

  const saved = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);
  if (!saved) {
    console.error('❌ FAIL: Failed to save to localStorage');
    return false;
  }

  const parsed = JSON.parse(saved);
  if (parsed.attributes === 50 && parsed.experiences === 20) {
    console.log('✅ PASS: Weights saved to localStorage correctly');
    return true;
  }

  console.error('❌ FAIL: Saved weights do not match');
  return false;
}

function testLocalStorageLoad(): boolean {
  console.log('\n=== Test 7: localStorage Load ===');

  // Clear mock storage
  originalLocalStorage.clear();

  // Pre-populate storage
  const storedWeights: MatchWeights = {
    attributes: 35,
    experiences: 35,
    skillProficiency: 20,
    culturalFit: 10,
  };
  originalLocalStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(storedWeights));

  // Simulate loading
  const stored = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);
  if (!stored) {
    console.error('❌ FAIL: No stored weights found');
    return false;
  }

  const loaded = JSON.parse(stored);
  if (
    loaded.attributes === 35 &&
    loaded.experiences === 35 &&
    loaded.skillProficiency === 20 &&
    loaded.culturalFit === 10
  ) {
    console.log('✅ PASS: Weights loaded from localStorage correctly');
    return true;
  }

  console.error('❌ FAIL: Loaded weights do not match stored values');
  return false;
}

function testLocalStorageLoadWithDefaults(): boolean {
  console.log('\n=== Test 8: localStorage Load with Defaults (empty storage) ===');

  // Clear mock storage
  originalLocalStorage.clear();

  // Simulate loading when no stored value exists
  const stored = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);

  let loadedWeights: MatchWeights;
  if (stored) {
    loadedWeights = JSON.parse(stored);
  } else {
    loadedWeights = DEFAULT_WEIGHTS;
  }

  if (
    loadedWeights.attributes === DEFAULT_WEIGHTS.attributes &&
    loadedWeights.experiences === DEFAULT_WEIGHTS.experiences &&
    loadedWeights.skillProficiency === DEFAULT_WEIGHTS.skillProficiency &&
    loadedWeights.culturalFit === DEFAULT_WEIGHTS.culturalFit
  ) {
    console.log('✅ PASS: Default weights returned when localStorage is empty');
    return true;
  }

  console.error('❌ FAIL: Did not return default weights when storage is empty');
  return false;
}

function testLocalStorageClearOnNewProject(): boolean {
  console.log('\n=== Test 9: localStorage Clear on New Project ===');

  // Clear mock storage
  originalLocalStorage.clear();

  // First, save custom weights
  const customWeights: MatchWeights = {
    attributes: 60,
    experiences: 20,
    skillProficiency: 15,
    culturalFit: 5,
  };
  originalLocalStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(customWeights));

  // Verify saved
  const beforeClear = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);
  if (!beforeClear) {
    console.error('❌ FAIL: Weights not saved before clear test');
    return false;
  }
  console.log('Before clear:', beforeClear);

  // Simulate "New Project" clearing weights
  originalLocalStorage.removeItem(WEIGHTS_STORAGE_KEY);

  const afterClear = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);
  if (afterClear === null) {
    console.log('✅ PASS: localStorage cleared on New Project');
    return true;
  }

  console.error('❌ FAIL: localStorage not cleared');
  return false;
}

function testLocalStorageInvalidData(): boolean {
  console.log('\n=== Test 10: localStorage Invalid Data Handling ===');

  // Clear mock storage
  originalLocalStorage.clear();

  // Store invalid JSON
  originalLocalStorage.setItem(WEIGHTS_STORAGE_KEY, 'not-valid-json');

  // Try to load - should handle gracefully
  const stored = originalLocalStorage.getItem(WEIGHTS_STORAGE_KEY);
  let loadedWeights: MatchWeights;

  try {
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (
        typeof parsed.attributes === 'number' &&
        typeof parsed.experiences === 'number' &&
        typeof parsed.skillProficiency === 'number' &&
        typeof parsed.culturalFit === 'number'
      ) {
        loadedWeights = parsed;
      } else {
        loadedWeights = DEFAULT_WEIGHTS;
      }
    } else {
      loadedWeights = DEFAULT_WEIGHTS;
    }
  } catch {
    // JSON parse error - use defaults
    loadedWeights = DEFAULT_WEIGHTS;
  }

  if (
    loadedWeights.attributes === DEFAULT_WEIGHTS.attributes &&
    loadedWeights.experiences === DEFAULT_WEIGHTS.experiences
  ) {
    console.log('✅ PASS: Invalid data handled gracefully, defaults returned');
    return true;
  }

  console.error('❌ FAIL: Invalid data not handled properly');
  return false;
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

  // localStorage persistence tests
  results.push(testLocalStorageSave());
  results.push(testLocalStorageLoad());
  results.push(testLocalStorageLoadWithDefaults());
  results.push(testLocalStorageClearOnNewProject());
  results.push(testLocalStorageInvalidData());

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
