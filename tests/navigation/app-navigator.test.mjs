import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('flags.ts USE_FASTAPI_BACKEND default is true', async () => {
  const flagsModule = await import('../../src/config/flags.ts');
  assert.equal(flagsModule.USE_FASTAPI_BACKEND, true);
});

test('AppNavigator routing configuration binds pure presentation components / FastAPI local screen harnesses', () => {
  const navigatorSource = readFileSync(
    new URL('../../src/navigation/AppNavigator.tsx', import.meta.url),
    'utf8'
  );

  // Assert imports
  assert.match(navigatorSource, /import\s+LocalDashboardScreen\s+from\s+['"].*screens\/LocalDashboardScreen['"]/);
  assert.match(navigatorSource, /import\s+LocalMenuScreen\s+from\s+['"].*screens\/LocalMenuScreen['"]/);
  assert.match(navigatorSource, /import\s+LocalRewardsScreen\s+from\s+['"].*screens\/LocalRewardsScreen['"]/);
  assert.match(navigatorSource, /import\s+LocalProfileScreen\s+from\s+['"].*screens\/LocalProfileScreen['"]/);
  assert.match(navigatorSource, /import\s+LocalStoreLocatorScreen\s+from\s+['"].*screens\/LocalStoreLocatorScreen['"]/);
  assert.match(navigatorSource, /import\s+LocalMembershipStatusScreen\s+from\s+['"].*screens\/LocalMembershipStatusScreen['"]/);

  assert.match(navigatorSource, /<Tab\.Screen\s+name="Home"\s+component=\{HomeScreen\}/);
  assert.match(navigatorSource, /component=\{USE_FASTAPI_BACKEND\s*\?\s*LocalMenuScreen\s*:\s*MenuScreen\}/);
  assert.match(navigatorSource, /component=\{USE_FASTAPI_BACKEND\s*\?\s*LocalRewardsScreen\s*:\s*RewardsScreen\}/);
  assert.match(navigatorSource, /component=\{USE_FASTAPI_BACKEND\s*\?\s*LocalProfileScreen\s*:\s*ProfileScreen\}/);
  assert.match(navigatorSource, /component=\{USE_FASTAPI_BACKEND\s*\?\s*LocalStoreLocatorScreen\s*:\s*StoreLocatorScreen\}/);
  assert.match(navigatorSource, /component=\{USE_FASTAPI_BACKEND\s*\?\s*LocalMembershipStatusScreen\s*:\s*MembershipStatusScreen\}/);
});
