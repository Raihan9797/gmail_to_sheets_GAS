/** Searches gmail for threads based on a searchQuery
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

