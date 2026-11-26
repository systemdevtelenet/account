import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Load the browser-preference helpers directly so their validation rules are
// covered without starting a browser or importing React.
const filename = path.resolve("src/features/accounts/accountSettings.ts");
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const loadedModule = { exports: {} };
vm.runInThisContext(`(function(module, exports) {\n${outputText}\n})`, { filename })(
  loadedModule,
  loadedModule.exports,
);
const {
  applySettingsPrefill,
  createDefaultAccountSettings,
  getAccountSettingsStorageKey,
  parseAccountSettings,
} = loadedModule.exports;

test("invalid or missing browser data falls back to defaults", () => {
  assert.deepEqual(parseAccountSettings(null), createDefaultAccountSettings());
  assert.deepEqual(parseAccountSettings("not json"), createDefaultAccountSettings());
  assert.deepEqual(parseAccountSettings("[]"), createDefaultAccountSettings());
});

test("only relevant keys and valid types survive parsing", () => {
  const parsed = parseAccountSettings(JSON.stringify({
    appearance: {
      theme: "rainbow",
      accentColor: "url(javascript:alert(1))",
      compactMode: "yes",
      showPreviews: false,
      animationsEnabled: false,
    },
    profile: { fullName: "Ada Lovelace", role: "Admin", email: "ada@example.test", password: "secret" },
    notifications: { rosterUpdates: false, unknownAlert: true },
    account: { accountName: "FLXAR" },
    workforce: { defaultSite: "SiteA" },
    password: "secret",
    __proto__: { polluted: true },
  }));

  assert.equal(parsed.appearance.theme, "light");
  assert.equal(parsed.appearance.accentColor, "var(--color-accent)");
  assert.equal(parsed.appearance.compactMode, false);
  assert.equal(parsed.appearance.showPreviews, false);
  assert.equal(parsed.appearance.animationsEnabled, false);
  assert.equal(parsed.profile.fullName, "Ada Lovelace");
  assert.equal(parsed.notifications.rosterUpdates, false);
  assert.equal("unknownAlert" in parsed.notifications, false);
  assert.equal("account" in parsed, false);
  assert.equal("workforce" in parsed, false);
  assert.equal("polluted" in {}, false);
  assert.equal(JSON.stringify(parsed).includes("secret"), false);
});

test("storage keys stay scoped and sanitized", () => {
  assert.equal(
    getAccountSettingsStorageKey("FLXAR"),
    "operation-system:account-settings:FLXAR",
  );
  assert.equal(
    getAccountSettingsStorageKey("../../etc"),
    "operation-system:account-settings:______etc",
  );
  assert.equal(
    getAccountSettingsStorageKey(""),
    "operation-system:account-settings:default",
  );
});

test("an explicit theme choice stops following the global theme", () => {
  const settings = createDefaultAccountSettings();
  settings.appearance.theme = "light";
  settings.appearance.themeSelected = true;

  const result = applySettingsPrefill(settings, {
    loaded: false,
    theme: "dark",
    displayName: "",
    role: "",
    email: "",
  });

  assert.equal(result.appearance.theme, "light");
});

test("identity prefill never replaces a saved or edited value", () => {
  const settings = createDefaultAccountSettings();
  settings.profile.fullName = "Saved Name";
  settings.profile.email = "saved@example.test";

  const prefill = {
    loaded: true,
    theme: "dark",
    displayName: "Auth Name",
    role: "Administrator",
    email: "auth@example.test",
  };
  const prefilled = applySettingsPrefill(settings, prefill);

  assert.equal(prefilled.profile.fullName, "Saved Name");
  assert.equal(prefilled.profile.email, "saved@example.test");
  assert.equal(prefilled.profile.role, "Administrator");
  assert.equal(prefilled.appearance.theme, "dark");

  const savedEmpty = {
    ...prefilled,
    prefillApplied: true,
    profile: { ...prefilled.profile, fullName: "" },
  };
  assert.equal(applySettingsPrefill(savedEmpty, prefill).profile.fullName, "");
});
