select *
from apex_dictionary ad
where 1=1
  and ad.column_id = 0
  and ad.apex_view_name not like 'APEX_UI%' -- TODO mdsouza: exclude?
  and ad.apex_view_name not like 'APEX_TEAM%'
  and ad.apex_view_name not like 'APEX_WORKSPACE%'
  and ad.apex_view_name not like 'APEX_WS%'
  and ad.apex_view_name not in ('APEX_APPLICATIONS, APEX_THEMES')
order by ad.apex_view_name
;

select *
from APEX_APPLICATION_AUTH;

select *
from all_tab_columns atc
where 1=1
  and table_name = 'APEX_APPLICATION_AUTH'
--  and atc.data_type not in ('VARCHAR2', 'NUMBER')
order by column_id;

select listagg(atc.column_name, ',') within group (order by column_id) cols
  from all_tab_columns atc
  where 1=1
    and atc.table_name = 'APEX_APPLICATION_AUTH'
    and atc.owner = 'APEX_050000' -- TODO mdsouza: change this to dynamic
    and atc.column_name not in (
      'WORKSPACE',
      'WORKSPACE_DISPLAY_NAME',
      'APPLICATION_ID',
      'APPLICATION_NAME',
      'LAST_UPDATED_BY',
      'LAST_UPDATED_ON',
      'CREATED_BY',
      'CREATED_ON',
      'COMPONENT_SIGNATURE'
    )
  group by atc.table_name
  ;
  
select distinct atc.data_type
from all_tab_columns atc
where 1=1
  and atc.table_name in (select ad.apex_view_name from apex_dictionary ad)