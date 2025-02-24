"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sources } from "@/constants/sources";
import { toast } from "sonner"
import { Tables } from "@/types/database";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface IntercomSettings {
  enabled: boolean;
  api_key: string | null;
}

export default function IntercomPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<IntercomSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countNoEmbed, setCountNoEmbed] = useState<number | null>(null);
  const [user, setUser] = useState<Tables<'users'> | null>(null);
  const [app, setApp] = useState<Tables<'apps'> | null>(null);
  const [testRun, setTestRun] = useState(false);
  const [forceIdentifyTags, setForceIdentifyTags] = useState(false);
  const [forceCreateSummary, setForceCreateSummary] = useState(false);
  const [forceSplitDocuments, setForceSplitDocuments] = useState(false);

  const loadCountNoEmbed = useCallback(async () => {
    const { count } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);
    setCountNoEmbed(count);
  }, [supabase]);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import conversations");
    }
  }

  const ensureEmbed = async () => {
    try {
      await supabase.functions.invoke('ensure-embed');
      toast.success("Embeddings generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate embeddings");
    }
  }

  const ensureDocumentProcessed = async () => {
    try {
      await supabase.functions.invoke('ensure-document-processed', {
        body: JSON.stringify({
          forceIdentifyTags,
          forceCreateSummary,
          forceSplitDocuments,
        }),
      });
      toast.success("Force processing started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to ensure all documents are processed");
    }
  }

  const countDocuments = useCallback(async () => {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('source', Sources.Intercom);
    return count;
  }, [supabase]);

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
      loadSettings();
      loadCountNoEmbed();
    }
  }, [loadSettings, user, loadCountNoEmbed]);

  if (!user || !app) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h3 className="text-2xl font-bold mb-6">Intercom Settings</h3>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {String(error)}
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
        <div className="flex flex-col gap-2 mt-6 border-t border-gray-50 dark:border-gray-800 pt-6">
          <div className="flex flex-row items-center gap-2">
            <Button
              variant="ghost"
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
              <Label htmlFor="test-run" className="text-xs">Test run</Label>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <Button variant="ghost" size="sm" onClick={ensureEmbed}>
              Ensure embeddings
            </Button>
            <span className="text-xs bg-gray-100 dark:bg-gray-900 dark:text-gray-100 text-gray-800 px-2 py-1 rounded-md">
              {countNoEmbed ? `${countNoEmbed} remaining` : 'all good'}
            </span>
          </div>
          <div className="flex flex-row items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-4">
            <Checkbox
              id="ensure-document-processed"
              checked={forceIdentifyTags}
              onCheckedChange={(checked) => setForceIdentifyTags(checked === true)}
            />
            <Label htmlFor="force-identify-tags" className="text-xs">Force identify tags</Label>
            <Checkbox
              id="force-create-summary"
              checked={forceCreateSummary}
              onCheckedChange={(checked) => setForceCreateSummary(checked === true)}
            />
            <Label htmlFor="force-create-summary" className="text-xs">Force create summary</Label>
            <Checkbox
              id="force-split-documents"
              checked={forceSplitDocuments}
              onCheckedChange={(checked) => setForceSplitDocuments(checked === true)}
            />
            <Label htmlFor="force-split-documents" className="text-xs">Force split documents</Label>
          </div>
          <Button variant="outline" size="sm" onClick={ensureDocumentProcessed}>
            Ensure all document processed
          </Button>
        </div>
      )}
    </div>
  );
}