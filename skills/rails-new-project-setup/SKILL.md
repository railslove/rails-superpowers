---
name: rails-new-project-setup
description: Use when scaffolding a new Rails app or aligning an existing one with Railslove house conventions — gems, .rubocop.yml, CI workflow. Triggers on "new Rails app", "rails new", "set up this project", "scaffold a new app", "align with our conventions", "add CI", or a Gemfile missing house-standard gems. Always invoke before treating a fresh Rails project as ready for feature work.
---

# Rails New Project Setup

Bootstraps a fresh Rails app — or aligns an existing one — with the gems and config the other rails-superpowers skills assume are present. One procedure serves both cases: detect what's already there, only act on what's missing.

## Gemfile Checklist

Read the `Gemfile`. For each row below, skip if already present; otherwise add via `bundle add <gem> --group <group>` (omit `--group` if the Gemfile has no `:development`/`:test` groups defined).

| Gem | Group | Why |
|---|---|---|
| `view_component` | main | `rails-view-components` — standard for reusable view logic |
| `lookbook` | `:development` | ViewComponent previews UI |
| `standard` + `rubocop-rails` | `:development, :test` | house rubocop preset (Rails 8 default is `rubocop-rails-omakase`; house style overrides with `standard` run via rubocop) |
| `factory_bot_rails` | `:development, :test` | `rails-rspec-testing` — no fixtures |
| `rspec-rails` | `:development, :test` | base test framework |
| `rspec_junit_formatter` | `:test` | CI needs JUnit XML for report annotations |
| `capybara` + `cuprite` | `:development, :test` | headless system specs via CDP — replaces default `selenium-webdriver` |

**Explicitly not added** (do not add these even if asked to "add all the standard gems"):
- **Bullet** — left to individual developer preference.
- **Brakeman / bundler-audit** — Rails 8 ships these by default; only verify they weren't stripped, never add them fresh.
- **importmap-rails** — no house default; JS bundler choice stays flexible per project.
- **Sidekiq** — no house default; Rails 8's Solid Queue is the ActiveJob backend.

## Config Files

1. Check `.rubocop.yml` exists at the project root.
   - Missing → copy `templates/rubocop.yml` in verbatim, then add a `TargetRubyVersion:` key under `AllCops` set to the version in the project's `.ruby-version` file.
   - Present → leave untouched. Report the diff between the existing file and `templates/rubocop.yml` to the user instead of overwriting. Do not silently switch cop presets (e.g. if the project already uses `rubocop-rails-omakase`, flag the conflict — don't replace it with `standard`).
2. Check `.github/workflows/ci.yml` exists.
   - Missing → copy `templates/ci.yml` in verbatim. Remove the `scan_js` job unless `importmap-rails` is present in the Gemfile.
   - Present → leave untouched, flag the diff to the user.

## After Gemfile Changes

Run `bundle install`, then `bin/rubocop` once (create the `bin/rubocop` binstub via `bundle binstubs rubocop` first if missing) to surface any immediate offenses. Do not auto-fix — that's `rails-conventions`' job, not this skill's.

## Summary Report

After running the checklist, report to the user in three groups: what was added, what was already present and skipped, and what was flagged as a conflict needing their decision.

## Edge Cases

- No `Gemfile` at the project root → stop immediately and tell the user this isn't a Rails project root. Do not create one.
- `.rubocop.yml` exists but conflicts with house config → flag for the user, never silently overwrite.
- Gemfile has no `:development`/`:test` groups → fall back to plain `bundle add <gem>` with no `--group` flag.
