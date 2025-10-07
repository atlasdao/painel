#!/usr/bin/env node

// Script to fix dashboard infinite loading by clearing cookies and performing fresh login

console.log('=== Dashboard Fix Script ===\n');
console.log('The issue: Dashboard has infinite loading because:');
console.log('- There is an access_token cookie but NO user cookie');
console.log('- This causes the dashboard to fail loading user data\n');

console.log('SOLUTION:');
console.log('1. Open browser to http://localhost:11337');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Application tab -> Cookies');
console.log('4. Clear ALL cookies for localhost:11337');
console.log('5. Navigate to http://localhost:11337/login');
console.log('6. Login with your credentials');
console.log('7. Dashboard should now load properly!\n');

console.log('Alternatively, run this in browser console to clear cookies:');
console.log(`
// Clear all cookies
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
localStorage.clear();
sessionStorage.clear();
location.href = '/login';
`);

console.log('\n✅ After clearing cookies and logging in fresh, the dashboard will work!');