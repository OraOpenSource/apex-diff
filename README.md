# APEX Diff (Alpha)
The purpose of this project is to create a export of an APEX application in JSON format. Having the application export in JSON format will allow for easy diffs on different versions of an application

_This project is still undergoing active development. As such, configuration and command line options may change._

# Prerequistes

## SQLcl
This projects requires that [SQLcl](http://www.oracle.com/technetwork/developer-tools/sql-developer/downloads/index.html) (_Sep 23, 2015 or above_) is installed. It is used for its ability to quickly output queries in JSON format and cursor support.

Mac users can find additional information on how to install and configre SQLcl [here](http://www.talkapex.com/2015/04/installing-sqlcl.html).

To find the current version of SQLcl, simply run SQLcl and it will be displayed. Minimum required version is `SQLcl: Release 4.2.0.15.265.1501 RC`.

## Node.js
Node.js version 0.12.x or greater is required. To find your current version run:

```bash
node --version
```

# Running
They're two ways to create a JSON output of an APEX appliaction. SQLcl can be used to call the `apex-diff.sql` file or Node.js can be used. It is recommended that you use the Node.js application as it handles some additional tasks (such as prettifying the JSON file) behind the scene.

_Note: This project may eventually be listed on npm for easy install._

## Node.js App
A [Node.js](https://nodejs.org) application has been included with this project and is the recommended method to run APEX Diff.

### Config
Create a new (or copy `config_sample.json`) config file in the `config` folder called `config.json`.

- `debug`: optional, boolean, default `false`.
  - If `true` will output each step of the process.
- `rebuildTempFile` : optional, boolean, default `false`.
  - If `true`, the temp sql file will be re-generated. Unless upgrdaing APEX, it is not recommended to set this to `true` as it takes additional time to generate the temp sql file.
- `sqlcl` : optional, string, default `sql`.
  - Command name (or full path to) SQLcl file.
- `connections` : required, JSON object.
  - Name/value pair for each database connection.
- `filters` : options, array of regular expressions to remove objects from JSON file
  - The filter will be applied on both the `apex_view_name` and the `apex_view_name.column_name`
  - It is case insensitive
  - In the example below, the filter will remove all columns that contain `updated` in it (this is `updated_by` and `updated_on`) as well as the `apex_application_lists` view.
  - Any `\` needs to be escaped with `\\` as the regular expression must also be a valid JSON string.

Example:
```json
{
  "sqlcl" : "sqlcl",
  "connections" : {
    "dev" : "giffy/giffy@localhost:11521/xe",
    "prod" : "oos/oos@prod.oraopensource.com:1521/xe"
  },
  "filters" : [
    ".*\\.updated.*",
    "^apex_application_lists$"
  ]
}
```

### Run
The Node.js application requires two parameters:

- `connection name`: This is the name that is found in the `connections` object in `config.json`.
- `app_id`: Application ID to generate the JSON for.

Using the example configuration file above, the following example shows how to call the application:

```bash
# Can call from any directory that you want f113.json in.
node ~/Documents/GitHub/apex-diff/app.js dev 113
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

This will create a new file, `temp.sql` and `f113.json`. `temp.sql` can be deleted and `f113.json` is the unprettified JSON output of the APEX application. It is up to you to prettify it (or use the Node.js app, above).


# Known Issues

## ORA-00600 Error
If you get an `ORA-00600` error, it is a known bug that was fixed in Oracle 12.1.0.1 but re-appeared in 12.1.0.2:

```sql
ORA-00600: internal error code, arguments: [qkeIsExprReferenced1], [], [], [], [], [], [], [], [], [], [], []
00600. 00000 -  "internal error code, arguments: [%s], [%s], [%s], [%s], [%s], [%s], [%s], [%s], [%s], [%s], [%s], [%s]"
*Cause:    This is the generic internal error number for Oracle program
           exceptions. It indicates that a process has encountered a low-level,
           unexpected condition. The first argument is the internal message
           number. This argument and the database version number are critical in
           identifying the root cause and the potential impact to your system.
```

If you get it, you my need to add the following to `apex-diff.sql`:

```sql
alter system set "_projection_pushdown" = false scope=memory;
```
