/**
 * apex-diff
 * oraopensource.com
 * Project & license info: https://github.com/OraOpenSource/apex-diff
 */
var fs = require('fs');
var execSync = require('child_process').execSync;
var extend = require('util')._extend;
var path = require('path');

/**
 * Wrapper for console statement
 *
 */
function debug(){
  if (options.debug) {
    log.apply(console.log, arguments );
  }
}//debug

/**
 * Determines if a specific object should be deleted based on filter
 *
 * Returns true or false
 */
function filterObject(name){
  var lReturn = false;

  for(var i in options.filtersRegExp){
    if(options.filtersRegExp[i].test(name)){
      lReturn = true;
      break;
    }
  }//for

  return lReturn;
}//filterObject


/**
 * Logs time from start of app.js
 */
function logTime(){
  debug('Time:', (new Date() - timer.start)/1000 + 's');
}

// TODO mdsouza:
//http://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
// Array.prototype.unique = function() {
//     var a = this.concat();
//     for(var i=0; i<a.length; ++i) {
//         for(var j=i+1; j<a.length; ++j) {
//             if(a[i] === a[j])
//                 a.splice(j--, 1);
//         }
//     }
//
//     return a;
// };


// TODO mdsouza: update docs on filter groups
// TODO mdsouza: include some sample filter groups in config_sample.json
var
  //Console
  log = console.log,
  childProcess,
  //arguments for this process (first 2 are node and app.js)
  args = process.argv.slice(2), // Array of arguments
  arguments = {
    connectionName : args[0],
    appId : args[1]
  },
  //SQL
  sql = {
    command : '%SQLCL% %CONNECTION% @%FULL_PATH% %PARAMS%',
    files : {
      path : path.resolve(__dirname,'source'),
      json : {
        fileName : 'f' + arguments.appId + '.json',
        data : ''
      },
      apexDiff : {
        fileName : 'apex-diff.sql',
        params : '%APP_ID% %SPOOL_FILENAME%',
        fullPath : ''
      },
      generateJson : {
        fileName : 'temp.sql',
        params : '%APP_ID%',
        fullPath : ''
      }
    }
  },
  timer = {
    start : new Date()
  },
  options = {
    configFile : path.resolve(__dirname , 'config/config.json'),
    sqlcl : "sql", //Path to sqlcl
    debug : false,
    rebuildTempFile : true, // Rebuild the APEX json file
    filters : [], // array of filters
    filterGroups : {},
    filtersRegExp : [], // array of filters to Regular Expressions
    connectionDetails : "",
    // TODO mdsouza: document this for developers
    dev : {
      runSql : true,
      saveJson : true
    }
  },
  temp = ''
;

//Additional settings
sql.files.apexDiff.fullPath = path.resolve(sql.files.path, sql.files.apexDiff.fileName);
sql.files.generateJson.fullPath = path.resolve(sql.files.path, sql.files.generateJson.fileName);

// Look for config file
if (!fs.existsSync(options.configFile)) {
  console.log('Missing config file:', options.configFile);
  console.log('See TODO (doc link) for more info');
  process.exit(1);
}


// Load config file
var configFileData = fs.readFileSync(options.configFile, 'utf8');
options = extend(options, JSON.parse(configFileData));

debug('options extended by confiFile:\n', options, '\n');

debug('\n* Initial Validations*');
if (!arguments.appId) {
  console.log('Missing appId');
  process.exit(1);
}
else if (!options.connections[arguments.connectionName]) {
  console.log('Invalid connection:', arguments.connectionName);
  console.log('Valid connections:', Object.keys(options.connections).toString());
  process.exit(1);
}


//Parse connection information
var curConn = options.connections[arguments.connectionName];
debug('\ncurConn:', curConn);

