/** 
 * Searches gmail for threads based on a searchQuery
 * returns a list of threads
 * 
 * use searchQuery over getUserLabelByName as we can add more parts like is:unread
 */
function searchByLabel(searchQuery, searchAmount) {
  // GmailApp.search(query, startRow, maxResults) ie max 10 results
  if (searchAmount)
    var threads = GmailApp.search(searchQuery, 0, searchAmount);
  else 
    threads = GmailApp.search(searchQuery);
  
  if (threads.length === 0) {
    Logger.log("No threads with that label.");
    return threads;
  }
  Logger.log("Found " + threads.length + " conversation threads.");
  return threads.reverse();
}


const query_2a = "in:inbox from:(paylah.alert@dbs.com) subject:(Transaction Alerts) amount "
// note the Alert vs Alerts
const query_2b = "in:inbox from:(paylah.alert@dbs.com) subject:(Transaction Alerts) amount "

/** 
 * Checks a query to see if you get the desired threads.
 * Use this over gmail search as it is too fuzzy.
 * @param {*} query a gmail search query
 */
function checkFilterQueryResults(query) {
  Logger.log(query)
  var threads = GmailApp.search(query)
  var messages = threads.flat()

  Logger.log("#num threads: " + threads.length);
  Logger.log("#num messages: " + messages.length);
}

function main() {
  checkFilterQueryResults(query_2b)
}

