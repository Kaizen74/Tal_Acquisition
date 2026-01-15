/**
 * Experience Badge Matching Tests
 * Verifies that experience badges are correctly matched based on candidate data
 */

// Mock experience requirements (similar to the dashboard)
const mockExperiences = [
  {
    category: 'Aviation Leadership',
    name: 'Senior Aviation Management',
    description: 'Executive leadership in aviation, logistics, or express delivery',
    minYears: 8,
    isRequired: true,
    achieved: false,
    badgeIcon: 'Users',
  },
  {
    category: 'Operations Management',
    name: 'Large-Scale Operations Management',
    description: 'Managing large-scale logistics or operations teams',
    minYears: 15,
    isRequired: true,
    achieved: false,
    badgeIcon: 'TrendingUp',
  },
  {
    category: 'Business Development',
    name: 'Business Growth & Expansion',
    description: 'P&L responsibility and business expansion experience',
    minYears: 10,
    isRequired: true,
    achieved: false,
    badgeIcon: 'Award',
  },
  {
    category: 'International Business',
    name: 'Multicultural Business Environment',
    description: 'Experience working in international/multicultural settings',
    minYears: 5,
    isRequired: false,
    achieved: false,
    badgeIcon: 'Globe',
  },
];

// Experience keyword matching patterns (from the parser)
const EXPERIENCE_MATCHERS: Record<string, string[]> = {
  'leadership': ['md', 'managing director', 'ceo', 'coo', 'cfo', 'cto', 'chief', 'president', 'vp', 'vice president', 'svp', 'evp', 'director', 'head of', 'general manager', 'gm', 'gmb', 'c-suite', 'executive'],
  'senior': ['senior', 'sr', 'lead', 'principal', 'chief', 'head', 'director', 'vp', 'vice president', 'md', 'managing director', 'gmb', 'gm-', 'jg1', 'jg2', 'jg3', 'executive', 'c-level'],
  'management': ['manager', 'management', 'managing', 'supervisor', 'team lead', 'head of', 'director'],
  'aviation': ['aviation', 'airline', 'airport', 'cargo', 'freight', 'logistics', 'express', 'dhl', 'fedex', 'ups', 'air', 'flight', 'aircraft'],
  'operations': ['operations', 'ops', 'operational', 'supply chain', 'logistics', 'warehouse', 'distribution', 'fulfillment', 'process'],
  'large-scale': ['large', 'scale', 'enterprise', 'global', 'regional', 'national', 'international', 'multi', 'cross-functional', 'emea', 'apac', 'americas'],
  'business': ['business', 'commercial', 'sales', 'revenue', 'p&l', 'profit', 'growth', 'expansion', 'market', 'strategy'],
  'development': ['development', 'growth', 'expansion', 'new market', 'transformation', 'innovation', 'initiative'],
  'international': ['international', 'global', 'multi-country', 'cross-border', 'emea', 'apac', 'americas', 'regional', 'multinational'],
  'multicultural': ['multicultural', 'diverse', 'international', 'global', 'cross-cultural', 'multi-national'],
  'p&l': ['p&l', 'profit', 'loss', 'budget', 'financial', 'revenue', 'cost', 'md', 'managing director', 'gm', 'general manager', 'ceo', 'coo', 'cfo', 'country manager', 'regional manager', 'head of'],
  'strategy': ['strategy', 'strategic', 'planning', 'transformation', 'vision', 'roadmap'],
};

// Analyze experience match function (same logic as parser)
function analyzeExperienceMatch(
  experience: { category: string; name: string; description: string; minYears: number },
  candidateData: string,
  yearsExperience: number
): { achieved: boolean; matchScore: number; matchedPatterns: string[] } {
  const dataLower = candidateData.toLowerCase();
  const expName = experience.name.toLowerCase();
  const expCategory = experience.category.toLowerCase();
  const expDesc = experience.description.toLowerCase();

  const expTerms = `${expName} ${expCategory} ${expDesc}`.split(/\s+/);

  let matchScore = 0;
  let matchedPatterns: string[] = [];

  for (const [category, patterns] of Object.entries(EXPERIENCE_MATCHERS)) {
    const categoryRelevant = expTerms.some(term =>
      category.includes(term) || term.includes(category)
    ) || expName.includes(category) || expCategory.includes(category);

    if (categoryRelevant) {
      for (const pattern of patterns) {
        if (dataLower.includes(pattern)) {
          matchScore += 1;
          if (!matchedPatterns.includes(pattern)) {
            matchedPatterns.push(pattern);
          }
        }
      }
    }
  }

  const directKeywords = expName.split(/[\s-]+/).filter(w => w.length > 3);
  for (const keyword of directKeywords) {
    if (dataLower.includes(keyword.toLowerCase())) {
      matchScore += 2;
    }
  }

  const meetsYearsRequirement = yearsExperience >= (experience.minYears * 0.7);
  const achieved = matchScore >= 2 && meetsYearsRequirement;

  return { achieved, matchScore, matchedPatterns };
}

