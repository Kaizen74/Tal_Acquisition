/**
 * Soft Preferences Extraction Test
 * Verifies that the preference detection system only activates when
 * explicit preference language is found in the JD/success profile.
 */

// Preference indicator terms (same as in semanticMatching.ts)
const preferenceIndicators = [
  'prefer', 'preferred', 'preference', 'preferences',
  'ideal', 'ideally', 'ideal candidate', 'ideal candidates',
  'nice to have', 'nice-to-have', 'bonus', 'plus',
  'advantageous', 'advantage', 'desirable', 'desired',
  'would be beneficial', 'would be an asset', 'an asset',
  'strongly desired', 'highly desired', 'highly preferred'
];

function extractSoftPreferences(textSources: string[]): { hasPreferences: boolean; preferredCriteria: string[] } {
  const preferredCriteria: string[] = [];

  for (const text of textSources) {
    if (!text || text.trim().length === 0) continue;
    const sentences = text.split(/[.!?\n;]/).map(s => s.trim()).filter(s => s.length > 10);

    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      const hasPreferenceLanguage = preferenceIndicators.some(indicator =>
        sentenceLower.includes(indicator)
      );

      if (hasPreferenceLanguage) {
        const cleanedSentence = sentence
          .replace(/^\s*[-•*]\s*/, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleanedSentence.length > 15 && !preferredCriteria.includes(cleanedSentence)) {
          preferredCriteria.push(cleanedSentence);
        }
      }
    }
  }

  return {
    hasPreferences: preferredCriteria.length > 0,
    preferredCriteria,
  };
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('           SOFT PREFERENCES EXTRACTION TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

// Test 1: No preference language - should return empty
console.log('=== Test 1: No Preference Language ===');
const test1 = extractSoftPreferences([
  'Must have 5 years of experience in logistics.',
  'Strong leadership skills required.',
  'Bachelor degree in business administration.'
]);
console.log(`  hasPreferences: ${test1.hasPreferences}`);
console.log(`  preferredCriteria: ${test1.preferredCriteria.length}`);
if (!test1.hasPreferences) {
  console.log('✅ PASS: No false positives\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 2: "Preferred" keyword
console.log('=== Test 2: "Preferred" Keyword ===');
const test2 = extractSoftPreferences([
  'MBA preferred but not required.',
  'Strong leadership skills required.'
]);
console.log(`  hasPreferences: ${test2.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test2.preferredCriteria)}`);
if (test2.hasPreferences && test2.preferredCriteria[0].includes('MBA')) {
  console.log('✅ PASS: Detected "preferred"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 3: "Ideal" keyword
console.log('=== Test 3: "Ideal" Keyword ===');
const test3 = extractSoftPreferences([
  'Experience in aviation industry would be ideal for this role.'
]);
console.log(`  hasPreferences: ${test3.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test3.preferredCriteria)}`);
if (test3.hasPreferences && test3.preferredCriteria[0].includes('aviation')) {
  console.log('✅ PASS: Detected "ideal"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 4: "Nice to have" keyword
console.log('=== Test 4: "Nice to Have" Keyword ===');
const test4 = extractSoftPreferences([
  'Python programming skills would be nice to have.'
]);
console.log(`  hasPreferences: ${test4.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test4.preferredCriteria)}`);
if (test4.hasPreferences && test4.preferredCriteria[0].includes('Python')) {
  console.log('✅ PASS: Detected "nice to have"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 5: "Desirable" keyword
console.log('=== Test 5: "Desirable" Keyword ===');
const test5 = extractSoftPreferences([
  'PMP certification is desirable but not mandatory.'
]);
console.log(`  hasPreferences: ${test5.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test5.preferredCriteria)}`);
if (test5.hasPreferences && test5.preferredCriteria[0].includes('PMP')) {
  console.log('✅ PASS: Detected "desirable"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 6: "Bonus" keyword
console.log('=== Test 6: "Bonus" Keyword ===');
const test6 = extractSoftPreferences([
  'Experience with SAP would be a bonus.'
]);
console.log(`  hasPreferences: ${test6.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test6.preferredCriteria)}`);
if (test6.hasPreferences && test6.preferredCriteria[0].includes('SAP')) {
  console.log('✅ PASS: Detected "bonus"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 7: Multiple preferences in one text
console.log('=== Test 7: Multiple Preferences ===');
const test7 = extractSoftPreferences([
  'MBA degree is preferred for this role. Experience in logistics industry would be ideal. Six Sigma certification is desirable.'
]);
console.log(`  hasPreferences: ${test7.hasPreferences}`);
console.log(`  preferredCriteria count: ${test7.preferredCriteria.length}`);
test7.preferredCriteria.forEach((c, i) => console.log(`    ${i+1}. "${c}"`));
if (test7.preferredCriteria.length === 3) {
  console.log('✅ PASS: Detected all 3 preferences\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 8: "Advantageous" keyword
console.log('=== Test 8: "Advantageous" Keyword ===');
const test8 = extractSoftPreferences([
  'Knowledge of Chinese language would be advantageous.'
]);
console.log(`  hasPreferences: ${test8.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test8.preferredCriteria)}`);
if (test8.hasPreferences && test8.preferredCriteria[0].includes('Chinese')) {
  console.log('✅ PASS: Detected "advantageous"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

// Test 9: "Would be an asset" keyword
console.log('=== Test 9: "Would Be An Asset" Keyword ===');
const test9 = extractSoftPreferences([
  'Previous startup experience would be an asset.'
]);
console.log(`  hasPreferences: ${test9.hasPreferences}`);
console.log(`  preferredCriteria: ${JSON.stringify(test9.preferredCriteria)}`);
if (test9.hasPreferences && test9.preferredCriteria[0].includes('startup')) {
  console.log('✅ PASS: Detected "would be an asset"\n');
  passed++;
} else {
  console.log('❌ FAIL\n');
  failed++;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log(`           SOFT PREFERENCES TEST RESULTS: ${passed}/${passed + failed} passed`);
console.log('═══════════════════════════════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
}
