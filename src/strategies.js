const UNKNOWN_ACCOUNT = "UnknownAccount"
const UNKNOWN_AMOUNT = "UnknownAmount"
const UNKNOWN_MERCHANT = "UnknownMerchant"
const NO_MERCHANT_PROVIDED = "NoMerchantProvided"
const INCOME = "Income"
const EXPENSE = "Expense"

/**
 * ################ GET THE STRATEGY ##################
 * 
 */

function getParsingStrategy(message) {
  const sender = message.getFrom().toLowerCase();
  const subject = message.getSubject();
  const messageBody = message.getPlainBody();
  // Logger.log(sender);
  // Logger.log(message.getSubject())
  // Logger.log("Message Body:\n" + message.getPlainBody());

  // ### CITIBANK ###
  if (sender.includes("alerts@citibank.com.sg") && subject.includes("Successful PayNow Transaction"))
    return citibankPaynowParsingStrategy;
  else if (sender.includes("alerts@citibank.com.sg") && subject.includes("Standing Instruction Debited"))
    return citibankStandingInstructionParsingStrategy;
  else if (sender.includes("alerts@citibank.com.sg"))
    return citibankParsingStrategy;

  // ### DBS ###
  else if (sender.includes("ibanking.alert@dbs.com") && subject.includes("received a transfer"))
    return dbsReceivedTransferParsingStrategy;
  else if (sender.includes("ibanking.alert@dbs.com"))
    return dbsParsingStrategy;

  // ### PAYLAH ###
  else if (sender.includes("paylah.alert@dbs.com") && messageBody.includes("verseas transaction"))
    return paylahOverseasParsingStrategy;
  else if (sender.includes("paylah.alert@dbs.com") && messageBody.includes("refund transaction") && messageBody.includes("Amount"))
    return paylahRefundParsingStrategy;
  else if (sender.includes("paylah.alert@dbs.com") && messageBody.includes("Amount"))
    return paylahParsingStrategy;

  // ### OCBC ###
  else if (sender.includes("noreply@notify.ocbc.com")) {
    return ocbcParsingStrategy;
  }
  
  // ### TRUST ###
  else if (sender.includes("from_us@trustbank.sg") && subject.includes("Overseas cash withdrawal successful"))
    return trustOverseasWithdrawalParsingStrategy;
  else if (sender.includes("from_us@trustbank.sg") && subject.includes("Overseas transaction successful"))
    return trustOverseasTransactionParsingStrategy;
  else if (sender.includes("from_us@trustbank.sg") && subject.includes("Transaction successful"))
    return trustLocalTransactionParsingStrategy;
  else if (sender.includes("from_us@trustbank.sg") && subject.includes("ransaction cancelled"))
    return trustOverseasTransactionCancelledParsingStrategy;

  // ### UOB ###
  if (sender.includes("unialerts@uobgroup.com") && subject.includes("Your transaction has been reversed")) 
    return uobReversalParsingStrategy;
  else if (sender.includes("unialerts@uobgroup.com")) 
    return uobParsingStrategy;

  else {
    Logger.log("######## Unknown sender ##########");
    Logger.log(sender);
    Logger.log(message.getSubject())
    Logger.log("Message Body:\n" + message.getPlainBody());
    return null;
  }

}


/** Decorator / adapter pattern
 * This has all the functionality that all parsers need
 * 
 */
function executeParsingStrategy(message, strategyFn) {
  const body = message.getPlainBody();
  const specificData = strategyFn(body);
  if (!specificData.isSuccess) {
    console.error(`Parsing failed for ${message.getId()}`)
  }

// Intercept and sanitize the dirty data here!
  const standardizedAmount = cleanAmountString(specificData.amount);
  const currency = extractCurrency(specificData.amount);

  return {
    date: message.getDate(),
    sender: message.getFrom(),
    subject: message.getSubject(),
    body: body,
    income_expense: EXPENSE, // default to expense
    id : message.getId(),
    ...specificData,

    // override initial amount value
    amount: standardizedAmount,
    currency: currency
  }
}




/**
 * ################ STRATEGIES ##################
 * 
 * 
 */

/** Citibank Card and Payment Transaction
 * 
 * Needs to be case insensitive: there is a slight difference between card transaction and account transactions
 * Some are capitalised some are not hence need /i
 * 
 * Also need to be able to get the card number if its 0123 -> 0123 NOT 123!
 * 
  We would like to inform you that there is a charge made on your Citi Cash Back+ Card:

  Account Number           : XXXX-XXXX-XXXX-0123
  Transaction date         : 20/03/23
  Transaction time         : 09:05:07
  Transaction amount       : SGD1234.56
  Transaction  details     : MERCHANT               Singapore     SGP
 * 
 */
function citibankParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/Transaction\s+amount\s*:\s*(.*)\b/i);
  const merchantMatch = messageBody.match(/Transaction\s+details\s*:\s*(.*)\b/i);
  const accountMatch = messageBody.match(/Account\s+number\s*:\s*(.*)\b/i);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  return {
    account: accountMatch ? cleanCitiAccountValue(accountMatch[1]) : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
  }
}

/** Cleans up Citibank account names as it has many Xs and (-). helps to shorten the data.
 * 
 * @param {*} account 
 * @returns account with Xs and dashes (-) removed
 */
function cleanCitiAccountValue(account) {
  return account.replace(/[X-]/g, "")
}


/** Citibank PayNow Transaction
 * * Sample: "We refer to your PayNow transaction of SGD 1.00 from A/C ending 1234 to ABCXX DX XUX EFGXX at 13:49 on 08/06/2026."
 */
function citibankPaynowParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/transaction of\s+([a-zA-Z]+\s?[0-9,.]*)/);
  const accountMatch = messageBody.match(/(A\/C ending\s+\d{4})/);
  const merchantMatch = messageBody.match(/from.*to\s+(.*?)\s+at\s+\d{2}:/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1].trim() : UNKNOWN_MERCHANT,
    isSuccess: isSuccess
  };
}

/** Citibank Card and Payment Transaction
 * We would like to inform you that the following Standing Instruction has been successful.
 * Account No.	:	XXXXXX1234
 * Amount	:	SGD 5678.00
 * Transaction Date	:	01/01/26
 */
function citibankStandingInstructionParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/Amount\s*:\s*(.*)\b/i);
  const accountMatch = messageBody.match(/Account No.\s:\s(.*)\b/i);
  const isSuccess = !!(amountMatch && accountMatch);  
  return {
    account: accountMatch ? cleanCitiAccountValue(accountMatch[1]) : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: NO_MERCHANT_PROVIDED,
    isSuccess: isSuccess,
  }
}



/** DBS TRANSACTION
 * 
 */
function dbsParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/Amount\s*:\s*(.*)/);
  const accountMatch = messageBody.match(/From\s*:\s*(.*)/);  
  const merchantMatch = messageBody.match(/To\s*:\s*(.*)/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? cleanDBSString(accountMatch[1]) : UNKNOWN_ACCOUNT,
    amount: amountMatch ? cleanDBSString(amountMatch[1]): UNKNOWN_AMOUNT,
    merchant: merchantMatch ? cleanDBSString(merchantMatch[1]) : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
  };
}


/** DBS Received Transfer
 * You have received SGD 123.45 via PayNow on 01 Jan 2026 11:11 SGT.
 * From: MARSHALL MATHERS
 * To: Your DBS/ POSB account ending 1234
 */
function dbsReceivedTransferParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/received\s*(.*)\svia/);
  const accountMatch = messageBody.match(/From\s*:\s*(.*)/);  
  const merchantMatch = messageBody.match(/To\s*:\s*(.*)/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? cleanDBSString(accountMatch[1]) : UNKNOWN_ACCOUNT,
    amount: amountMatch ? cleanDBSString(amountMatch[1]): UNKNOWN_AMOUNT,
    merchant: merchantMatch ? cleanDBSString(merchantMatch[1]) : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: INCOME
  };
}

/** Replaces S with SGD as nets has some edge case eg below
Amount: S$2.50
 */
function cleanDbsNETSCurrencyString(stringValue) {
  if (stringValue.trim().startsWith("*"))
    return stringValue.trim().slice(1);
  else
    return stringValue;

}
/** Removes the * at the start of dbs values
 * This happens because the keys are bolded eg. *Amount: *sgd123.45
 * Resulting in getting the * at the start
 */
function cleanDBSString(stringValue) {
  if (stringValue.trim().startsWith("*"))
    return stringValue.trim().slice(1);
  else
    return stringValue;
}




/** Paylah Transaction
 * Currently same format as dbs parser
 */
function paylahParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/Amount\s*:\s*(.*)/);
  const accountMatch = messageBody.match(/From\s*:\s*(.*)/);  
  const merchantMatch = messageBody.match(/To\s*:\s*(.*)/);  
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1]: UNKNOWN_MERCHANT,
    isSuccess: isSuccess
  };
}

/** Paylah Refund Transaction
 * We refer to your PayLah! refund transaction below and are pleased to confirm that the transaction was completed.
 * Date & Time: 01 Jan20:42 (SGT)
 * Amount: SGD 0.30
 * From: BCRS LTD
 * To: PayLah! Wallet (Mobile ending 1234)
 */
function paylahRefundParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/Amount\s*:\s*(.*)/);
  const accountMatch = messageBody.match(/From\s*:\s*(.*)/);  
  const merchantMatch = messageBody.match(/To\s*:\s*(.*)/);  
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1]: UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: INCOME
  };
}


