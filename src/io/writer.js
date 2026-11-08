const SHEET_SCHEMA = ["id", "date", "sender", "subject", "account", "currency", "amount", "merchant", "income_expense"];
const ERROR_SHEET_NAME = "Error_Logs"
const ERROR_SHEET_SCHEMA = ["notes", "id", "body"];
const DATE_COLUMN_NUMBER = SHEET_SCHEMA.indexOf("date") + 1; // used for sorting by date, google sheets api is 1 indexed


/**
 * Writes an array of transaction objects using a strict schema checklist.
 * @param {Array<Object>} bulkData - Array of transaction objects.
 * @param {string} sheetName - The name of the tab.
 */
function writeBulkDataToSheet(bulkData, sheetName, schema) {
  if (!bulkData || bulkData.length === 0) return;

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("Error: Tab named '" + sheetName + "' not found.");
    return;
  }

  // SCHEMA MAPPER: Guarantees every row aligns perfectly with schema
  const rowsToWrite = bulkData.map(tx => {
    return schema.map(key => {
      // If the field exists, use it. If it's missing, leave a blank cell safely.
      return tx.hasOwnProperty(key) && tx[key] !== undefined ? tx[key] : "";
    });
  });

  // Calculate grid boundaries based on the schema size
  const startRow = sheet.getLastRow() + 1;
  const startColumn = 1;
  const numRows = rowsToWrite.length;
  const numColumns = schema.length;

  // Write to Google Sheet
  sheet.getRange(startRow, startColumn, numRows, numColumns).setValues(rowsToWrite);
  Logger.log(`Successfully batch-wrote ${numRows} rows to '${sheetName}' using provided schema.`);

  // REARRANGE CHRONOLOGICALLY: Sort by Date✨
  if (sheetName === TARGET_TAB_NAME && sheet.getLastRow() > 2) {
    // Sort rows from row 2 (skipping header) to lastRow across all columns
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
         .sort({ column: DATE_COLUMN_NUMBER, ascending: true });
    Logger.log("Sheet sorted chronologically by date.");
  }
}



















