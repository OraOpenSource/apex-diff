-- TODO mdsouza: set sqlformat json
-- TODO mdsouza: find a bash prettify or node.js prettify file for this

/* TODO
echo '{"hello": 1, "foo": "bar"}' | xargs -0 node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]), null, 2))"
cat f113.json | xargs -0 node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]), null, 2))" >? f113.json
cat f113.json | xargs -0 node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]), null, 2))" > test.json

*/

set serveroutput on size 1000000
set feedback off
set verify off
set termout off


define APP_ID = '&1'

spool run_apex_json.sql
declare

  -- TODO mdsouza: remove logger references.
  -- l_scope logger_logs.scope%type := 'apex-diff';

  -- TODO mdsouza: check sizes and max dbms_output.put_line('');
  l_columns clob;
  l_sql clob; -- varchar2(4000);
  l_apex_view_spool_file varchar(255);

  -- TODO mdsouza: make this a cclb since used in replace and need space
  l_sql_template clob; -- TODO mdsouza: convert to constant?
  l_apex_view_spool_file_temp varchar(255);

  l_json_name_template varchar2(255); -- TODO mdsouza: not used can delete
  l_col_template varchar2(255);

  l_app_id apex_applications.application_id%type := &APP_ID.;

begin
  -- Templates
  -- TODO mdsouza: support sqlcl cursor format
  l_sql_template :=
'select %COLUMNS%
from %APEX_VIEW_NAME%
where application_id = %APP_ID%;';
  l_sql_template := replace(l_sql_template, '%APP_ID%', l_app_id);

  -- TODO mdsouza: may not need this anymore if go to one file
  l_apex_view_spool_file_temp := 'xx_%APEX_VIEW_NAME%.json'; -- TODO mdsouza: remove xx


  l_json_name_template := q'!exec dbms_output.put_line('"%APEX_VIEW_NAME%": ');!';

  l_col_template := q'!regexp_replace(%COL_NAME%, '(' || chr(10) || ')', '\n') %COL_NAME%!';
  -- TODO mdsouza: get cursor support from Kris
  /*
  select
    'abc' abc,
    cursor (select ename from emp) as emp
  from dept
  */
  dbms_output.put_line('set sqlformat json');
  dbms_output.put_line('set feedback off');
  dbms_output.put_line('set termout off');
  dbms_output.put_line('');
  dbms_output.put_line('spool f' || l_app_id || '.json');


  -- TODO mdsouza: creating wratpper APEX JSON OBJECT
  dbms_output.put_line('prompt {"apex" : [');

  -- TODO mdsouza: make this to a bulk collect for performance. Can merge the two queries below.
  for ad in (
    -- TODO mdsouza: format, leave like this for easy sql dev
select ad.apex_view_name, rownum rn
from apex_dictionary ad
where 1=1
  and ad.column_id = 0
  and ad.apex_view_name not like 'APEX_UI%' -- TODO mdsouza: exclude?
  and ad.apex_view_name not like 'APEX_TEAM%'
  and ad.apex_view_name not like 'APEX_WORKSPACE%'
  and ad.apex_view_name not like 'APEX_WS%'
  and ad.apex_view_name not in ('APEX_APPLICATIONS', 'APEX_APPLICATION_GROUPS','APEX_THEMES')

  and ad.apex_view_name != 'APEX_APPLICATION_TRANS_MAP' -- doesn't contain application_id
  -- TODO mdsouza: testing
--  and rownum <= 100000
order by ad.apex_view_name
  ) loop
    -- logger.log(logger.sprintf('apex_view_name: %s', ad.apex_view_name), l_scope);

    select listagg(atc.column_name, ',') within group (order by column_id) cols
    into l_columns
    from all_tab_columns atc
    where 1=1
      and atc.table_name = upper(ad.apex_view_name)
      and atc.owner = 'APEX_050000' -- TODO mdsouza: change this to dynamic
      and atc.column_name not in (
        'WORKSPACE',
        'WORKSPACE_DISPLAY_NAME',
        'APPLICATION_ID',
        'APPLICATION_NAME',
        -- TODO mdsouza: do we want to include the audit columns? Could be useful to see who made the changes (or at least a best guess effort)
        -- TODO mdsouza: make this an option, for now disable.
        -- 'LAST_UPDATED_BY',
        -- 'LAST_UPDATED_ON',
        -- 'CREATED_BY',
        -- 'CREATED_ON',
        'COMPONENT_SIGNATURE'
      )
      -- TODO mdsouza: valid?
      and atc.data_type not in ('BLOB')
    group by atc.table_name;

    -- dbms_output.put_line('TODO: ' || ad.APEX_VIEW_NAME);
  --  l_columns := regexp_replace(l_columns, '([[:alnum:]_]+)', q'!regexp_replace(\1, '(' || chr(10) || ')', '\n') \1!');
  --  l_columns := regexp_replace(l_columns, '([[:alnum:]_]+)', q'!replace(regexp_replace(replace(\1, '\\', '\\\\'), '(' || chr(10) || ')', '\n'), '"', '\\"') \1!');

    l_sql := replace(l_sql_template, '%COLUMNS%', l_columns);
  --  dbms_output.put_line('TODO: AFter');
    l_sql := replace(l_sql, '%APEX_VIEW_NAME%', ad.apex_view_name);
    l_sql := lower(l_sql);



    dbms_output.put_line('');
    -- dbms_output.put_line(replace('{"%APEX_VIEW_NAME%": ', '%APEX_VIEW_NAME%', ad.apex_view_name);
    -- if ad.rn != 1 then
    --   dbms_output.put_line('PROMPT ,');
    -- end if;
    -- dbms_output.put_line(replace('PROMPT "%APEX_VIEW_NAME%": ', '%APEX_VIEW_NAME%', ad.apex_view_name));

    -- dbms_output.put_line('TODO: ' || dbms_lob.getlength(l_sql));
    dbms_output.put_line(l_sql);

    dbms_output.put_line('prompt ,'); -- TODO mdsouza: json delimeter

  end loop; -- apex_dictionary

  -- TODO mdsouza: closing json
  dbms_output.put_line('prompt ]}');

  -- dbms_output.put_line('PROMPT }');
  dbms_output.put_line('');
  dbms_output.put_line('spool off');
  dbms_output.put_line('set sqlformat default');

  -- TODO mdsouza: make this an option
  dbms_output.put_line('');
  -- dbms_output.put_line('exit');

exception
  when others then
    -- logger.log_error('Unhandled Exception', l_scope);
    raise;
end;
/

spool off


@run_apex_json.sql
