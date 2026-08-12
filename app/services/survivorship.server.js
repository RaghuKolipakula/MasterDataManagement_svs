/**
 * updateGoldenRecordData
 * Re-compiles a GoldenRecord's data based on its linked SourceRecords and SurvivorshipRules.
 * 
 * @param {Array} sourceRecords - The linked SourceRecords for this GoldenRecord
 * @param {Array} survivorshipRules - The rules defining data source priority per standard field
 * @param {Array} standardFields - All standard fields
 * @param {Array} fieldMappings - All field mappings across all data sources
 * @returns {Object} - The recompiled GoldenRecord data
 */
export function updateGoldenRecordData(sourceRecords, survivorshipRules, standardFields, fieldMappings) {
  const finalData = {};
  
  // Create a fast lookup for field mappings: dataSourceId -> standardFieldId -> sourceFieldName
  const mappingLookup = {};
  for (const mapping of fieldMappings) {
    if (!mappingLookup[mapping.dataSourceId]) mappingLookup[mapping.dataSourceId] = {};
    mappingLookup[mapping.dataSourceId][mapping.standardFieldId] = mapping.sourceFieldName;
  }

  // Evaluate each standard field
  for (const field of standardFields) {
    // Get rules for this specific field, sorted by priority (lowest number = highest priority)
    const rulesForField = survivorshipRules
      .filter(r => r.standardFieldId === field.id)
      .sort((a, b) => a.priority - b.priority);

    let selectedValue = null;

    // 1. Try to find a value based on survivorship rules (in priority order)
    for (const rule of rulesForField) {
      const recordsFromSource = sourceRecords.filter(r => r.dataSourceId === rule.dataSourceId);
      
      // Sort by recently updated if there are multiple records from the same source
      recordsFromSource.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      for (const record of recordsFromSource) {
        const sourceFieldName = mappingLookup[rule.dataSourceId]?.[field.id];
        if (sourceFieldName) {
          const recordData = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
          if (recordData[sourceFieldName]) {
            selectedValue = recordData[sourceFieldName];
            break;
          }
        }
      }

      if (selectedValue) break; // Found our winner for this field
    }

    // 2. Fallback: If no rule applied or the high-priority source didn't have the data, 
    // just pick the most recently updated record that has this field mapped.
    if (!selectedValue) {
      const sortedRecords = [...sourceRecords].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      for (const record of sortedRecords) {
        const sourceFieldName = mappingLookup[record.dataSourceId]?.[field.id];
        if (sourceFieldName) {
          const recordData = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
          if (recordData[sourceFieldName]) {
            selectedValue = recordData[sourceFieldName];
            break;
          }
        }
      }
    }

    if (selectedValue) {
      finalData[field.name] = selectedValue;
    }
  }

  return finalData;
}
