// TODO mdsouza: comments

// TODO mdsouza: debug mode, output each step
// TODO mdsouza: Put in parameter to handle sqlcl name (default to sql)

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

var
  fs = require('fs'),
  exec = require('child_process').exec,
  child,
  sqlConnnection = 'giffy/giffy@localhost:11521/xe', // TODO mdsouza: parameter
  apexAppId = '113' // TODO mdsouza: parameter
  sqlCommand = 'sqlcl %SQL_CONNECTION% @%DIRECTORY%/apex-diff %APP_ID% %SPOOL_FILENAME%'
  spoolFilename = __dirname + '/../temp/delete_me.sql'
  ;

sqlCommand = sqlCommand.replace('%SQL_CONNECTION%', sqlConnnection);
sqlCommand = sqlCommand.replace('%APP_ID%', apexAppId);
sqlCommand = sqlCommand.replace('%DIRECTORY%', __dirname);
sqlCommand = sqlCommand.replace('%SPOOL_FILENAME%', spoolFilename);

console.log('sqlCommand:', sqlCommand);

console.log('Calling sql command');
child = exec(sqlCommand,
  function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    else{
      // TODO mdsouza: delete run_apex_json.sql
      prettyJSON('f' + apexAppId + '.json');

      // var filePath = "c:/book/discovery.docx" ;
      console.log('deleting temp filename');
      fs.unlinkSync(spoolFilename);
      // console.log(__dirname);
      // console.log(process.cwd());
    }
});
