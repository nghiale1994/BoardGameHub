import { SyncReport } from '../handler';

export function generateSyncReport(syncStatus: {
  totalTests: number;
  syncedTests: number;
  driftedTests: Array<{
    designDoc: string;
    missingInDoc: string[];
    extraInDoc: string[];
  }>;
}): SyncReport {
  const driftedCount = syncStatus.driftedTests.reduce(
    (sum, drift) => sum + drift.missingInDoc.length + drift.extraInDoc.length,
    0
  );

  return {
    totalTests: syncStatus.totalTests,
    syncedTests: syncStatus.syncedTests,
    driftedTests: driftedCount,
    driftDetails: syncStatus.driftedTests,
    updatedDocs: []
  };
}

export function formatSyncReport(report: SyncReport): string {
  let output = `📊 Test-Docs Sync Report\n`;
  output += `========================\n\n`;

  output += `Total Tests: ${report.totalTests}\n`;
  output += `Synced Tests: ${report.syncedTests}\n`;
  output += `Drifted Tests: ${report.driftedTests}\n`;
  output += `Sync Status: ${report.driftedTests === 0 ? '✅ All synced' : '❌ Drift detected'}\n\n`;

  if (report.driftDetails.length > 0) {
    output += `🔍 Drift Details:\n`;
    for (const drift of report.driftDetails) {
      output += `\n📄 ${drift.designDoc}:\n`;
      if (drift.missingInDoc.length > 0) {
        output += `  ❌ Missing in doc: ${drift.missingInDoc.join(', ')}\n`;
      }
      if (drift.extraInDoc.length > 0) {
        output += `  ⚠️  Extra in doc: ${drift.extraInDoc.join(', ')}\n`;
      }
    }
  }

  if (report.updatedDocs.length > 0) {
    output += `\n🔧 Updated Docs:\n`;
    for (const doc of report.updatedDocs) {
      output += `  ✅ ${doc}\n`;
    }
  }

  return output;
}