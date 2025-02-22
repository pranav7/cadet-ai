CREATE OR REPLACE FUNCTION execute_sql_query(sql_query text)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Prevent any non-SELECT operations
  IF LOWER(sql_query) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Prevent dangerous operations even if they start with SELECT
  IF sql_query ~* '\y(insert|update|delete|drop|alter|create|truncate|grant|revoke)\y' THEN
    RAISE EXCEPTION 'Disallowed SQL operation';
  END IF;

  -- Execute query and convert results to JSON
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', sql_query) INTO result;
  RETURN result;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error executing query: %', SQLERRM;
END;
$$;