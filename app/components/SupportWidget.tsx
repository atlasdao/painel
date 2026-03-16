'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

export default function SupportWidget({ context }: { context: 'logged' | 'unlogged' }) {
  const [siteKey, setSiteKey] = useState('');
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    // Don't render the unlogged widget if the user is authenticated
    if (context === 'unlogged') {
      const hasToken = document.cookie.includes('access_token=');
      if (hasToken) {
        setSkip(true);
        return;
      }
    }

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.atlasdao.info/api/v1').replace(/\/api\/v1$/, '');
    fetch(`${baseUrl}/health/support-widget-key?context=${context}`)
      .then(r => r.json())
      .then(data => { if (data.key) setSiteKey(data.key); })
      .catch(() => {});
  }, [context]);

  if (skip || !siteKey) return null;

  const src = context === 'logged'
    ? 'https://desk.atlasdao.app/api/widget.js'
    : 'https://desk.atlasdao.app/widget.js';

  return (
    <Script
      src={src}
      data-site-key={siteKey}
      strategy="afterInteractive"
    />
  );
}
