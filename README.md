# APEX Diff (Alpha)
The purpose of this project is to create a export of an APEX application in JSON format. Having the application export in JSON format will allow for easy diffs on different versions of an application

_This project is still undergoing active development. As such, configuration and command line options may change._

# Prerequisites

## SQLcl
This projects requires that [SQLcl](http://www.oracle.com/technetwork/developer-tools/sql-developer/downloads/index.html) (_Sep 23, 2015 or above_) is installed. It is used for its ability to quickly output queries in JSON format and cursor support.

Mac users can find additional information on how to install and configre SQLcl [here](http://www.talkapex.com/2015/04/installing-sqlcl.html).

To find the current version of SQLcl, simply run SQLcl and it will be displayed. Minimum required version is `SQLcl: Release 4.2.0.15.265.1501 RC`.

## Node.js
[Node.js](https://nodejs.org) version 0.12.x or greater is required. To find your current version run:

```bash
node --version
```

# Running

## Download
Either download this project from GitHub or clone it using git:
`git clone https://github.com/OraOpenSource/apex-diff.git`

_Note: This project may eventually be listed on npm for easy install._

## Config
Create a new (or copy `config_sample.json`) config file in the `config` folder called `config.json`.

- `debug`: optional, boolean, default `false`.
  - If `true` will output each step of the process.
- `rebuildTempFile` : optional, boolean, default `true`.
  - If `true`, the temp sql file will be re-generated. Unless upgrading APEX, it is not recommended to set this to `true` as it takes additional time to generate the temp sql file.
- `sqlcl` : optional, string, default `sql`.
  - Command name (or full path to) SQLcl file.
- `filters` : optional, array of regular expressions to remove objects from JSON file
  - The filter will be applied on both the `apex_view_name` and the `apex_view_name.column_name`.
  - Filters will be applied for all connections.
  - It is case insensitive.
  - Any `\` needs to be escaped with `\\` as the regular expression must also be a valid JSON string.
- `filterGroups` : optional, JSON object, defining set of filterGroups.
  - Define a set of filters that can then be easily applied to specific connections
  - Each entry is a name/value pair.
  - Value is an array of filters that correspond to the filterGroup
- `connections` : required, JSON object.
  - Name/value pair for each database connection or connection object
  - Connection Object: Use this for specific connection information for a connection
    - `connectionDetails`: required, database connection
    - `filters`: optional, array of filters (see `filters` above)
    - `filterGroups`: optional, array of list of `filterGroups` to apply


Example:
```json
{
  "sqlcl" : "sqlcl",
  "connections" : {
    "dev" : {
      "connectionDetails" : "giffy/giffy@localhost:11521/xe",
      "filters" : ["apex_application_pages"],
      "filterGroups" : ["updateInfo"]
    },
    "prod" : "oos/oos@prod.oraopensource.com:1521/xe"
  },
  "filters" : ["apex_application_lists"],
  "filterGroups" : {
    "updateInfo" : [".+\\..+_updated_.*"]
  }
}
```

Example Explanation:

- `filters`: For all connections data for `apex_application_lists` will be removed.
- `connections`: They're two connections, `dev` and `prod`,
  - `dev`:
    - `filters`: Just for this connection, all entries for `apex_application_pages` will be removed.
    - `filterGroups`: Any filters defined in the `filterGroup` `updateInfo` will be applied. In this example, all column names that contain `_updated_` will be removed.
- `filterGroups`: A filterGroup called `updateInfo` has been created and can be applied to individual connections.

## Run
The Node.js application requires two parameters:

- `connection name`: This is the name that is found in the `connections` object in `config.json`.
- `app_id`: Application ID to generate the JSON for.

Using the example configuration file above, the following example shows how to call the application:

```bash
# Can call from any directory that you want f113.json in.
node ~/Documents/GitHub/apex-diff/app.js dev 113
```

This will generate a prettified JSON file: `f113.json`.

# Developers
To help with future development, the following configuration can be added to `config.json`:

- `dev`
  - `runSql`: `boolean` - If false, will skip over the SQL command. This is useful for testing JSON parsing.
  - `saveJson`: `boolean` - If false, will not save any changes to the JSON file.

Example:
```json
...
"dev" : {
  "runSql" : false,
  "saveJson" : true
}
...
```

## Filter Examples
The following is a list of filters that you can either at to a `filters` option or a `filterGroup`. _Note: the filters are already escaped for JSON use. If testing in a regexp tester ensure to unescape._

Filter  | Description
------------- | -------------
`^(.(?!page_id$))*_id$` | Exclude all id columns except for `page_id`
`.+\\..+_updated_.*` | All columns that contain the name `_updated_`
`.+\\.(items|buttons|display_sequence)` | Exclude all columns with ..
`apex_application_templates.reference_count` |



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
