-- TODO mdsouza: set sqlformat json
-- TODO mdsouza: find a bash prettify or node.js prettify file for this


set serveroutput on size 1000000
set feedback off

spool run.sql
declare

  -- TODO mdsouza: remove logger references.
  l_scope logger_logs.scope%type := 'apex-diff';

  -- TODO mdsouza: check sizes and max dbms_output.put_line('');
  l_columns varchar2(4000);
  l_sql varchar2(4000);
  l_apex_view_spool_file varchar(255);

  l_sql_template varchar2(4000); -- TODO mdsouza: convert to constant?
  l_apex_view_spool_file_temp varchar(255);

begin
  -- Templates
  l_sql_template :=
'select %COLUMNS%
from %APEX_VIEW_NAME%
where application_id = %APP_ID%;';
  l_sql_template := replace(l_sql_template, '%APP_ID%', 113); -- -- TODO mdsouza: param

  -- TODO mdsouza: may not need this anymore if go to one file
  l_apex_view_spool_file_temp := 'xx_%APEX_VIEW_NAME%.json'; -- TODO mdsouza: remove xx

  -- TODO mdsouza: get cursor support from Kris
  /*
  select
    'abc' abc,
    cursor (select ename from emp) as emp
  from dept
  */
  dbms_output.put_line('set sqlformat json');
  dbms_output.put_line('set feedback off');
  dbms_output.put_line('');
  dbms_output.put_line('spool xx_apex.json'); -- TODO mdsouza: make this fxxx.json



  for ad in (
    -- TODO mdsouza: format, leave like this for easy sql dev
select *
from apex_dictionary ad
where 1=1
  and ad.column_id = 0
  and ad.apex_view_name not like 'APEX_UI%' -- TODO mdsouza: exclude?
  and ad.apex_view_name not like 'APEX_TEAM%'
  and ad.apex_view_name not like 'APEX_WORKSPACE%'
  and ad.apex_view_name not like 'APEX_WS%'
  and ad.apex_view_name not in ('APEX_APPLICATIONS', 'APEX_APPLICATION_GROUPS','APEX_THEMES')
order by ad.apex_view_name
  ) loop
    logger.log(logger.sprintf('apex_view_name: %s', ad.apex_view_name), l_scope);

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
    group by atc.table_name;

    l_sql := replace(l_sql_template, '%COLUMNS%', l_columns);
    l_sql := replace(l_sql, '%APEX_VIEW_NAME%', ad.apex_view_name);
    l_sql := lower(l_sql);

    dbms_output.put_line('');
    dbms_output.put_line(l_sql);

  end loop; -- apex_dictionary

  dbms_output.put_line('');
  dbms_output.put_line('spool off');
  dbms_output.put_line('set sqlformat default');

exception
  when others then
    logger.log_error('Unhandled Exception', l_scope);
    raise;
end;
/

spool off
