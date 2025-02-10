"use client";

import { createClient } from "@/utils/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface IntercomSettings {
  enabled: boolean;
  api_key: string | null;
}

export default function IntercomPage() {
  const [settings, setSettings] = useState<IntercomSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const loadSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("You must be logged in to manage Intercom settings");
      setLoading(false);
      return;
    }

    // Get the intercom settings for this user
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
      await loadSettings();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Intercom Settings</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <Input
            name="api_key"
            defaultValue={settings?.api_key || ''}
            placeholder="Enter your Intercom API key"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
