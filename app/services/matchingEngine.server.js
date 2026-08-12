/**
 * Calculates Levenshtein distance between two strings
 * Returns a score between 0 (completely different) and 100 (identical)
 */
function fuzzyMatchScore(s1, s2) {
  if (s1 === s2) return 100;
  if (s1.length === 0) return 0;
  if (s2.length === 0) return 0;

  const matrix = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return (1 - distance / maxLength) * 100;
}

/**
 * findMatches
 * Identifies the best matching Golden Record for a given Source Record.
 * 
 * @param {Object} sourceRecordData - Parsed JSON object of the source record data
 * @param {Array} goldenRecords - List of existing GoldenRecords (each containing parsed `data`)
 * @param {Array} matchingRules - List of matching rules from the DB
 * @param {Array} fieldMappings - Field mappings for this source
 * @returns {Object|null} - The matched GoldenRecord or null if no match
 */
export function findMatch(sourceRecordData, goldenRecords, matchingRules, fieldMappings) {
  // First, map the sourceRecordData to standard fields for easier comparison
  const standardSourceData = {};
  for (const mapping of fieldMappings) {
    if (sourceRecordData[mapping.sourceFieldName]) {
      standardSourceData[mapping.standardField.name] = sourceRecordData[mapping.sourceFieldName];
    }
  }

  // Evaluate matches
  let bestMatch = null;
  let highestScore = 0;

  for (const golden of goldenRecords) {
    const goldenData = typeof golden.data === 'string' ? JSON.parse(golden.data) : golden.data;
    let currentScore = 0;
    let possibleMaxScore = 0;
    let isExactMatchFailed = false;

    for (const rule of matchingRules) {
      const fieldName = rule.standardField.name;
      const sourceVal = String(standardSourceData[fieldName] || '').trim().toLowerCase();
      const goldenVal = String(goldenData[fieldName] || '').trim().toLowerCase();

      // If neither has the field, we can't compare on it
      if (!sourceVal && !goldenVal) {
        continue;
      }

      possibleMaxScore += rule.weight;

      if (rule.matchType === 'exact') {
        if (sourceVal && goldenVal && sourceVal === goldenVal) {
          currentScore += rule.weight;
        } else {
          // If it's an exact rule and it fails (and both exist), it might invalidate the match completely
          if (sourceVal && goldenVal) {
            isExactMatchFailed = true;
            break; 
          }
        }
      } else if (rule.matchType === 'fuzzy') {
        if (sourceVal && goldenVal) {
          // Custom fuzzy match score returns 0-100
          const fuzzyScore = fuzzyMatchScore(sourceVal, goldenVal);
          const threshold = (rule.threshold || 0.85) * 100;
          
          if (fuzzyScore >= threshold) {
            // Give proportional score based on weight
            currentScore += (fuzzyScore / 100) * rule.weight;
          }
        }
      }
    }

    if (isExactMatchFailed) {
      continue; // Skip this golden record
    }

    const normalizedScore = possibleMaxScore > 0 ? currentScore / possibleMaxScore : 0;
    
    // We require at least 50% match score based on weights
    if (normalizedScore > highestScore && normalizedScore >= 0.5) {
      highestScore = normalizedScore;
      bestMatch = golden;
    }
  }

  return bestMatch;
}
