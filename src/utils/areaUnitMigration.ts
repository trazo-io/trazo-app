/**
 * Area Unit Migration Utilities
 * Handles conversion of existing acre-based data to hectares
 * 
 * CRITICAL: This is for migrating existing data that was stored as acres
 * but labeled/treated as hectares in the application
 * 
 * @author Trazo Platform
 * @version 1.0.0
 * @date 2025-01-15
 */

import { AREA_CONVERSION_FACTORS } from './areaUnits';

export interface MigrationResult {
  success: boolean;
  converted: number;
  failed: number;
  errors: string[];
}

export interface ParcelDataLegacy {
  id: string | number;
  area: number;
  // Add other fields as needed
  [key: string]: any;
}

export interface EstablishmentDataLegacy {
  id: string | number;
  totalAcreage: number;
  // Add other fields as needed
  [key: string]: any;
}

/**
 * Convert legacy parcel area data from acres to hectares
 * This handles the case where area was stored as acres but used as hectares
 * 
 * @param parcels - Array of parcel data with area in acres
 * @returns Conversion result with updated data
 */
export function migrateParcelsFromAcresToHectares(
  parcels: ParcelDataLegacy[]
): { convertedParcels: ParcelDataLegacy[]; result: MigrationResult } {
  const result: MigrationResult = {
    success: true,
    converted: 0,
    failed: 0,
    errors: []
  };

  const convertedParcels: ParcelDataLegacy[] = [];

  for (const parcel of parcels) {
    try {
      if (typeof parcel.area !== 'number' || parcel.area <= 0) {
        result.failed++;
        result.errors.push(`Parcel ${parcel.id}: Invalid area value ${parcel.area}`);
        continue;
      }

      // Convert acres to hectares using high-precision factor
      const hectaresValue = parcel.area * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
      
      convertedParcels.push({
        ...parcel,
        area: parseFloat(hectaresValue.toFixed(6)), // High precision for storage
        _migration: {
          originalAcres: parcel.area,
          convertedHectares: hectaresValue,
          migrationDate: new Date().toISOString(),
          migrationVersion: '1.0.0'
        }
      });

      result.converted++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Parcel ${parcel.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (result.failed > 0) {
    result.success = false;
  }

  return { convertedParcels, result };
}

/**
 * Convert legacy establishment data from acres to hectares
 * 
 * @param establishments - Array of establishment data with totalAcreage in acres
 * @returns Conversion result with updated data
 */
export function migrateEstablishmentsFromAcresToHectares(
  establishments: EstablishmentDataLegacy[]
): { convertedEstablishments: EstablishmentDataLegacy[]; result: MigrationResult } {
  const result: MigrationResult = {
    success: true,
    converted: 0,
    failed: 0,
    errors: []
  };

  const convertedEstablishments: EstablishmentDataLegacy[] = [];

  for (const establishment of establishments) {
    try {
      if (typeof establishment.totalAcreage !== 'number' || establishment.totalAcreage <= 0) {
        result.failed++;
        result.errors.push(`Establishment ${establishment.id}: Invalid totalAcreage value ${establishment.totalAcreage}`);
        continue;
      }

      // Convert acres to hectares
      const hectaresValue = establishment.totalAcreage * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
      
      convertedEstablishments.push({
        ...establishment,
        totalAcreage: parseFloat(hectaresValue.toFixed(6)),
        _migration: {
          originalAcres: establishment.totalAcreage,
          convertedHectares: hectaresValue,
          migrationDate: new Date().toISOString(),
          migrationVersion: '1.0.0'
        }
      });

      result.converted++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Establishment ${establishment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (result.failed > 0) {
    result.success = false;
  }

  return { convertedEstablishments, result };
}

/**
 * Validate converted data - ensure reasonable hectare values
 * 
 * @param hectareValue - Converted hectare value
 * @param originalAcres - Original acre value for reference
 * @returns Validation result
 */
export function validateConvertedArea(hectareValue: number, originalAcres: number): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check if conversion makes sense (hectares should be ~0.4 of acres)
  const expectedHectares = originalAcres * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
  const difference = Math.abs(hectareValue - expectedHectares);
  
  if (difference > 0.001) {
    warnings.push(`Conversion mismatch: expected ${expectedHectares.toFixed(6)}, got ${hectareValue}`);
  }
  
  // Check for reasonable farm sizes (0.1 ha to 10,000 ha)
  if (hectareValue < 0.1) {
    warnings.push(`Very small area: ${hectareValue} hectares (${originalAcres} acres)`);
  } else if (hectareValue > 10000) {
    warnings.push(`Very large area: ${hectareValue} hectares (${originalAcres} acres)`);
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Generate migration report
 * 
 * @param results - Array of migration results
 * @returns Formatted report
 */
export function generateMigrationReport(results: MigrationResult[]): string {
  const totalConverted = results.reduce((sum, r) => sum + r.converted, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const allErrors = results.flatMap(r => r.errors);
  
  let report = `Area Unit Migration Report\n`;
  report += `=====================================\n`;
  report += `Total Records Converted: ${totalConverted}\n`;
  report += `Total Records Failed: ${totalFailed}\n`;
  report += `Success Rate: ${((totalConverted / (totalConverted + totalFailed)) * 100).toFixed(2)}%\n\n`;
  
  if (allErrors.length > 0) {
    report += `Errors:\n`;
    allErrors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
  }
  
  report += `\nMigration completed at: ${new Date().toISOString()}\n`;
  
  return report;
}

/**
 * Create backup data before migration
 * This creates a JSON export of original data for rollback purposes
 * 
 * @param data - Original data to backup
 * @returns JSON string of backup data
 */
export function createDataBackup(data: any[]): string {
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    recordCount: data.length,
    data: data
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Restore data from backup
 * Parse backup JSON and return original data
 * 
 * @param backupJson - JSON string of backup data
 * @returns Original data array
 */
export function restoreFromBackup(backupJson: string): any[] {
  try {
    const backup = JSON.parse(backupJson);
    
    if (!backup.data || !Array.isArray(backup.data)) {
      throw new Error('Invalid backup format');
    }
    
    return backup.data;
  } catch (error) {
    throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Example usage function - demonstrates how to use the migration utilities
 */
export function exampleMigrationUsage() {
  // Example parcel data (stored as acres but used as hectares)
  const exampleParcels: ParcelDataLegacy[] = [
    { id: 1, area: 10, name: "North Field" },
    { id: 2, area: 25, name: "South Field" },
    { id: 3, area: 5.5, name: "Orchard" }
  ];

  console.log('🔄 Starting area unit migration...');
  
  // Step 1: Create backup
  const backup = createDataBackup(exampleParcels);
  console.log('📦 Backup created');
  
  // Step 2: Perform migration
  const { convertedParcels, result } = migrateParcelsFromAcresToHectares(exampleParcels);
  
  // Step 3: Generate report
  const report = generateMigrationReport([result]);
  console.log(report);
  
  // Step 4: Validate results
  convertedParcels.forEach((parcel, index) => {
    const originalAcres = exampleParcels[index].area;
    const validation = validateConvertedArea(parcel.area, originalAcres);
    
    if (!validation.isValid) {
      console.warn(`⚠️ Validation warnings for parcel ${parcel.id}:`, validation.warnings);
    }
  });
  
  console.log('✅ Migration completed successfully');
  
  return {
    original: exampleParcels,
    converted: convertedParcels,
    backup,
    report
  };
}