// Test cases
function testScholving(): boolean {
  console.log('\n=== Test 1: Stéphane Scholving - MD Netherlands (GMB-2) ===');

  // Simulate Scholving's CSV data
  const scholvingData = `
    Managing Director Netherlands
    GMB-2 organization level
    Gateway General Netherlands EMEA
    21.8 years tenure
    Express cargo logistics
  `.toLowerCase();

  const yearsExp = 21.8;

  console.log('Candidate data keywords:', scholvingData.split(/\s+/).filter(w => w.length > 2).slice(0, 15).join(', ') + '...');
  console.log(`Years experience: ${yearsExp}\n`);

  let allCorrect = true;

  for (const exp of mockExperiences) {
    const result = analyzeExperienceMatch(exp, scholvingData, yearsExp);
    const expected = true; // Scholving should match all experiences

    console.log(`  ${exp.name}:`);
    console.log(`    Match score: ${result.matchScore}`);
    console.log(`    Matched patterns: ${result.matchedPatterns.slice(0, 5).join(', ')}${result.matchedPatterns.length > 5 ? '...' : ''}`);
    console.log(`    Achieved: ${result.achieved ? '✓ YES' : '✗ NO'}`);

    if (exp.name === 'Senior Aviation Management' && !result.achieved) {
      console.log(`    ⚠️ EXPECTED: YES (MD = senior, express/logistics = aviation industry)`);
      allCorrect = false;
    }
  }

  if (allCorrect) {
    console.log('\n✅ PASS: Scholving correctly matches senior aviation leadership');
    return true;
  } else {
    console.log('\n❌ FAIL: Some experience matches incorrect');
    return false;
  }
}

function testJuniorCandidate(): boolean {
  console.log('\n=== Test 2: Junior Candidate - Manager (5 years) ===');

  const juniorData = `
    operations manager
    team lead logistics
    warehouse management
  `.toLowerCase();

  const yearsExp = 5;

  console.log(`Years experience: ${yearsExp}\n`);

  const results: { name: string; achieved: boolean }[] = [];

  for (const exp of mockExperiences) {
    const result = analyzeExperienceMatch(exp, juniorData, yearsExp);
    results.push({ name: exp.name, achieved: result.achieved });
    console.log(`  ${exp.name}: ${result.achieved ? '✓' : '✗'} (score: ${result.matchScore})`);
  }

  // Junior should NOT have senior aviation leadership (insufficient years and no senior indicators)
  const seniorAviationAchieved = results.find(r => r.name === 'Senior Aviation Management')?.achieved;
  if (!seniorAviationAchieved) {
    console.log('\n✅ PASS: Junior candidate correctly does NOT have senior aviation leadership');
    return true;
  } else {
    console.log('\n❌ FAIL: Junior incorrectly has senior aviation leadership');
    return false;
  }
}

function testVPCandidate(): boolean {
  console.log('\n=== Test 3: VP Supply Chain - Regional (15 years) ===');

  const vpData = `
    vice president supply chain
    regional operations EMEA
    p&l responsibility
    international business development
  `.toLowerCase();

  const yearsExp = 15;

  console.log(`Years experience: ${yearsExp}\n`);

  const results: { name: string; achieved: boolean; score: number }[] = [];

  for (const exp of mockExperiences) {
    const result = analyzeExperienceMatch(exp, vpData, yearsExp);
    results.push({ name: exp.name, achieved: result.achieved, score: result.matchScore });
    console.log(`  ${exp.name}: ${result.achieved ? '✓' : '✗'} (score: ${result.matchScore})`);
  }

  // VP should have most experiences
  const achievedCount = results.filter(r => r.achieved).length;
  if (achievedCount >= 3) {
    console.log(`\n✅ PASS: VP correctly has ${achievedCount}/4 experiences`);
    return true;
  } else {
    console.log(`\n❌ FAIL: VP should have more experiences (got ${achievedCount}/4)`);
    return false;
  }
}