/** Paylah Overseas Transaction
 * Similar to paylah, but we have to use SGD Equivalent value as amount 
 * 
  We refer to your PayLah! Overseas transaction dated 10 Jan SGT. We are 
  pleased to confirm that the transaction was completed. 
  Point-of-Sale Date & Time: 10 Jan 11:11 
  SG Date & Time: 10 Jan 11:11 (SGT) 
  Amount Paid: IDR30000.00 
  SGD Equivalent: SGD2.19 
  From: PayLah! Wallet (Mobile ending 1111) 
  To: My Merchant Roaster - HO 
 * 
 */
function paylahOverseasParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/SGD Equivalent\s*:\s*(.*)/);
  const accountMatch = messageBody.match(/From\s*:\s*(.*)/);  
  const merchantMatch = messageBody.match(/To\s*:\s*(.*)/);  
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  

  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1]: UNKNOWN_MERCHANT,
    isSuccess: isSuccess
  };
}



/** OCBC Card Transaction
 * 
 */
function ocbcParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/([A-Z]{3}[\d,.]+)/);
  const accountMatch = messageBody.match(/\(-(\d+)\)/);
  const merchantMatch = messageBody.match(/\bcard\b.*?\bat\b\s+([^.]+)/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
  };
}


/** Trust Local Transaction with card
 * You've spent SGD 11.11 at Grab* B-123456 Singapore SG on 1 Jan  2026 11:11SGT with Trust Link card.
 * NOTE: this assumes a card was used to match the account. 
 */
function trustLocalTransactionParsingStrategy(messageBody) {
  messageBody = replaceNewLineWithSpaces(messageBody)

  const amountMatch = messageBody.match(/spent\s+([A-Z0-9,. ]*)\s+at/);
  const merchantMatch = messageBody.match(/at\s+(.*)\s+on /);
  const accountMatch = messageBody.match(/with\s(.*) card/i);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: EXPENSE
  };
}


/** TRUST OVERSEAS WITHDRAWAL
 * 
 */
function trustOverseasWithdrawalParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/withdrew\s+(.*)\s+with/);
  const isSuccess = (amountMatch)
  return {
    account: "Trust Bank Account",
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: "Overseas ATM Withdrawal",
    isSuccess: isSuccess,
  };
}


/** Yay! Overseas transaction successful 😁
 * 0% FX fees! You've spent MYR 23.45 using Trust Link card at GRAB RIDES-EC SOME LOCATION on 1 Jan 2026 11:11SGT. Not you? Alert us via Trust App.
 */
function trustOverseasTransactionParsingStrategy(messageBody) {
  messageBody = replaceNewLineWithSpaces(messageBody)

  const amountMatch = messageBody.match(/spent\s+([A-Z0-9,. ]*)\s+using/);
  const merchantMatch = messageBody.match(/at\s+(.*)\s+on /);
  const accountMatch = messageBody.match(/\bUsing\s(.*)\sat /i);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: EXPENSE
  };
}

/** Replaces new lines in a text with whitespace. 
 * This prevents text splitting breaking regex for trust transactions
 * 
 * @param {*} text text with one or more new lines
 */
function replaceNewLineWithSpaces(text) {
   return text.replace(/\n/g, " ");
}


/** Trust Overseas transaction cancelled 💳
 * We've cancelled your purchase of MYR 23.45 at YOUR MERCHANT on 1 Jan 2026 11:11SGT with Trust Link card.
 */
function trustOverseasTransactionCancelledParsingStrategy(messageBody) {
  messageBody = replaceNewLineWithSpaces(messageBody)
  const amountMatch = messageBody.match(/cancelled your purchase of\s+([A-Z0-9,. ]*)\s+at/);
  const merchantMatch = messageBody.match(/at\s+(.*)\s+on /);
  const accountMatch = messageBody.match(/ with ([^.]*)[.]/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: INCOME
  };
}




/** UOB Reversal 
 * A transaction of 1.00 SGD made with your UOB card ending 1234 on 14 Jun 26, 1:01PM at My* Fav Merchant has been reversed.
 */
function uobReversalParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/transaction of\s+([A-Z0-9,. ]*)\s+made/);
  const merchantMatch = messageBody.match(/at\s+(.*)\s+has been/);
  const accountMatch = messageBody.match(/\bCard ending\s+(\d{4})/i);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: INCOME
  };
}
/** UOB Card Transaction
 * 
 */
function uobParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/transaction of\s(\w+\s?[0-9,.]*)\s+was made/);
  const merchantMatch = messageBody.match(/at\s+(.*)[.]\s*If unauthorised/);
  const accountMatch = messageBody.match(/\bCard ending\s+(\d{4})/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess
  };
}