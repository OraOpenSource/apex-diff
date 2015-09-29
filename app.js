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
 * Logs time from start of app.js
 */
function logTime(){
  debug('Time:', (new Date() - timer.start)/1000 + 's');
}

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
    rebuildTempFile : false // Rebuild the APEX json file
  }
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
else{
  // Load config file
  var configFileData = fs.readFileSync(options.configFile, 'utf8');
  options = extend(options, JSON.parse(configFileData));
  debug('options', options);
}

//General debug (can do here since value is set)
debug('sql:', sql);
debug('arguments:',  arguments);


// VALIDATIONS
// Check that argument has two parameters (connection and appid)
if (!arguments.connectionName){
  console.log('Missing connection string');
  process.exit(1);
}
else if (!arguments.appId) {
  console.log('Missing appId');
  process.exit(1);
}
else if (!options.connections[arguments.connectionName]) {
  console.log('Invalid connection:', arguments.connectionName);
  console.log('Valid connections:', Object.keys(options.connections).toString());
  process.exit(1);
}

debug('Validations passed');
logTime();


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
sql.command = sql.command.replace('%CONNECTION%', options.connections[arguments.connectionName]);
sql.command = sql.command.replace('%APP_ID%', arguments.appId);
sql.command = sql.command.replace('%SPOOL_FILENAME%', sql.files.generateJson.fullPath);
debug('sql.command:', sql.command);

debug('Running sql.command');
childProcess = execSync(sql.command,{ encoding: 'utf8' });
debug(childProcess);
logTime();

debug('Reading .json file');
sql.files.json.data = fs.readFileSync(sql.files.json.fileName, 'utf8');
//Convert string to JSON
sql.files.json.data = JSON.parse(sql.files.json.data);
//Prettify
sql.files.json.data = (JSON.stringify(sql.files.json.data, null, 2));
logTime();

debug('Writing pretty JSON to file');
fs.writeFileSync(sql.files.json.fileName, sql.files.json.data);

// END
logTime();
