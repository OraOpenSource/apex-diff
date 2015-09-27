# APEX Diff
The purpose of this project is to create a export of an APEX application in JSON format. Having the application export in JSON format will allow for easy diffs on different versions of an application

_*This project is still in active development.*_

# Prequistes
This projects requires that [SQLcl](http://www.oracle.com/technetwork/developer-tools/sql-developer/downloads/index.html) (_Sep 23, 2015 or above_) is installed. It is used for its ability to quickly output queries in JSON format and cursor support.

Mac users can find additional information on how to install and configre SQLcl [here](http://www.talkapex.com/2015/04/installing-sqlcl.html).

# Running
They're two ways to create a JSON output of an APEX appliaction. SQLcl can be used to call the `apex-diff.sql` file or node.js can be used. It is recommended that you use the node.js wrapper as it handles some additional tasks (such as prettifying the JSON file) behind the scene.

_Note: This project may eventually be listed on npm for easy install._

## Node.js App
A [Node.js](https://nodejs.org) application has been included with this project. It is recommended to create the JSON file using node.js.

### Config
Create a new (or copy `config_sample.json`) config file in the `config` folder called `config.json`.

*`debug`*: optional, boolean, default `false`. If `true` will output each step of the process.

`rebuildTempFile` : optional, boolean, default `false`. If `true`, the temp sql file will be re-generated. Unless upgrdaing APEX, it is not recommended to set this to `true` as it takes additional time to generate the temp sql file.

`sqlcl` : optional, string, default `sql`. Command name (or full path to) SQLcl file.

`connections` : required, JSON object. Name, vaule pair for each database connection.

Example:
```json
{
  "sqlcl" : "sqlcl",
  "connections" : {
    "dev" : "giffy/giffy@localhost:11521/xe",
    "prod" : "oos/oos@prod.oraopensource.com:1521/xe"
  }
}
```

### Run
The Node.js application requires two parameters:

`connection name`: This is the name that is found in the `connections` object in `config.json`.

`app_id`: Application ID to generate the JSON for.

Using the example configuration file above, the following example shows how to call the application:

```bash
# Calling from root project folder
node source/app.js dev 113
```

This will generate a prettified JSON file: `f113.json`.

## SQLcl
To run the application directly using SQLcl:

```sql
<sqlcl command> <connection string> @<path to apex-diff.sql> <app_id> <temp spool filename>
```

Example: _note: I renamed the sql file to sqlcl._
```sql
sqlcl giffy/giffy@localhost:11521/xe @source/apex-diff 113 temp.sql
```

This will create a new file, `temp.sql` and `f113.json`. `temp.sql` can be deleted and `f113.json` is the unprettified JSON output of the APEX application. It is up to you to prettify it (or use the node.js app, above).


# Known Issues
TODO ora-600 issue
