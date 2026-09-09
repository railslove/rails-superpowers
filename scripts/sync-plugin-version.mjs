#!/usr/bin/env node
// Runs as npm's "version" lifecycle script (see package.json "scripts.version").
// npm has already bumped package.json's "version" on disk by the time this runs,
// and cwd is the package root. This script mirrors that version into
// .claude-plugin/plugin.json and every matching entry of
// .claude-plugin/marketplace.json's "plugins" array, then stages both files so
// npm's own commit (triggered right after this script exits 0) includes them.
//
// Edits are done as targeted text substitutions rather than a full JSON
// re-serialize, so unrelated formatting (e.g. a compact single-line array)
// isn't rewritten as a side effect of bumping one field.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const PLUGIN_JSON = path.join(root, '.claude-plugin', 'plugin.json');
const MARKETPLACE_JSON = path.join(root, '.claude-plugin', 'marketplace.json');
const PACKAGE_JSON = path.join(root, 'package.json');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${filePath}: ${err.message}`);
  }
}

function parseJson(filePath, raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Cannot parse ${filePath} as JSON: ${err.message}`);
  }
}

function fail(message) {
  console.error(`[sync-plugin-version] ${message}`);
  process.exit(1);
}

// Replaces the first `"version": "<oldVersion>"` occurrence (optionally
// scoped to appear after a `"name": "<name>"` occurrence) with the new
// version, leaving all other formatting untouched. Returns null if no match.
function bumpVersionField(raw, newVersion, { name, oldVersion }) {
  const escOld = escapeRegex(oldVersion);
  const pattern = name
    ? new RegExp(`("name":\\s*"${escapeRegex(name)}"[\\s\\S]*?"version":\\s*")${escOld}(")`)
    : new RegExp(`("version":\\s*")${escOld}(")`);
  if (!pattern.test(raw)) return null;
  return raw.replace(pattern, `$1${newVersion}$2`);
}

function main() {
  const pkg = parseJson(PACKAGE_JSON, readFile(PACKAGE_JSON));
  const newVersion = pkg.version;
  if (!newVersion) {
    fail(`package.json has no "version" field — nothing to sync.`);
  }

  const pluginRaw = readFile(PLUGIN_JSON);
  const plugin = parseJson(PLUGIN_JSON, pluginRaw);
  if (!plugin.name) {
    fail(`${PLUGIN_JSON} has no "name" field — cannot match marketplace.json entries.`);
  }
  const updatedPluginRaw = bumpVersionField(pluginRaw, newVersion, { oldVersion: plugin.version });
  if (updatedPluginRaw === null) {
    fail(`Could not find "version": "${plugin.version}" in ${PLUGIN_JSON}.`);
  }
  writeFileSync(PLUGIN_JSON, updatedPluginRaw, 'utf8');

  let marketplaceRaw = readFile(MARKETPLACE_JSON);
  const marketplace = parseJson(MARKETPLACE_JSON, marketplaceRaw);
  if (!Array.isArray(marketplace.plugins)) {
    fail(`${MARKETPLACE_JSON} has no "plugins" array.`);
  }
  const matches = marketplace.plugins.filter((entry) => entry.name === plugin.name);
  if (matches.length === 0) {
    fail(
      `No entry in ${MARKETPLACE_JSON}'s "plugins" array has name "${plugin.name}" ` +
        `(from ${PLUGIN_JSON}). Refusing to bump versions out of sync.`
    );
  }
  for (const entry of matches) {
    const updated = bumpVersionField(marketplaceRaw, newVersion, {
      name: plugin.name,
      oldVersion: entry.version,
    });
    if (updated === null) {
      fail(
        `Could not find version "${entry.version}" for plugin "${plugin.name}" in ${MARKETPLACE_JSON}.`
      );
    }
    marketplaceRaw = updated;
  }
  writeFileSync(MARKETPLACE_JSON, marketplaceRaw, 'utf8');

  try {
    execFileSync('git', ['add', PLUGIN_JSON, MARKETPLACE_JSON], { stdio: 'inherit' });
  } catch (err) {
    fail(`git add failed: ${err.message}`);
  }

  console.log(
    `[sync-plugin-version] Synced plugin.json and marketplace.json (name="${plugin.name}") to version ${newVersion}.`
  );
}

main();
