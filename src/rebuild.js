const REBUILD_SEARCH_QUERY = "(label:0_AUTOMATIONS/Archive/Transactions OR label:0_AUTOMATIONS/TransactionQueue) -label:0_AUTOMATIONS/_reprocessed";
const TEMP_PROGRESS_LABEL = "0_AUTOMATIONS/_reprocessed";
const REBUILD_BATCH_SIZE = 50; // batch of 40 took max 31s

function rebuildAllTransactions() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(TARGET_TAB_NAME);

  // 1. Ensure header row exists if sheet was completely wiped
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_SCHEMA);
  }

  // 2. Fetch up to 40 unprocessed threads
  const threads = GmailApp.search(REBUILD_SEARCH_QUERY, 0, REBUILD_BATCH_SIZE);

  if (threads.length === 0) {
    Logger.log("ALL DONE! No more threads left to process.");
    
    // Sort transactions chronologically by Date (Column 2)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
           .sort({ column: 2, ascending: true });
      Logger.log("Sorted all transactions chronologically.");
    }

    // Clean up temporary label from Gmail
    const tempLabel = GmailApp.getUserLabelByName(TEMP_PROGRESS_LABEL);
    if (tempLabel) {
      tempLabel.deleteLabel();
      Logger.log("Deleted temporary progress label.");
    }

    // Remove any leftover triggers
    deleteRebuildTriggers();
    return;
  }

  Logger.log(`Processing batch of ${threads.length} threads...`);

  const tempLabel = generateProcessedLabelIfMissing(TEMP_PROGRESS_LABEL);
  const archiveLabel = generateProcessedLabelIfMissing(PROCESSED_LABEL_NAME);

  let transactions = [];
  let errorTransactions = [];

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
          allMessagesInThreadProcessed = false;
        } else {
          transactions.push(parsedData);
        }
      }
    }

    // Mark as checked in this rebuild so it won't be queried again
    thread.addLabel(tempLabel);

    // If all succeeded, also ensure it has the archive label
    if (allMessagesInThreadProcessed) {
      thread.addLabel(archiveLabel);
    }
  }

  // 3. Immediately flush this batch to the sheet
  writeBulkDataToSheet(transactions, TARGET_TAB_NAME, SHEET_SCHEMA);
  writeBulkDataToSheet(errorTransactions, ERROR_SHEET_NAME, ERROR_SHEET_SCHEMA);

  Logger.log(`Batch complete. Written: ${transactions.length} txns, ${errorTransactions.length} errors.`);

  // 4. Automatically schedule the next batch in 1 minute
  scheduleNextRebuildBatch();
}

function scheduleNextRebuildBatch() {
  deleteRebuildTriggers();
  ScriptApp.newTrigger("rebuildAllTransactions")
    .timeBased()
    .after(60 * 1000) // 1 minute
    .create();
  Logger.log("Next batch scheduled to run in 1 minute...");
}

function deleteRebuildTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "rebuildAllTransactions") {
      ScriptApp.deleteTrigger(trigger);
    }
  }
}