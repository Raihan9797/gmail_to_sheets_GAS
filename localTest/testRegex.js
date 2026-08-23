/** YOU WILL NEED TO EXPORT THE METHODS IN STRATEGIES.JS
 * and then you can import them here
 * 
 * When doing `clasp push` to update your code in google apps script, you will have to remove the `export` keyword again
 * 
 */
import { trustOverseasTransactionParsingStrategy, trustOverseasTransactionCancelledParsingStrategy, citibankStandingInstructionParsingStrategy } from '../strategies.js'

// ####### TRUST OVERSEAS TRANSACTION #########
const trust_overseas_txn_str = `
0% FX fees! You've spent MYR 23.45 using Trust Link card at GRAB RIDES-EC SOME LOCATION on 1 Jan 2026 11:11SGT. Not you? Alert us via Trust App.
`;

// const result = uobParsingStrategy(trust_overseas_txn_str);
const result = trustOverseasTransactionParsingStrategy(trust_overseas_txn_str);
console.log(result)

// ####### TRUST OVERSEAS TRANSACTION CANCELLATION #########
const trust_cancelled_overseas_txn_str = `
We've cancelled your purchase of MYR 23.45 at YOUR MERCHANT on 1 Jan 2026 11:11SGT with Trust Link card.
`
const result2 = trustOverseasTransactionCancelledParsingStrategy(trust_cancelled_overseas_txn_str);
console.log(result2)


// ####### CITIBANK STANDING INSTRUCTIONS #########
const citibank_standing_instr = `
We would like to inform you that the following Standing Instruction has been successful.
Account No.	:	XXXXXX1234
Amount	:	SGD 5678.00
Transaction Date	:	01/01/26
`;
const citibank_standing_instr_result = citibankStandingInstructionParsingStrategy(citibank_standing_instr);
console.log(citibank_standing_instr_result)