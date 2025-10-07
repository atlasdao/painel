#!/usr/bin/env node

const puppeteer = require('puppeteer');

(async () => {
  console.log('[TEST] Starting browser test for settings page...');

  const browser = await puppeteer.launch({
    headless: false, // Set to true to run in background
    devtools: true, // Open devtools automatically
  });

  const page = await browser.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('[BROWSER ERROR]', text);
    } else if (text.includes('[LAYOUT]') || text.includes('[SETTINGS]') || text.includes('[Auth]') || text.includes('[API')) {
      console.log('[BROWSER]', text);
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  page.on('requestfailed', request => {
    console.log('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });

  try {
    console.log('[TEST] Navigating to settings page...');
    await page.goto('http://localhost:11337/settings', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('[TEST] Page loaded successfully');

    // Wait a bit to see what happens
    await page.waitForTimeout(5000);

    // Take a screenshot
    await page.screenshot({ path: '/tmp/settings-page.png' });
    console.log('[TEST] Screenshot saved to /tmp/settings-page.png');

  } catch (error) {
    console.error('[TEST ERROR]', error.message);
    await page.screenshot({ path: '/tmp/settings-error.png' });
    console.log('[TEST] Error screenshot saved to /tmp/settings-error.png');
  }

  // Keep browser open for inspection
  console.log('[TEST] Browser will remain open for inspection. Press Ctrl+C to exit.');
  // await browser.close();
})();