if (curConn.constructor !== Object){
  debug('\ncurConn is string');
  //Connection info is a string (just connection details)
  options.connectionDetails = curConn;
}
else {
  debug('\ncurConn is JSON, parsing');
  //Connection info is a JSON object
  curConn = extend(
    {
      connectionDetails : "",
      filters : ""
    },
    curConn);

  //Current connection is
  options.connectionDetails = curConn.connectionDetails;

  //Only add filters if exists
  if (curConn.filters) {
    options.filters = options.filters.concat(curConn.filters);
  }

  // Add filters from filterGroups to curConn
  if (curConn.filterGroups){
    for (var i in curConn.filterGroups){

      temp = options.filterGroups[curConn.filterGroups[i]];
      if (temp){
        options.filters = options.filters.concat(temp);
      }

    }//for
  }// filter groups defined
}//connection info is JSON object

//Make filters unique
// TODO mdsouza: Make filters unique

// Convert filters to RegExp objects
debug('\nConverting filters to RegExp\n')
for (var i in options.filters) {
  debug('Filter RegExp:', options.filters[i]);
  options.filtersRegExp[options.filtersRegExp.length] = new RegExp(options.filters[i], 'i');
}

debug('\noptions', options);


//General debug (can do here since value is set)
debug('\nsql:', sql);
debug('\narguments:',  arguments);


// VALIDATIONS
debug('\n* Validations *');

// Check that argument has two parameters (connection and appid)
if (!options.connectionDetails){
  console.log('Missing connection details');
  process.exit(1);
}

debug('\nValidations passed');
logTime();


// // TODO mdsouza:
// process.exit(1);


debug('Setting up sql.command');

// Determine if file should be rebuilt
if (options.rebuildTempFile || !fs.existsSync(sql.files.generateJson.fullPath)){
  // Need to run the main apex-diff script to regenerate the JSON file
  debug('Rebuilding generateJson file');
  sql.command = sql.command.replace('%FULL_PATH%', sql.files.apexDiff.fullPath);
  sql.command = sql.command.replace('%PARAMS%', sql.files.apexDiff.params);
}
else{
  debug('Just running generateJson');
  sql.command = sql.command.replace('%FULL_PATH%', sql.files.generateJson.fullPath);
  sql.command = sql.command.replace('%PARAMS%', sql.files.generateJson.params);
}

//Finish sql.command replacement
sql.command = sql.command.replace('%SQLCL%', options.sqlcl);
sql.command = sql.command.replace('%CONNECTION%', options.connectionDetails);
sql.command = sql.command.replace('%APP_ID%', arguments.appId);
sql.command = sql.command.replace('%SPOOL_FILENAME%', sql.files.generateJson.fullPath);
debug('sql.command:', sql.command);


if (options.dev.runSql){
  debug('Running sql.command');
  childProcess = execSync(sql.command,{ encoding: 'utf8' });
  debug(childProcess);
  logTime();
}

debug('\nReading .json file');
sql.files.json.data = fs.readFileSync(sql.files.json.fileName, 'utf8');
//Convert string to JSON
debug('\nParsing .json File');
sql.files.json.data = JSON.parse(sql.files.json.data);
debug('\nDone parsing .json file');
logTime();


debug('\nFiltering JSON');
for (var apexView in sql.files.json.data.items[0]){
  // This loop is the list of APEX views.
  // If delete slows things down can look at setting to undefined
  // http://stackoverflow.com/questions/208105/how-to-remove-a-property-from-a-javascript-object
  //Check to see about removing entire APEX view itself.
  if (filterObject(apexView)){
    debug('Deleting:', apexView);
    delete sql.files.json.data.items[0][apexView];
  }
  else{
    // view not filtered, now check array of objects
    for (var apexViewAttrPos in sql.files.json.data.items[0][apexView]){
      //Loop over each element/attribte
      for (var apexViewAttrName in sql.files.json.data.items[0][apexView][apexViewAttrPos]){
        if (filterObject(apexView + '.' + apexViewAttrName)){
          debug('Deleting:', apexView + '.' + apexViewAttrName);
          delete sql.files.json.data.items[0][apexView][apexViewAttrPos][apexViewAttrName];
        }
      }//j
    }//i
  }//else
} // For (remove elements)
logTime();

//Prettify
sql.files.json.data = (JSON.stringify(sql.files.json.data, null, 2));
logTime();

if(options.dev.saveJson){
  debug('Writing pretty JSON to file');
  fs.writeFileSync(sql.files.json.fileName, sql.files.json.data);
}

// END
logTime();
