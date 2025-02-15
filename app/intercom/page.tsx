"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sources } from "@/constants/sources";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner"
import { Tables } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [app, setApp] = useState<Tables<'apps'> | null>(null);
  const [testRun, setTestRun] = useState(false);
  const supabase = createClient();

  const loadSettings = useCallback(async () => {
    if (!user || !app) {
      console.log("no user or app");
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
  }, [supabase, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setSaving(true);
    setError(null);

    if (!user || !app) {
      setError("You must be logged in to manage Intercom settings");
      setSaving(false);
      return;
    }
    console.log("creating settings for user, app", user, app);

    const formData = new FormData(form);
    const api_key = formData.get('api_key') as string;

    const { error } = await supabase
      .from('intercom_settings')
      .insert({
        app_id: app.id,
        created_by: user.id,
        api_key: api_key || null,
      });

    if (error) {
      setError(error.message);
    } else {
      toast.success("Settings saved");
      await loadSettings();
    }
    setSaving(false);
  };

  const kickOffImport = async () => {
    try {
      await fetch("/intercom/api", {
        method: "POST",
        body: JSON.stringify({
          limit: testRun ? 10 : undefined,
        }),
      });
      toast.success("Conversations import started");
      await loadDocuments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import conversations");
    }
  }

  const countDocuments = useCallback(async () => {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('source', Sources.Intercom);
    return count;
  }, [supabase]);

  const loadDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('app_id', app?.id || '')
      .eq('source', Sources.Intercom)
      .limit(50);

    if (error) {
      setError(error.message);
    } else {
      setDocuments(data || []);
    }
  }, [supabase, user]);

  useEffect(() => {
    const getUser = async () => {
      const { data: currentUser } = await supabase.rpc('get_current_user');
      const { data: currentApp } = await supabase.rpc('get_current_app');
      setUser(currentUser);
      setApp(currentApp);
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [loadDocuments, user]);

  useEffect(() => {
    if (user) {
      countDocuments().then(setDocumentCount);
    }
  }, [countDocuments, user]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [loadSettings, user]);

  if (!user || !app) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-2 border border-gray-50 dark:border-gray-800 rounded-md">
      <h3 className="text-2xl font-bold mb-6">Intercom Settings</h3>

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
        <div className="flex flex-row items-center gap-2 mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
          <Button
            size="sm"
            onClick={kickOffImport}
          >
            Import past conversations
          </Button>
          <div className="flex flex-row items-center gap-1">
            <Checkbox
              id="test-run"
              checked={testRun}
              onCheckedChange={(checked) => setTestRun(checked === true)}
            />
            <Label htmlFor="test-run">Test run</Label>
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
          <div className="flex flex-row justify-between items-center mb-4">
            <h2 className="text-md font-bold">Conversations</h2>
            <span className="text-xs bg-gray-100 dark:bg-gray-900 dark:text-gray-100 text-gray-800 px-2 py-1 rounded-md">
              {documentCount ? `${documentCount} conversations imported` : '...'}
            </span>
          </div>
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
