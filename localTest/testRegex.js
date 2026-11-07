const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Helper: Load GAS files into Node global context ---
function loadGasFile(relativePath) {
  const fullPath = path.resolve(__dirname, '..', relativePath);
  const code = fs.readFileSync(fullPath, 'utf8').replace(/\bexport\s+/g, ''); // remove unecessary export keyword
  vm.runInThisContext(code);
}
loadGasFile('src/amountProcessor.js');
loadGasFile('src/strategies.js');

// --- TEST RUNNER HELPER ---
function runTest(testName, strategyFn, sampleBody) {
  console.log(`\n========================================`);
  console.log(`TEST: ${testName}`);
  console.log(`========================================`);

  const rawResult = strategyFn(sampleBody);
  
  // Format for clean table view
  console.table({
    "Success?": rawResult.isSuccess ? '✅ YES' : '❌ NO',
    "Account": rawResult.account,
    "Raw Amount": rawResult.amount,
    "Clean Amount": cleanAmountString(rawResult.amount),
    "Currency": extractCurrency(rawResult.amount),
    "Merchant": rawResult.merchant,
    "Type": rawResult.income_expense || 'Expense'
  });
}

// ========================================
// TEST CASES
// ========================================
runTest(
  'Trust Overseas Transaction',
  trustOverseasTransactionParsingStrategy,
  `0% FX fees! You've spent MYR 23.45 using Trust Link card at GRAB RIDES-EC SOME LOCATION on 1 Jan 2026 11:11SGT. Not you? Alert us via Trust App.`
);

runTest(
  'Trust Overseas Transaction Cancelled',
  trustOverseasTransactionCancelledParsingStrategy,
  `We've cancelled your purchase of MYR 23.45 at YOUR MERCHANT on 1 Jan 2026 11:11SGT with Trust Link card.`
);

runTest(
  'Citibank Standing Instruction',
  citibankStandingInstructionParsingStrategy,
  `We would like to inform you that the following Standing Instruction has been successful.
Account No.	:	XXXXXX1234
Amount	:	SGD 5678.00
Transaction Date	:	01/01/26`
);