# rails-new-project-setup skill — design

## Purpose

The other 7 skills in this plugin are advisory conventions Claude follows while writing or reviewing Rails code. None of them bootstrap a project: nothing installs the gems, rubocop config, or CI workflow those conventions assume (e.g. `rails-active-record` assumes Bullet is available, `rails-rspec-testing` assumes FactoryBot, `rails-conventions` assumes `bin/rubocop` exists). This skill closes that gap: it sets up a fresh Rails app — or brings an existing one into line — with the gems and config the other skills expect.

## Trigger

```yaml
name: rails-new-project-setup
description: Use when scaffolding a new Rails app or aligning an existing one with Railslove house conventions — gems, .rubocop.yml, CI workflow. Triggers on "new Rails app", "rails new", "set up this project", "scaffold a new app", "align with our conventions", "add CI", or a Gemfile missing house-standard gems. Always invoke before treating a fresh Rails project as ready for feature work.
```

One skill serves both new-app and retrofit cases: the checklist detects what's already present and only acts on what's missing (see Detection logic below), so a brand-new `rails new` app and an existing repo getting aligned go through the same procedure.

## File layout

```
skills/rails-new-project-setup/
  SKILL.md
  templates/
    rubocop.yml
    ci.yml
```

`SKILL.md` holds the checklist/decision logic. `templates/` holds the literal house files this skill copies in, so they don't get transcribed through prose and drift from the real Railslove reference configs.

## Gemfile checklist

| Gem | Group | Why |
|---|---|---|
| `view_component` | main | `rails-view-components` — standard for reusable view logic |
| `lookbook` | `:development` | ViewComponent previews UI |
| `standard` + `rubocop-rails` | `:development, :test` | house rubocop preset (Rails 8 default is `rubocop-rails-omakase`; house style overrides with `standard` run via rubocop) |
| `factory_bot_rails` | `:development, :test` | `rails-rspec-testing` — no fixtures |
| `rspec-rails` | `:development, :test` | base test framework |
| `rspec_junit_formatter` | `:test` | CI needs JUnit XML for report annotations |
| `capybara` + `cuprite` | `:development, :test` | headless system specs via CDP — replaces default `selenium-webdriver` |

Explicitly out of scope, decided during design:
- **Bullet** — left to individual developer preference, not part of setup.
- **Brakeman / bundler-audit** — Rails 8 ships these by default; the checklist verifies they weren't stripped rather than adding them.
- **importmap-rails** — no house default; JS bundler choice stays flexible per project.
- **Sidekiq** — no house default; Rails 8's Solid Queue is the ActiveJob backend, nothing to add.

## Templates

### `templates/rubocop.yml`

Based on the Railslove reference (`railslove/nettowelt-backoffice/.rubocop.yml`), adapted for a fresh project:

```yaml
require:
  - standard

plugins:
  - rubocop-rails

inherit_gem:
  standard: config/base.yml

inherit_mode:
  merge:
    - Exclude

AllCops:
  SuggestExtensions: false
  Exclude:
    - db/**/*
    - bin/*
    - tmp/**/*
    - vendor/**/*
    - lib/tasks/**/*
  NewCops: disable

Layout/EmptyLineAfterGuardClause:
  Enabled: true

Rails/UnknownEnv:
  Environments:
    - production
    - development
    - test
```

Differences from the reference: no `inherit_from: .rubocop_todo.yml` (no todo file exists yet on a fresh project — retrofit mode adds this line back only if `rubocop --auto-gen-config` was run), no `TargetRubyVersion` pin (the skill sets it to whatever `.ruby-version` reports instead of hardcoding), no `.haml` view exclude (don't assume a template engine).

### `templates/ci.yml`

Based on the Railslove reference (`railslove/nettowelt-backoffice/.github/workflows/ci.yml`), same 5-job shape (`scan_ruby`, `scan_js`, `lint`, `test`, `db-schema-check`), with two adaptations:
- `scan_js` (importmap audit) job is conditional — only included if `importmap-rails` is present in the Gemfile, since that's not a house default.
- `test` job's system-specs step swaps Selenium for headless Chromium (Cuprite driver) — add an `apt-get install chromium` step, no `selenium-webdriver` gem needed.

## Detection logic (new-app and retrofit share this)

1. Read `Gemfile` — for each house gem in the table above, skip if already present, otherwise add via `bundle add <gem> --group ...`.
2. Check `.rubocop.yml` exists — if missing, copy the template; if present, leave untouched and flag the diff to the user instead of overwriting.
3. Check `.github/workflows/ci.yml` exists — same leave-and-flag rule if present.
4. After Gemfile changes: run `bundle install`, then `bin/rubocop` once to surface any immediate offenses (not auto-fix — that's `rails-conventions`' job).
5. Report a summary of what was added, what was skipped (already present), and what was flagged (conflicting existing config).

## Edge cases

- No `Gemfile` at all (not a Rails app) → stop, tell the user this isn't a Rails project root.
- `.rubocop.yml` exists but conflicts with house config (e.g. already uses `rubocop-rails-omakase`) → flag as a conflict for the user to resolve, don't silently switch cop presets.
- Gemfile has no `:development`/`:test` groups defined → fall back to plain `bundle add` without `--group`.

## Out of scope

- Auto-fixing rubocop offenses found during setup (handled by `rails-conventions` afterward).
- Deciding project-specific infrastructure (database adapter, deploy target, JS bundler) — those stay project decisions, not house defaults.
