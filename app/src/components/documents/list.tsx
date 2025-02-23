"use client";

import { useEffect, useState } from "react";
import { Tables } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import Document from "@/components/documents/document";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

export default function DocumentsList() {
  const [documents, setDocuments] = useState<Tables<'documents_with_tags'>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchDocuments = async (page: number) => {
    setLoading(true);
    try {
      const { data: currentApp } = await supabase.rpc('get_current_app');
      if (!currentApp?.id) return;

      const { data, error, count } = await supabase
        .from('documents_with_tags')
        .select('*', { count: 'exact' })
        .eq('app_id', currentApp.id)
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      console.log("count", count);
      if (error) throw error;

      setDocuments(prev => page === 1 ? data || [] : [...prev, ...(data || [])]);
      setHasMore(count ? page * PAGE_SIZE < count : false);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(1);
  }, []);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
      fetchDocuments(currentPage + 1);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {documents.map((document) => (
          <Document key={document.id} document={document} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={loading || !hasMore}
            variant="outline"
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}