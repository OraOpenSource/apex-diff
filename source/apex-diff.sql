-- This file generates a second file which will be used to create the JSON output.
set serveroutput on size 1000000
set feedback off
set verify off
set termout off
set linesize 9999


define APP_ID = '&1'
define SPOOL_FILENAME = '&2'

spool &SPOOL_FILENAME.
declare

  l_sql clob;
  l_sql_template clob;

  l_app_id apex_applications.application_id%type := &APP_ID.;

  type rec_apex_info is record(
    apex_view_name apex_dictionary.apex_view_name%type,
    custom_predicates varchar2(4000), -- Custom predicates
    cols varchar2(4000),
    order_by varchar2(4000),
    rn number,
    cnt number
  );

  type tab_apex_info is table of rec_apex_info index by pls_integer;

  l_apex_info tab_apex_info;

begin
  -- Templates
  l_sql_template :=
'cursor(select %COLUMNS%
from %APEX_VIEW_NAME% avn
where 1=1
  and avn.application_id = %APP_ID%
  %CUSTOM_PREDICATES%
order by %ORDER_BY%) "%APEX_VIEW_NAME%"';
  l_sql_template := replace(l_sql_template, '%APP_ID%', chr(38) || 'APP_ID.');

  dbms_output.put_line('-- File genereted from apex-diff.sql');
  dbms_output.put_line('-- DO NOT MODIFY THIS FILE');
  dbms_output.put_line('');
  dbms_output.put_line('set sqlformat json');
  dbms_output.put_line('set feedback off');
  dbms_output.put_line('set termout off');
  dbms_output.put_line('set verify off'); -- Removes the old/new sub string
  dbms_output.put_line('set sqlblanklines on'); -- Allows for blank lines caused by CUSTOM_PREDICATES
  dbms_output.put_line('');
  -- Variables (this is for the auto build file)
  dbms_output.put_line('define APP_ID = ''' || chr(38) || '1''');
  dbms_output.put_line('');
  dbms_output.put_line('spool f' || chr(38) || 'APP_ID..json');


  -- Creating parent select statement
  dbms_output.put_line('select ');


  -- Get all the APEX views, and their columns
  select
    ad.apex_view_name,
    ad.custom_predicates,
    listagg(atc.column_name, ',') within group (order by adc.column_id) cols,
    -- order by columns will use APEX dictionary recommended list (ignore LOBs)
    listagg(
      case
        when atc.data_type like '%LOB' then null -- can't order by LOBs
        else atc.column_name
      end, ',')
      within group (order by adc.column_id) order_by,
    row_number() over (order by ad.apex_view_name) rn,
    count(1) over () cnt
  bulk collect into l_apex_info
  from
    (
      select
        case
          -- #12 Save default (public) IR settings only
          -- Note: Query is forced to lower, so manually force items to upper when necessary
          when ad.apex_view_name = 'APEX_APPLICATION_PAGE_IR_RPT' then
            q'!and avn.status = upper('PUBLIC')!'
          when ad.apex_view_name in ('APEX_APPLICATION_PAGE_IR_COMP', 'APEX_APPLICATION_PAGE_IR_COND','APEX_APPLICATION_PAGE_IR_GRPBY','APEX_APPLICATION_PAGE_IR_PIVOT','APEX_APPLICATION_PAGE_IR_PVAGG','APEX_APPLICATION_PAGE_IR_PVSRT') then
            q'!and avn.report_id in (
              select ir.report_id
              from apex_application_page_ir_rpt ir
              where 1=1
                and ir.application_id = avn.application_id
                and ir.status = upper('PUBLIC'))!'
          else null
        end custom_predicates,
        ad.*
      from apex_dictionary ad
      where 1=1
        and ad.column_id = 0
      ) ad,
    all_tab_columns atc,
    (
      -- For column ids (order by)
      select apex_view_name, column_name, column_id
      from apex_dictionary
      where column_id != 0) adc
  where 1=1
    -- APEX views
    and ad.apex_view_name not like 'APEX_UI%' -- TODO mdsouza: exclude?
    and ad.apex_view_name not like 'APEX_TEAM%'
    and ad.apex_view_name not like 'APEX_WORKSPACE%'
    and ad.apex_view_name not like 'APEX_WS%'
    and ad.apex_view_name not like 'APEX_REST%' -- #20: APEX_REST queries don't have application_id
    and ad.apex_view_name not in (
      'APEX_APPLICATIONS',
      'APEX_APPLICATION_GROUPS',
      'APEX_THEMES',
      -- These IR reports are for user level IRs
      'APEX_APPLICATION_PAGE_IR_SUB'
    )
    and ad.apex_view_name != 'APEX_APPLICATION_TRANS_MAP' -- doesn't contain application_id
    -- APEX dictionary columns
    and atc.table_name = adc.apex_view_name(+)
    and atc.column_name = adc.column_name(+)
    -- Columns
    and atc.table_name = upper(ad.apex_view_name)
    and atc.owner = apex_application.g_flow_schema_owner
    and atc.column_name not in (
      'WORKSPACE',
      'WORKSPACE_DISPLAY_NAME',
      'APPLICATION_ID',
      'APPLICATION_NAME',
      'COMPONENT_SIGNATURE'
    )
    and atc.data_type not in ('BLOB')
  group by ad.apex_view_name, ad.custom_predicates
  order by rn;

  for i in 1 .. l_apex_info.count loop

    l_sql := replace(l_sql_template, '%COLUMNS%', l_apex_info(i).cols);
    l_sql := replace(l_sql, '%APEX_VIEW_NAME%', l_apex_info(i).apex_view_name);
    l_sql := replace(l_sql, '%ORDER_BY%', l_apex_info(i).order_by);
    l_sql := replace(l_sql, '%CUSTOM_PREDICATES%', l_apex_info(i).custom_predicates);
    l_sql := lower(l_sql);

    dbms_output.put_line(l_sql);

    if l_apex_info(i).rn != l_apex_info(i).cnt then
      dbms_output.put_line(','); -- Column/cursor delimeter
    end if;

  end loop; -- apex_dictionary

  -- Closing main query
  dbms_output.put_line('from dual;');

  dbms_output.put_line('');
  dbms_output.put_line('spool off');
  dbms_output.put_line('set sqlformat default');

  -- TODO mdsouza: make this an option
  dbms_output.put_line('');
  dbms_output.put_line('exit');

exception
  when others then
    raise;
end;
/

spool off


@&SPOOL_FILENAME. &APP_ID.

-- TODO mdsouza: add option to export APEX application as well (.sql file)

exit
