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
  // Logger.log(sender);
  // Logger.log(message.getSubject())
  // Logger.log("Message Body:\n" + message.getPlainBody());

  if (sender.includes("unialerts@uobgroup.com") && subject.includes("Your transaction has been reversed")) 
    return uobReversalParsingStrategy;

  else if (sender.includes("unialerts@uobgroup.com")) 
    return uobParsingStrategy;

  else if (sender.includes("paylah.alert@dbs.com"))
    return dbsPaylahParsingStrategy;

  else if (sender.includes("alerts@citibank.com.sg") && subject.includes("Successful PayNow Transaction"))
    return citibankPaynowParsingStrategy;

  else if (sender.includes("alerts@citibank.com.sg"))
    return citibankParsingStrategy;

  else if (sender.includes("noreply@notify.ocbc.com")) {
    return ocbcParsingStrategy;
  }
  else if (sender.includes("ibanking.alert@dbs.com"))
    return dbsParsingStrategy;
  
  else if (sender.includes("from_us@trustbank.sg") && subject.includes("Overseas cash withdrawal successful"))
    return trustOverseasWithdrawalParsingStrategy;

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




/** DBS Paylah Transaction
 * Currently same format as dbs parser
 */
function dbsPaylahParsingStrategy(messageBody) {
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


/** Yay! Overseas transaction successful 😁
 * 0% FX fees! You've spent MYR 23.45 using Trust Link card at GRAB RIDES-EC SOME LOCATION on 1 Jan 2026 11:11SGT. Not you? Alert us via Trust App.
 */
function trustOverseasTransactionParsingStrategy(messageBody) {
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


/** Overseas transaction cancelled 💳
 * We've cancelled your purchase of MYR 23.45 at YOUR MERCHANT on 1 Jan 2026 11:11SGT with Trust Link card.
 */
function trustOverseasTransactionCancelledParsingStrategy(messageBody) {
  const amountMatch = messageBody.match(/cancelled your purchase of\s+([A-Z0-9,. ]*)\s+at/);
  const merchantMatch = messageBody.match(/at\s+(.*)\s+on /);
  const accountMatch = messageBody.match(/ with\s(.*)/);
  const isSuccess = !!(amountMatch && accountMatch && merchantMatch);  
  
  return {
    account: accountMatch ? accountMatch[1] : UNKNOWN_ACCOUNT,
    amount: amountMatch ? amountMatch[1] : UNKNOWN_AMOUNT,
    merchant: merchantMatch ? merchantMatch[1] : UNKNOWN_MERCHANT,
    isSuccess: isSuccess,
    income_expense: INCOME
  };
}