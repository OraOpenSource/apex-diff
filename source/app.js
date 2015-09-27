/**
 * TODO other comments
 * Config
 *  Config file is located in the config folder
 *  Look at the config_sample.json and create config.json with your connections
 *
 */

// TODO mdsouza: debug mode, output each step
// TODO mdsouza: Put in parameter to handle sqlcl name (default to sql)


/**
 * Wrapper for console statement
 *
 */
function debug(){
  if (options.debug) {
    log.apply(console.log, arguments );
  }
}//debug

var
  //Requires
  fs = require('fs'),
  execSync = require('child_process').execSync,
  extend = require('util')._extend,
  //Console
  log = console.log,
  childProcess,
  //
  spoolFilename = __dirname + '/apex_diff_generate_json.sql',
  //arguments for this process (first 2 are node and app.js)
  args = process.argv.slice(2), // Array of arguments
  arguments = {
    connectionName : args[0],
    appId : args[1]
  },
  //SQL
  sql = {
    command : '%SQLCL% %CONNECTION% @%DIRECTORY%/%FILENAME% %PARAMS%',
    files : {
      path : __dirname,
      json : {
        fileName : 'f' + arguments.appId + '.json',
        data : ''
      },
      apexDiff : {
        fileName : 'apex-diff.sql',
        params : '%APP_ID% %SPOOL_FILENAME%'
      },
      generateJson : {
        fileName : 'apex_diff_generate_json.sql',
        params : '%APP_ID%'
      }
    }
  },



  timer = {
    start : new Date(),
    end : ''},
  // TODO mdsouza: document these as options
  options = {
    configFile : __dirname + '/../config/config.json',
    sqlcl : "sql", //Path to sqlcl
    debug : false,
    // TODO mdsouza: better name?
    rebuildFile : false // Rebuild the APEX json file
  }
;
// Look for config file
if (!fs.existsSync(options.configFile)) {
  console.log('Missing config file: ' + options.configFile);
  console.log('See TODO (doc link) for more info');
  process.exit(1);
}
else{
  // Load config file
  var configFileData = fs.readFileSync(options.configFile, 'utf8');
  configFileData = JSON.parse(configFileData);
  options = extend(options, configFileData);
  debug('options', options);
}

//General debug (can do here since value is set)
debug('sql: ', sql);
debug('arguments: ',  arguments);


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
  console.log('Invalid connection: ' + arguments.connectionName);
  console.log('Valid connections: ' + Object.keys(options.connections).toString());
  process.exit(1);
}

debug('Validations passed');

debug('Setting up sql.command');

// Determine if file should be rebuilt
if (options.rebuildFile || !fs.existsSync(sql.files.path + '/' + sql.files.generateJson.fileName)){
  // Need to run the main apex-diff script to regenerate the JSON file
  debug('Rebuilding generateJson file');
  sql.command = sql.command.replace('%FILENAME%', sql.files.apexDiff.fileName);
  sql.command = sql.command.replace('%PARAMS%', sql.files.apexDiff.params);
}
else{
  debug('Just running generateJson');
  sql.command = sql.command.replace('%FILENAME%', sql.files.generateJson.fileName);
  sql.command = sql.command.replace('%PARAMS%', sql.files.generateJson.params);
}

//Finish sql.command replacement
sql.command = sql.command.replace('%SQLCL%', options.sqlcl);
sql.command = sql.command.replace('%CONNECTION%', options.connections[arguments.connectionName]);
sql.command = sql.command.replace('%DIRECTORY%', __dirname);
sql.command = sql.command.replace('%APP_ID%', arguments.appId);
sql.command = sql.command.replace('%SPOOL_FILENAME%', sql.files.generateJson.fileName);
debug('sql.command: ' + sql.command);

debug('Running sql.command');
childProcess = execSync(sql.command,{ encoding: 'utf8' });
debug(childProcess);

debug('Reading .json file');
sql.files.json.data = fs.readFileSync(sql.files.json.fileName, 'utf8');
//Convert string to JSON
sql.files.json.data = JSON.parse(sql.files.json.data);
//Prettify
sql.files.json.data = (JSON.stringify(sql.files.json.data, null, 2));

debug('Writing pretty JSON to file');
fs.writeFileSync(sql.files.json.fileName, sql.files.json.data);

// END
debug('Time: ' + (new Date() - timer.start)/1000 + 's');

// TODO mdsouza:
process.exit(1);



// TODO mdsouza: build run file only if not exists or option
function prettyJSON(fileName){
  console.log('prettyJSON');
  fs.readFile(fileName, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }

    var
      jsonData = JSON.parse(data), //Convert string to JSON
      jsonText = (JSON.stringify(jsonData, null, 2)) //pretty JSON
    ;

    console.log('Writing update JSON file');
    fs.writeFile(fileName, jsonText, function(err) {
      if(err) {
        return console.log(err);
      }
    });
  });
}// prettyJSON




console.log('Calling sql command');
childProcess = exec(sql.command,
  function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    else{
      // TODO mdsouza: delete run_apex_json.sql
      prettyJSON('f' + apexAppId + '.json');

      // var filePath = "c:/book/discovery.docx" ;
      // TODO mdsouza: renable
      // console.log('deleting temp filename');
      // fs.unlinkSync(spoolFilename);
      // console.log(__dirname);
      // console.log(process.cwd());
    }

    // Wrap up
    timer.end = new Date();
    console.log('Total Time: ' + (timer.end - timer.start)/1000 + 's');
});
