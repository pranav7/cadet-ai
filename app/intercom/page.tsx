"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sources } from "@/constants/sources";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner"

interface Document {
  id: number;
  name: string;
  content: string;
  source: number;
  metadata: Record<string, any>;
  external_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface IntercomSettings {
  enabled: boolean;
  api_key: string | null;
}

export default function IntercomPage() {
  const [settings, setSettings] = useState<IntercomSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const supabase = createClient();

  const loadSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("You must be logged in to manage Intercom settings");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('intercom_settings')
      .select('*')
      .eq('created_by', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      setError(error.message);
    } else {
      setSettings(data || { enabled: false, api_key: null });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to manage Intercom settings');
      setSaving(false);
      return;
    }

    const formData = new FormData(form);
    const api_key = formData.get('api_key') as string;

    const { error } = await supabase
      .from('intercom_settings')
      .upsert({
        created_by: user.id,
        api_key: api_key || null,
      }, {
        onConflict: 'created_by'
      });

    if (error) {
      setError(error.message);
    } else {
      toast.success("Settings saved");
      await loadSettings();
    }
    setSaving(false);
  };

  const importConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to import conversations");
      return;
    }

    await supabase.functions.invoke('intercom-conversation-importer', {
      body: { user_id: user.id },
      method: "POST",
    })

    toast.success("Conversations import started");
  }

  const loadDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('source', Sources.Intercom)
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setDocuments(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 border border-gray-50 dark:border-gray-800 rounded-md">
      <h1 className="text-2xl font-bold mb-6">Intercom Settings</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            API Key
          </label>
          <Input
            name="api_key"
            defaultValue={settings?.api_key || ''}
            placeholder="Enter your Intercom API key"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:text-white dark:border-gray-700"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          size="sm"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      {settings?.api_key && (
        <div className="mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
          <Button
            size="sm"
            onClick={() => {
              importConversations();
            }}
          >
            Import past conversations
          </Button>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
          <h2 className="text-md font-bold mb-4">Imported Conversations</h2>
          <ul className="space-y-4">
            {documents.map((document: Document) => (
              <li key={document.id} className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md shadow-sm">
                <div className="text-sm font-medium mb-2 border-b border-gray-50 dark:border-gray-800 pb-2">{document.name}</div>
                <div className="text-sm overflow-auto max-h-[400px]">
                  <ReactMarkdown>
                    {document.content}
                  </ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
