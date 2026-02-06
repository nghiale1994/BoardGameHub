#!/usr/bin/env node

// Demo script for sync-test-docs skill
// Run with: node demo.js

import { syncTestDocs } from './handler.js';
import { formatSyncReport } from './utils/report-generator.js';

async function demo() {
  console.log('🚀 Testing sync-test-docs skill...\n');

  try {
    // Test 1: Dry run on current test files
    console.log('📋 Test 1: Dry run scan');
    const report = await syncTestDocs({
      dryRun: true,
      testFiles: ['app/e2e/homepage.spec.ts'] // Test with known file
    });

    console.log(formatSyncReport(report));
    console.log('\n✅ Skill execution completed successfully!');

  } catch (error) {
    console.error('❌ Skill execution failed:', error);
  }
}

demo();