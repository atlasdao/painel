'use client';

import { useEffect } from 'react';

export default function TestLayout({ children }: { children: React.ReactNode }) {
  console.log('[TEST LAYOUT] Component rendering');

  useEffect(() => {
    console.log('[TEST LAYOUT] useEffect running!');
  }, []);

  return (
    <div>
      <h1>Test Layout</h1>
      {children}
    </div>
  );
}