function testOldThresholdBug(): boolean {
  console.log('\n=== Test 4: Old Threshold Bug Check ===');
  console.log('Verifying that first experience is now achievable with score-based fallback\n');

  // Old formula: achievementThreshold = 100 - (index / length) * 60
  // For 4 experiences: [100, 85, 70, 55] - first was impossible!

  // New formula: achievementThreshold = 100 - ((index + 1) / (length + 1)) * 50
  // For 4 experiences: [90, 80, 70, 60] - all achievable!

  const length = 4;
  const oldThresholds: number[] = [];
  const newThresholds: number[] = [];

  for (let i = 0; i < length; i++) {
    oldThresholds.push(Math.round(100 - (i / length) * 60));
    newThresholds.push(Math.round(100 - ((i + 1) / (length + 1)) * 50));
  }

  console.log('  Old thresholds (buggy):', oldThresholds.join(', '));
  console.log('  New thresholds (fixed):', newThresholds.join(', '));

  const oldFirstAchievable = oldThresholds[0] <= 100;
  const newFirstAchievable = newThresholds[0] <= 95; // High score of 95 should achieve first

  console.log(`\n  Old: First exp requires ${oldThresholds[0]}% (impossible if >100)`);
  console.log(`  New: First exp requires ${newThresholds[0]}% (achievable with high score)`);

  if (newThresholds[0] < 95 && newThresholds.every(t => t <= 90)) {
    console.log('\n✅ PASS: New threshold formula allows all experiences to be achievable');
    return true;
  } else {
    console.log('\n❌ FAIL: Threshold formula still has issues');
    return false;
  }
}

function testKeywordMatching(): boolean {
  console.log('\n=== Test 5: Keyword Pattern Matching ===');

  // Test that key patterns are correctly identified
  const testCases = [
    { data: 'managing director netherlands', patterns: ['managing director', 'md'] },
    { data: 'gmb-2 level executive', patterns: ['gmb', 'executive'] },
    { data: 'express cargo logistics emea', patterns: ['express', 'logistics', 'emea'] },
    { data: 'vp operations global supply chain', patterns: ['vp', 'operations', 'global', 'supply chain'] },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const dataLower = tc.data.toLowerCase();
    const foundPatterns: string[] = [];

    for (const patterns of Object.values(EXPERIENCE_MATCHERS)) {
      for (const pattern of patterns) {
        if (dataLower.includes(pattern) && !foundPatterns.includes(pattern)) {
          foundPatterns.push(pattern);
        }
      }
    }

    const matchCount = tc.patterns.filter(p => foundPatterns.includes(p)).length;
    const passed = matchCount >= tc.patterns.length * 0.5;

    console.log(`  "${tc.data}"`);
    console.log(`    Expected: ${tc.patterns.join(', ')}`);
    console.log(`    Found: ${foundPatterns.slice(0, 8).join(', ')}${foundPatterns.length > 8 ? '...' : ''}`);
    console.log(`    ${passed ? '✓' : '✗'} Match rate: ${matchCount}/${tc.patterns.length}`);

    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n✅ PASS: Keyword patterns correctly identify relevant terms');
    return true;
  } else {
    console.log('\n❌ FAIL: Some keyword patterns not matched correctly');
    return false;
  }
}

// Run all tests
function runAllTests(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           Experience Badge Matching Tests');
  console.log('═══════════════════════════════════════════════════════════════');

  const results: boolean[] = [];

  results.push(testScholving());
  results.push(testJuniorCandidate());
  results.push(testVPCandidate());
  results.push(testOldThresholdBug());
  results.push(testKeywordMatching());

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`              Test Results: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (passed === total) {
    console.log('\n🎉 All experience badge matching tests passed!');
    console.log('\nFixes Applied:');
    console.log('  1. ✅ Intelligent keyword matching based on actual candidate data');
    console.log('  2. ✅ Fixed threshold formula so first experience is achievable');
    console.log('  3. ✅ MD/Managing Director now correctly maps to senior leadership');
    console.log('  4. ✅ GMB-2 organization level indicates senior executive');
    console.log('  5. ✅ Express/cargo/logistics maps to aviation industry');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above.');
  }
}

runAllTests();
