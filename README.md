# Processing transactions in Gmail into rows in Google Sheets
- requires you to filter the emails that are transactions to be parsed
- add a label to them
- the code filters by the label and then parses them to the correct transaction 


### Offline local testing of new parsing strategies
- The test runner loads `strategies.js` and `amountProcessor.js` directly into Node's global execution context: code stays 100% vanilla Google Apps Script and is always ready for `clasp push`.
- Run in terminal
  ```bash
  node localTest/testRegex.js
  ```
- Or enable auto-run on save with watch mode:
  ```bash
  node --watch localTest/testRegex.js
  ```