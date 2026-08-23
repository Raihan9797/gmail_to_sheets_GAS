const TARGET_TAB_NAME = "autoTransactions"
const SEARCH_QUERY = "label:0_AUTOMATIONS/TransactionQueue -label:0_AUTOMATIONS/Archive/Transactions"

/* use this if you need to rerun: basically only run those that have been successful
before you run, make sure to save a copy of the sheet to see if the final rows are the same as before.

const SEARCH_QUERY = "label:0_AUTOMATIONS/Archive/Transactions"

*/


const PROCESSED_LABEL_NAME = "0_AUTOMATIONS/Archive/Transactions";

function prodMain4() {
  const threads = searchByLabel(SEARCH_QUERY);
  let transactions = [];
  let errorTransactions = [];


  const processedLabel = generateProcessedLabelIfMissing(PROCESSED_LABEL_NAME);

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    let allMessagesInThreadProcessed = true;
    const messages = thread.getMessages();
    for (let j = 0; j < messages.length; j++) {
      const message = messages[j];

      const parsingStrategy = getParsingStrategy(message);

      if (parsingStrategy) {
        const parsedData = executeParsingStrategy(message, parsingStrategy);

        if (!parsedData.isSuccess) {
          errorTransactions.push(parsedData);
          transactions.push(parsedData)
          allMessagesInThreadProcessed = false; // if fail, do not mark as processed but still add to sheet

        } else {
          transactions.push(parsedData)

        }
      }
    }

    if (allMessagesInThreadProcessed) {
      thread.addLabel(processedLabel);
    }
  }
  writeBulkDataToSheet(transactions, TARGET_TAB_NAME, SHEET_SCHEMA)
  writeBulkDataToSheet(errorTransactions, ERROR_SHEET_NAME, ERROR_SHEET_SCHEMA)  
}
