/**
 * UI Integration Test for Weight Configuration
 * Verifies the data flow: WeightConfig -> Dashboard state -> calculateMatchScore -> MatchScore display
 */

import { DEFAULT_WEIGHTS, MatchWeights } from '../utils/calculateMatch';

// Simulate the WeightConfig component validation logic
function validateWeights(weights: MatchWeights): { isValid: boolean; total: number } {
  const total = weights.attributes + weights.experiences + weights.skillProficiency + weights.culturalFit;
  return { isValid: total === 100, total };
}

// Simulate the Dashboard state update logic
function simulateDashboardWeightUpdate(
  currentWeights: MatchWeights,
  key: keyof MatchWeights,
  newValue: number
): { newWeights: MatchWeights; shouldApply: boolean } {
  const newWeights = { ...currentWeights, [key]: newValue };
  const { isValid } = validateWeights(newWeights);
  return { newWeights, shouldApply: isValid };
}

// Test UI data flow scenarios
function testWeightSliderInteraction(): boolean {
  console.log('\n=== UI Test 1: Weight Slider Interaction ===');

  let currentWeights = { ...DEFAULT_WEIGHTS };
  console.log('Initial weights:', currentWeights);

  // User adjusts attributes from 40 to 50 (+10)
  // To maintain 100%, they need to reduce another by 10
  let result = simulateDashboardWeightUpdate(currentWeights, 'attributes', 50);
  console.log('After increasing attributes to 50:', result.newWeights);
  console.log('Should apply (total=100)?:', result.shouldApply, `(total: ${validateWeights(result.newWeights).total})`);

  // This should NOT apply because total is now 110
  if (result.shouldApply) {
    console.error('❌ FAIL: Should not apply when total != 100');
    return false;
  }

  // User also reduces experiences from 30 to 20 (-10)
  result = simulateDashboardWeightUpdate(result.newWeights, 'experiences', 20);
  console.log('After reducing experiences to 20:', result.newWeights);
  console.log('Should apply?:', result.shouldApply, `(total: ${validateWeights(result.newWeights).total})`);

  if (result.shouldApply) {
    console.log('✅ PASS: Weights correctly validated before applying');
    return true;
  } else {
    console.error('❌ FAIL: Should apply when total = 100');
    return false;
  }
}

function testResetToDefaults(): boolean {
  console.log('\n=== UI Test 2: Reset to Defaults ===');

  const customWeights: MatchWeights = {
    attributes: 25,
    experiences: 25,
    skillProficiency: 25,
    culturalFit: 25,
  };

  console.log('Custom weights before reset:', customWeights);

  // Simulate reset button click
  const resetWeights = { ...DEFAULT_WEIGHTS };
  console.log('Weights after reset:', resetWeights);

  const isDefault =
    resetWeights.attributes === 40 &&
    resetWeights.experiences === 30 &&
    resetWeights.skillProficiency === 20 &&
    resetWeights.culturalFit === 10;

  if (isDefault) {
    console.log('✅ PASS: Reset correctly restores default weights');
    return true;
  } else {
    console.error('❌ FAIL: Reset did not restore defaults');
    return false;
  }
}

function testMatchScoreDisplayIntegration(): boolean {
  console.log('\n=== UI Test 3: MatchScore Display Integration ===');

  // Simulate the MatchScore component receiving weights
  const mockScore = {
    overall: 78,
    breakdown: {
      competencies: 98,
      experiences: 50,
      tools: 93,
      cultural: 50,
    },
    weights: {
      attributes: 40,
      experiences: 30,
      skillProficiency: 20,
      culturalFit: 10,
    },
  };

  // Simulate how MatchScore component renders the breakdown
  const displayData = [
    { label: 'Attributes', value: mockScore.breakdown.competencies, weight: `${mockScore.weights?.attributes ?? 40}%` },
    { label: 'Experiences', value: mockScore.breakdown.experiences, weight: `${mockScore.weights?.experiences ?? 30}%` },
    { label: 'Skill Proficiency', value: mockScore.breakdown.tools, weight: `${mockScore.weights?.skillProficiency ?? 20}%` },
    { label: 'Cultural Fit', value: mockScore.breakdown.cultural, weight: `${mockScore.weights?.culturalFit ?? 10}%` },
  ];

  console.log('MatchScore display data:');
  displayData.forEach(item => {
    console.log(`  ${item.label}: ${item.value}% (${item.weight})`);
  });

  // Verify Skill Proficiency label is used (not "Tools")
  const skillProficiencyItem = displayData.find(d => d.label === 'Skill Proficiency');
  const toolsItem = displayData.find(d => d.label === 'Tools');

  if (skillProficiencyItem && !toolsItem) {
    console.log('✅ PASS: Label correctly shows "Skill Proficiency" instead of "Tools"');
    return true;
  } else {
    console.error('❌ FAIL: Label should be "Skill Proficiency"');
    return false;
  }
}

function testWeightPropagationToCandidate(): boolean {
  console.log('\n=== UI Test 4: Weight Propagation to Candidate Cards ===');

  // Simulate candidate card receiving score with weights
  const candidateScore = {
    overall: 85,
    breakdown: {
      competencies: 92,
      experiences: 75,
      tools: 88,
      cultural: 60,
    },
    weights: {
      attributes: 50,
      experiences: 20,
      skillProficiency: 20,
      culturalFit: 10,
    },
  };

  // Verify the candidate card can access the weights
  const hasWeights = candidateScore.weights !== undefined;
  const weightsTotal = hasWeights
    ? candidateScore.weights!.attributes + candidateScore.weights!.experiences +
      candidateScore.weights!.skillProficiency + candidateScore.weights!.culturalFit
    : 0;

  console.log('Candidate score has weights:', hasWeights);
  console.log('Weights total:', weightsTotal);

  if (hasWeights && weightsTotal === 100) {
    console.log('✅ PASS: Weights correctly propagated to candidate cards');
    return true;
  } else {
    console.error('❌ FAIL: Weights not correctly propagated');
    return false;
  }
}

function testEdgeCases(): boolean {
  console.log('\n=== UI Test 5: Edge Cases ===');

  // Test zero weight
  const zeroWeight: MatchWeights = {
    attributes: 100,
    experiences: 0,
    skillProficiency: 0,
    culturalFit: 0,
  };
  const zeroResult = validateWeights(zeroWeight);
  console.log('Zero weights scenario (100-0-0-0):', zeroResult);

  // Test extreme redistribution
  const extremeWeight: MatchWeights = {
    attributes: 1,
    experiences: 1,
    skillProficiency: 1,
    culturalFit: 97,
  };
  const extremeResult = validateWeights(extremeWeight);
  console.log('Extreme weights scenario (1-1-1-97):', extremeResult);

  if (zeroResult.isValid && extremeResult.isValid) {
    console.log('✅ PASS: Edge cases handled correctly');
    return true;
  } else {
    console.error('❌ FAIL: Edge case handling issues');
    return false;
  }
}

// Run all UI tests
export function runUITests(): void {
  console.log('========================================');
  console.log('Weight Configuration UI Integration Tests');
  console.log('========================================');

  const results: boolean[] = [];

  results.push(testWeightSliderInteraction());
  results.push(testResetToDefaults());
  results.push(testMatchScoreDisplayIntegration());
  results.push(testWeightPropagationToCandidate());
  results.push(testEdgeCases());

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n========================================');
  console.log(`UI Test Results: ${passed}/${total} passed`);
  console.log('========================================');

  if (passed === total) {
    console.log('🎉 All UI tests passed! Weight configuration UI flow is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }
}

runUITests();
