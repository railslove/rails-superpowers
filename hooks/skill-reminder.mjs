#!/usr/bin/env node
// PreToolUse hook: before a file edit, remind the agent to invoke every skill
// whose `paths:` frontmatter matches the file and that it hasn't invoked yet
// this session. Never blocks the edit.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const skillsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills');

function globToRegExp(glob) {
  const source = glob
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  // Unanchored at the start so apps nested in a monorepo subdirectory still match.
  return new RegExp(`(?:^|/)${source}$`);
}

function skillPathPatterns() {
  return fs.readdirSync(skillsDir).flatMap((name) => {
    const file = path.join(skillsDir, name, 'SKILL.md');
    if (!fs.existsSync(file)) return [];
    const frontmatter = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const block = frontmatter.match(/^paths:\n((?:\s+-.*\n?)+)/m)?.[1] ?? '';
    const globs = [...block.matchAll(/-\s*"?([^"\n]+)"?/g)].map((m) => m[1].trim());
    return globs.length ? [{ name, patterns: globs.map(globToRegExp) }] : [];
  });
}

function invokedSkillsFile(sessionId) {
  return path.join(os.tmpdir(), `rails-superpowers-${sessionId.replace(/[^\w-]/g, '')}.json`);
}

function loadInvokedSkills(stateFile) {
  try {
    return new Set(JSON.parse(fs.readFileSync(stateFile, 'utf8')));
  } catch {
    return new Set();
  }
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const stateFile = invokedSkillsFile(input.session_id ?? 'unknown');
  const invoked = loadInvokedSkills(stateFile);

  if (input.tool_name === 'Skill') {
    const skill = String(input.tool_input?.skill ?? '').split(':').pop();
    if (skill) {
      invoked.add(skill);
      fs.writeFileSync(stateFile, JSON.stringify([...invoked]));
    }
    return;
  }

  const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!filePath) return;

  const relative = path.relative(input.cwd ?? process.cwd(), path.resolve(input.cwd ?? '', filePath));
  if (relative.startsWith('..')) return;

  const missing = skillPathPatterns()
    .filter(({ name, patterns }) => !invoked.has(name) && patterns.some((re) => re.test(relative)))
    .map(({ name }) => name);
  if (!missing.length) return;

  const list = missing.map((name) => `\`${name}\``).join(', ');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `You are editing ${relative}. Invoke the rails-superpowers skill(s) ${list} with the Skill tool and apply their conventions to this change.`,
    },
  }));
}

try {
  main();
} catch {
  // A broken reminder must never block the edit.
}
