CREATE VIEW documents_with_tags AS
SELECT
  d.*,
  COALESCE(
    array_agg(t.name) FILTER (WHERE t.id IS NOT NULL)
  ) as tags
FROM documents d
LEFT JOIN documents_tags dt ON d.id = dt.document_id
LEFT JOIN tags t ON dt.tag_id = t.id
GROUP BY d.id;