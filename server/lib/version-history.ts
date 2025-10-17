import { IStorage } from '../storage';
import type { Quotation, InteriorItem, FalseCeilingItem, OtherItem } from '@shared/schema';

interface SnapshotData {
  quotation: Quotation;
  interiorItems?: InteriorItem[];
  falseCeilingItems?: FalseCeilingItem[];
  otherItems?: OtherItem[];
  totals?: any;
}

/**
 * Creates a version snapshot of a quotation
 */
export async function createVersionSnapshot(
  storage: IStorage,
  quotationId: string,
  userId: string,
  changeType: 'create' | 'update_info' | 'update_items' | 'update_pricing' | 'status_change',
  changeSummary: string
): Promise<void> {
  try {
    // Get current quotation data
    const quotation = await storage.getQuotation(quotationId);
    if (!quotation) {
      console.error('Quotation not found for version snapshot:', quotationId);
      return;
    }

    // Get related items
    const interiorItems = await storage.getInteriorItems(quotationId);
    const falseCeilingItems = await storage.getFalseCeilingItems(quotationId);
    const otherItems = await storage.getOtherItems(quotationId);

    // Build snapshot
    const snapshot: SnapshotData = {
      quotation,
      interiorItems: interiorItems.length > 0 ? interiorItems : undefined,
      falseCeilingItems: falseCeilingItems.length > 0 ? falseCeilingItems : undefined,
      otherItems: otherItems.length > 0 ? otherItems : undefined,
      totals: quotation.totals,
    };

    // Get next version number
    const latestVersion = await storage.getLatestVersionNumber(quotationId);
    const versionNumber = latestVersion + 1;

    // Create version record
    await storage.createQuotationVersion({
      quotationId,
      userId,
      versionNumber,
      changeType,
      changeSummary,
      snapshot,
    });

    console.log(`Created version ${versionNumber} for quotation ${quotationId}: ${changeSummary}`);
  } catch (error) {
    console.error('Error creating version snapshot:', error);
    // Don't throw - version history should not block main operations
  }
}

/**
 * Generates a change summary based on what changed
 */
export function generateChangeSummary(
  changeType: string,
  oldData?: any,
  newData?: any
): string {
  switch (changeType) {
    case 'create':
      return `Created quotation for ${newData?.clientName || 'client'}`;
    
    case 'update_info':
      const changes: string[] = [];
      if (oldData?.clientName !== newData?.clientName) {
        changes.push(`client name to ${newData.clientName}`);
      }
      if (oldData?.projectName !== newData?.projectName) {
        changes.push(`project name to ${newData.projectName}`);
      }
      if (oldData?.buildType !== newData?.buildType) {
        changes.push(`build type to ${newData.buildType}`);
      }
      return changes.length > 0 
        ? `Updated ${changes.join(', ')}`
        : 'Updated project information';
    
    case 'update_items':
      return 'Modified quotation items';
    
    case 'update_pricing':
      return 'Updated pricing and totals';
    
    case 'status_change':
      return `Changed status to ${newData?.status || 'unknown'}`;
    
    default:
      return 'Modified quotation';
  }
}
