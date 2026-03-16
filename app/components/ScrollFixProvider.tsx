'use client';

import { useEffect } from 'react';

/**
 * ScrollFixProvider - Component that ensures body scroll is always enabled
 * Place this at the root of your app to prevent scroll lock issues
 */
export default function ScrollFixProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force enable scroll on mount
    const enableScroll = () => {
      document.body.style.overflow = 'unset';
      document.body.style.overflowY = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';

      // Also check documentElement
      document.documentElement.style.overflow = 'unset';
      document.documentElement.style.overflowY = 'auto';

      // Remove any classes that might block scroll
      document.body.classList.remove('overflow-hidden');
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('no-scroll');
    };

    // Enable scroll immediately
    enableScroll();

    // Set up an interval to periodically check and fix scroll
    // This is a failsafe for any components that might break scroll
    const intervalId = setInterval(enableScroll, 1000);

    // Also listen for route changes
    const handleRouteChange = () => {
      setTimeout(enableScroll, 100);
    };

    window.addEventListener('popstate', handleRouteChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('popstate', handleRouteChange);
      enableScroll(); // Ensure scroll is enabled on unmount
    };
  }, []);

  return <>{children}</>;
}