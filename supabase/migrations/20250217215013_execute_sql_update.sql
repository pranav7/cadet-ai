CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS SETOF RECORD
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent any non-SELECT operations
  IF LOWER(sql_query) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Prevent dangerous operations even if they start with SELECT
  -- Using word boundaries to match exact keywords
  IF sql_query ~* '\y(insert|update|delete|drop|alter|create|truncate|grant|revoke)\y' THEN
    RAISE EXCEPTION 'Disallowed SQL operation';
  END IF;

  RETURN QUERY EXECUTE sql_query;
EXCEPTION
  WHEN others THEN
  RAISE EXCEPTION 'Error executing query: %', SQLERRM;
END;
$$;
