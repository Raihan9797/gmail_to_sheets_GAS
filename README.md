# Processing transactions in Gmail into rows in Google Sheets
- requires you to filter the emails that are transactions to be parsed
- add a label to them
- the code filters by the label and then parses them to the correct transaction 


### doing offline local testing of new parsing strategies
- A quick method to test your parsing without having to use google apps script is to open a html file with a script to run your test examples. Make sure when you import the script, set it as `type=module`.
- Add your new method into `strategies.js` with the `export` keyword (You will need to remove this when you try to do `clasp push` to update your code in google apps script)
- you can then import your strategy into `testRegex.js`, with a sample to run and console.log the result
- you can then load the html file with VSCode Live Server plugin and open the console to see the result