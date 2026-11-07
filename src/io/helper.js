function generateProcessedLabelIfMissing(label) {
  let foundLabel = GmailApp.getUserLabelByName(label);
  if (!foundLabel) {
    foundLabel = GmailApp.createLabel(label);
    Logger.log("Created missing Gmail label: " + PROCESSED_LABEL_NAME);
    return foundLabel;

  } else {
    return foundLabel;
  }

}
