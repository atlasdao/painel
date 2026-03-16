'use client';

import { useState, useEffect } from 'react';

export default function TestSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('TestSettingsPage mounted');

    // Simulate loading
    const timer = setTimeout(() => {
      console.log('TestSettingsPage loading complete');
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl">Loading test page...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Test Settings Page</h1>
      <p>This is a minimal test page to check if the issue is with UserLimitsDisplay component.</p>

      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-xl mb-2">Debug Info:</h2>
        <p>Page loaded successfully!</p>
        <p>No UserLimitsDisplay component included.</p>
      </div>
    </div>
  );
}