#!/usr/bin/env tsx

import { auditContract, auditAllContracts, type AuditResult } from '../server/audit/contractSeedAudit';

interface AuditTableRow {
  contractId: string;
  contractName: string;
  status: string;
  expected: string;
  actual: string;
  missing: string;
  duplicates: string;
  finalized: string;
}

function formatAuditTable(results: AuditResult[]): void {
  if (results.length === 0) {
    console.log('No contracts found to audit.');
    return;
  }

  // Prepare table data
  const rows: AuditTableRow[] = results.map(result => ({
    contractId: result.contractId.toString(),
    contractName: result.contractName.length > 25 ? 
      result.contractName.substring(0, 22) + '...' : result.contractName,
    status: result.status === 'healthy' ? '✅ Healthy' : '⚠️  Issues',
    expected: result.expectedShifts.toString(),
    actual: result.actualShifts.toString(),
    missing: result.missing.length.toString(),
    duplicates: result.duplicates.length.toString(),
    finalized: result.finalizedTouched.toString()
  }));

  // Calculate column widths
  const widths = {
    contractId: Math.max(3, ...rows.map(r => r.contractId.length)),
    contractName: Math.max(8, ...rows.map(r => r.contractName.length)),
    status: Math.max(6, ...rows.map(r => r.status.length)),
    expected: Math.max(8, ...rows.map(r => r.expected.length)),
    actual: Math.max(6, ...rows.map(r => r.actual.length)),
    missing: Math.max(7, ...rows.map(r => r.missing.length)),
    duplicates: Math.max(10, ...rows.map(r => r.duplicates.length)),
    finalized: Math.max(9, ...rows.map(r => r.finalized.length))
  };

  // Print header
  const header = [
    'ID'.padEnd(widths.contractId),
    'Contract'.padEnd(widths.contractName),
    'Status'.padEnd(widths.status),
    'Expected'.padEnd(widths.expected),
    'Actual'.padEnd(widths.actual),
    'Missing'.padEnd(widths.missing),
    'Duplicates'.padEnd(widths.duplicates),
    'Finalized'.padEnd(widths.finalized)
  ].join(' | ');

  console.log('\n📊 Contract Seed Audit Results');
  console.log('='.repeat(header.length));
  console.log(header);
  console.log('-'.repeat(header.length));

  // Print rows
  for (const row of rows) {
    const formattedRow = [
      row.contractId.padEnd(widths.contractId),
      row.contractName.padEnd(widths.contractName),
      row.status.padEnd(widths.status),
      row.expected.padEnd(widths.expected),
      row.actual.padEnd(widths.actual),
      row.missing.padEnd(widths.missing),
      row.duplicates.padEnd(widths.duplicates),
      row.finalized.padEnd(widths.finalized)
    ].join(' | ');
    console.log(formattedRow);
  }

  // Print summary
  const totalIssues = results.filter(r => r.status === 'has_issues').length;
  const totalHealthy = results.filter(r => r.status === 'healthy').length;
  
  console.log('-'.repeat(header.length));
  console.log(`Summary: ${totalHealthy} healthy, ${totalIssues} with issues`);

  // Print detailed issues for contracts with problems
  const contractsWithIssues = results.filter(r => r.status === 'has_issues');
  if (contractsWithIssues.length > 0) {
    console.log('\n🔍 Detailed Issues:');
    for (const contract of contractsWithIssues) {
      console.log(`\nContract ${contract.contractId} (${contract.contractName}):`);
      if (contract.missing.length > 0) {
        console.log(`  Missing shifts (${contract.missing.length}): ${contract.missing.slice(0, 10).join(', ')}${contract.missing.length > 10 ? '...' : ''}`);
      }
      if (contract.duplicates.length > 0) {
        console.log(`  Duplicate shifts (${contract.duplicates.length}): ${contract.duplicates.slice(0, 10).join(', ')}${contract.duplicates.length > 10 ? '...' : ''}`);
      }
      if (contract.finalizedTouched > 0) {
        console.log(`  ⚠️  ${contract.finalizedTouched} finalized shifts would be affected by re-seeding`);
      }
    }

    console.log('\n💡 To fix issues:');
    console.log('   Run: PUT /api/contracts/:id (with seedShifts: true) to resync shifts');
    console.log('   This will add missing shifts and preserve finalized ones');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npm run audit:contracts -- --all');
    console.error('       npm run audit:contracts -- --id=<contract_id>');
    process.exit(1);
  }

  try {
    if (args.includes('--all')) {
      console.log('🔍 Auditing all contracts...');
      const results = await auditAllContracts();
      formatAuditTable(results);
    } else {
      const idArg = args.find(arg => arg.startsWith('--id='));
      if (!idArg) {
        console.error('Error: Must specify --all or --id=<contract_id>');
        process.exit(1);
      }

      const contractId = parseInt(idArg.split('=')[1]);
      if (isNaN(contractId)) {
        console.error('Error: Contract ID must be a number');
        process.exit(1);
      }

      console.log(`🔍 Auditing contract ${contractId}...`);
      const result = await auditContract(contractId);
      formatAuditTable([result]);
    }
  } catch (error) {
    console.error('❌ Audit failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}