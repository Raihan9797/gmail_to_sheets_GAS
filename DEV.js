const TEST_TARGET_TAB_NAME = "txn_test_sheet"
const TEST_SEARCH_QUERY = "label:0_AUTOMATIONS/txn_test"

function main3() {
  const threads = searchByLabel(TEST_SEARCH_QUERY, 30);
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
          transactions.push(parsedData);
          errorTransactions.push(parsedData);
          allMessagesInThreadProcessed = false; // if fail, do not mark as processed but still add to sheet
        } else {
          transactions.push(parsedData)

        }
      }
    }
    // no need to add the processed label in DEV!
    /*
    if (allMessagesInThreadProcessed) {
      thread.addLabel(processedLabel);
    }
    */
  }
  writeBulkDataToSheet(transactions, TEST_TARGET_TAB_NAME, SHEET_SCHEMA)
  writeBulkDataToSheet(errorTransactions, ERROR_SHEET_NAME, ERROR_SHEET_SCHEMA)
  
}












