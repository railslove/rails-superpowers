#!/usr/bin/env node
// Runs as npm's "version" lifecycle script (see package.json "scripts.version").
// npm has already bumped package.json's "version" on disk by the time this runs,
// and cwd is the package root. This script mirrors that version into
// .claude-plugin/plugin.json and every matching entry of
// .claude-plugin/marketplace.json's "plugins" array, then builds a CHANGELOG.md
// entry from the Conventional Commits (see AGENTS.md) made since the last
// release tag, then stages all three files so npm's own commit (triggered
// right after this script exits 0) includes them.
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
const CHANGELOG_MD = path.join(root, 'CHANGELOG.md');

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

// Maps a Conventional Commits type to the Keep a Changelog section it belongs
// under. Types with no entry here (chore, style, test, ci, build, ...) are
// internal and never appear in the changelog. See AGENTS.md.
const CHANGELOG_SECTION_BY_TYPE = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Changed',
  refactor: 'Changed',
  docs: 'Changed',
  revert: 'Changed',
};
const CHANGELOG_SECTION_ORDER = ['Added', 'Changed', 'Fixed'];
const CONVENTIONAL_COMMIT_PATTERN = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Returns commit subject lines reached since `tag` (exclusive), oldest first.
// Falls back to the full history if `tag` doesn't exist (e.g. first-ever
// release), warning since that could pull in unrelated old commits.
function getCommitSubjectsSince(tag) {
  let range = `${tag}..HEAD`;
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', tag], { stdio: 'ignore' });
  } catch {
    console.warn(`[sync-plugin-version] Tag ${tag} not found — using full commit history.`);
    range = 'HEAD';
  }
  const raw = execFileSync('git', ['log', range, '--no-merges', '--pretty=format:%s', '--reverse'], {
    encoding: 'utf8',
  });
  return raw.split('\n').filter(Boolean);
}

// Sorts Conventional Commits subjects into Keep a Changelog sections.
// Subjects that don't match the Conventional Commits grammar, or whose type
// has no changelog section (see CHANGELOG_SECTION_BY_TYPE), are dropped —
// callers should tell the user about `skipped` so bad habits get noticed.
function groupChangelogEntries(subjects) {
  const sections = Object.fromEntries(CHANGELOG_SECTION_ORDER.map((name) => [name, []]));
  const skipped = [];
  for (const subject of subjects) {
    const match = subject.match(CONVENTIONAL_COMMIT_PATTERN);
    if (!match) {
      skipped.push(subject);
      continue;
    }
    const [, type, scope, breaking, description] = match;
    const section = breaking ? 'Changed' : CHANGELOG_SECTION_BY_TYPE[type];
    if (!section) continue;
    const bullet = scope ? `**${scope}:** ${capitalize(description)}` : capitalize(description);
    sections[section].push(breaking ? `**BREAKING:** ${bullet}` : bullet);
  }
  return { sections, skipped };
}

function renderChangelogBody(sections) {
  return CHANGELOG_SECTION_ORDER.filter((name) => sections[name].length > 0)
    .map((name) => `### ${name}\n\n${sections[name].map((bullet) => `- ${bullet}`).join('\n')}`)
    .join('\n\n');
}

// Builds this release's CHANGELOG.md entry from the Conventional Commits made
// since the `v<oldVersion>` tag, inserts it under "## [Unreleased]" as
// "## [<newVersion>] - <today>", and updates the reference-link definitions
// at the bottom of the file. Fails if no commit since the last tag maps to a
// changelog section — nothing user-facing to release.
function promoteChangelog(raw, { newVersion, oldVersion, repoUrl }) {
  const oldTag = `v${oldVersion}`;
  const { sections, skipped } = groupChangelogEntries(getCommitSubjectsSince(oldTag));
  if (skipped.length > 0) {
    console.warn(
      `[sync-plugin-version] ${skipped.length} commit(s) since ${oldTag} aren't Conventional ` +
        `Commits (see AGENTS.md) and were left out of the changelog:\n` +
        skipped.map((subject) => `  - ${subject}`).join('\n')
    );
  }
  const body = renderChangelogBody(sections);
  if (!body) {
    fail(
      `No feat/fix/perf/refactor/docs/revert commits found since ${oldTag} — nothing to release. ` +
        `Commit messages must follow Conventional Commits (see AGENTS.md) for the changelog to pick them up.`
    );
  }

  const unreleasedHeading = '## [Unreleased]';
  const headingIndex = raw.indexOf(unreleasedHeading);
  if (headingIndex === -1) {
    fail(`Could not find a "${unreleasedHeading}" section in ${CHANGELOG_MD}.`);
  }
  const insertAt = headingIndex + unreleasedHeading.length;
  const today = new Date().toISOString().slice(0, 10);
  const releasedSection = `## [${newVersion}] - ${today}\n\n${body}`;
  let updated =
    raw.slice(0, insertAt) +
    `\n\n${releasedSection}\n` +
    raw.slice(insertAt).replace(/^\n+/, '\n');

  const unreleasedLinkPattern = /^\[Unreleased\]: .+$/m;
  const newUnreleasedLink = `[Unreleased]: ${repoUrl}/compare/v${newVersion}...HEAD`;
  const newVersionLink = `[${newVersion}]: ${repoUrl}/compare/v${oldVersion}...v${newVersion}`;
  if (unreleasedLinkPattern.test(updated)) {
    updated = updated.replace(unreleasedLinkPattern, `${newUnreleasedLink}\n${newVersionLink}`);
  } else {
    updated = `${updated.trimEnd()}\n\n${newUnreleasedLink}\n${newVersionLink}\n`;
  }

  return updated;
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

  const changelogRaw = readFile(CHANGELOG_MD);
  const repoUrl = String(pkg.repository?.url ?? pkg.repository ?? '').replace(/\.git$/, '');
  if (!repoUrl) {
    fail(`package.json has no "repository" field — cannot build CHANGELOG.md compare links.`);
  }
  const updatedChangelog = promoteChangelog(changelogRaw, {
    newVersion,
    oldVersion: plugin.version,
    repoUrl,
  });
  writeFileSync(CHANGELOG_MD, updatedChangelog, 'utf8');

  try {
    execFileSync('git', ['add', PLUGIN_JSON, MARKETPLACE_JSON, CHANGELOG_MD], { stdio: 'inherit' });
  } catch (err) {
    fail(`git add failed: ${err.message}`);
  }

  console.log(
    `[sync-plugin-version] Synced plugin.json, marketplace.json, and CHANGELOG.md (name="${plugin.name}") to version ${newVersion}.`
  );
}

main();
