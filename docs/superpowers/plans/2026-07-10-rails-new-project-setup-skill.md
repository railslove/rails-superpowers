# rails-new-project-setup Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new Claude Code skill, `rails-new-project-setup`, that bootstraps a fresh Rails app (or aligns an existing one) with Railslove's house gems, `.rubocop.yml`, and CI workflow — closing the gap where the other 7 skills assume tooling (FactoryBot, ViewComponent, rubocop) that nothing currently installs.

**Architecture:** A single skill directory `skills/rails-new-project-setup/` with `SKILL.md` (frontmatter + checklist/decision logic, matching the style of the other 7 skills) and a `templates/` subdirectory holding two literal, copyable files (`rubocop.yml`, `ci.yml`) so the house config isn't transcribed through prose.

**Tech Stack:** Markdown (SKILL.md), YAML (rubocop.yml, ci.yml/GitHub Actions). No Ruby/JS code — this is a documentation-and-templates skill like the other 7 in this repo.

## Global Constraints

- Skill directory name must be `rails-new-project-setup`, matching the `name:` frontmatter field exactly (Claude Code/OpenCode both require directory name == frontmatter `name`).
- `description:` frontmatter must include the trigger phrases from the spec verbatim: "new Rails app", "rails new", "set up this project", "scaffold a new app", "align with our conventions", "add CI".
- Gemfile checklist gems, exactly per spec — no Bullet, no Brakeman/bundler-audit, no importmap-rails, no Sidekiq: `view_component` (main), `lookbook` (`:development`), `standard` + `rubocop-rails` (`:development, :test`), `factory_bot_rails` (`:development, :test`), `rspec-rails` (`:development, :test`), `rspec_junit_formatter` (`:test`), `capybara` + `cuprite` (`:development, :test`).
- `templates/rubocop.yml` must NOT contain `inherit_from: .rubocop_todo.yml`, must NOT contain `TargetRubyVersion:`, must NOT contain a `.haml` exclude line (all present in the Railslove reference but excluded per spec for a template with no assumptions baked in).
- `templates/ci.yml` `scan_js` job must be documented as conditional on `importmap-rails` presence; `test` job's system-specs step must use headless Chromium (Cuprite), not Selenium.
- All YAML template files must parse cleanly with Ruby's stdlib `YAML.load_file`.

---

### Task 1: Scaffold skill directory and write SKILL.md

**Files:**
- Create: `skills/rails-new-project-setup/SKILL.md`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `skills/rails-new-project-setup/SKILL.md` — referenced by Task 2/3 (the templates it points to) and Task 4 (README row references this skill's name/description)

- [ ] **Step 1: Check existing skill frontmatter style for consistency**

Run: `head -5 skills/rails-conventions/SKILL.md`
Expected output:
```
---
name: rails-conventions
description: Use before any commit or PR, and right after editing any Ruby file, to check general project hygiene — rubocop clean, no debug leftovers, tests green, reversible migrations. Triggers on "commit", "PR", "pull request", "ready to merge", "done with this", or any change to a .rb file. Always invoke before telling the user a Ruby change is finished.
---
```
Confirms frontmatter has only `name` and `description` (no other keys) — Task 1's SKILL.md must match this shape.

- [ ] **Step 2: Write skills/rails-new-project-setup/SKILL.md**

```markdown
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
   - Missing → copy `templates/rubocop.yml` in verbatim, then set its `TargetRubyVersion` to match the project's `.ruby-version` file.
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
```

- [ ] **Step 3: Validate frontmatter parses and name matches directory**

Run:
```bash
ruby -ryaml -e '
content = File.read("skills/rails-new-project-setup/SKILL.md")
fm = content.split("---")[1]
data = YAML.safe_load(fm)
raise "name mismatch" unless data["name"] == "rails-new-project-setup"
raise "description too long" if data["description"].length > 1024
puts "frontmatter OK: name=#{data["name"]}, description length=#{data["description"].length}"
'
```
Expected output: `frontmatter OK: name=rails-new-project-setup, description length=<some number under 1024>`

- [ ] **Step 4: Commit**

```bash
git add skills/rails-new-project-setup/SKILL.md
git commit -m "Add rails-new-project-setup skill checklist"
```

---

### Task 2: Add templates/rubocop.yml

**Files:**
- Create: `skills/rails-new-project-setup/templates/rubocop.yml`

**Interfaces:**
- Consumes: nothing new (sibling to Task 1's SKILL.md, which references this path as `templates/rubocop.yml`)
- Produces: `skills/rails-new-project-setup/templates/rubocop.yml` — copied verbatim per SKILL.md Step "Config Files" item 1

- [ ] **Step 1: Write skills/rails-new-project-setup/templates/rubocop.yml**

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

- [ ] **Step 2: Validate YAML parses and forbidden keys are absent**

Run:
```bash
ruby -ryaml -e '
data = YAML.load_file("skills/rails-new-project-setup/templates/rubocop.yml")
raise "must not contain TargetRubyVersion" if data.dig("AllCops", "TargetRubyVersion")
raise "must not contain inherit_from" if data.key?("inherit_from")
haml_excludes = (data.dig("AllCops", "Exclude") || []).grep(/haml/)
raise "must not exclude .haml views" unless haml_excludes.empty?
puts "rubocop.yml OK"
'
```
Expected output: `rubocop.yml OK`

- [ ] **Step 3: Commit**

```bash
git add skills/rails-new-project-setup/templates/rubocop.yml
git commit -m "Add rubocop.yml template for rails-new-project-setup skill"
```

---

### Task 3: Add templates/ci.yml

**Files:**
- Create: `skills/rails-new-project-setup/templates/ci.yml`

**Interfaces:**
- Consumes: nothing new
- Produces: `skills/rails-new-project-setup/templates/ci.yml` — copied verbatim per SKILL.md Step "Config Files" item 2, with `scan_js` job conditionally stripped

- [ ] **Step 1: Write skills/rails-new-project-setup/templates/ci.yml**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [ main ]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  scan_ruby:
    runs-on: ubuntu-24.04
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Scan for common Rails security vulnerabilities using static analysis
        run: bin/brakeman --no-pager

      - name: Update bundler-audit advisory database
        run: bin/bundler-audit update

      - name: Scan for known security vulnerabilities in gems used
        run: bin/bundler-audit

  # scan_js: only include this job if importmap-rails is in the Gemfile.
  # Remove it entirely for projects using a JS bundler instead.
  scan_js:
    runs-on: ubuntu-24.04
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Scan for security vulnerabilities in JavaScript dependencies
        run: bin/importmap audit

  lint:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    env:
      RUBOCOP_CACHE_ROOT: tmp/rubocop
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Prepare RuboCop cache
        uses: actions/cache@v4
        env:
          DEPENDENCIES_HASH: ${{ hashFiles('.ruby-version', '**/.rubocop.yml', '**/.rubocop_todo.yml', 'Gemfile.lock') }}
        with:
          path: ${{ env.RUBOCOP_CACHE_ROOT }}
          key: rubocop-${{ runner.os }}-${{ env.DEPENDENCIES_HASH }}-${{ github.ref_name == github.event.repository.default_branch && github.run_id || 'default' }}
          restore-keys: |
            rubocop-${{ runner.os }}-${{ env.DEPENDENCIES_HASH }}-

      - name: Lint code for consistent style
        run: bin/rubocop -f github

  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: read
      checks: write
    strategy:
      fail-fast: false
      matrix:
        suite: [unit, system]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd "pg_isready -U postgres" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - name: Install packages
        run: sudo apt-get update && sudo apt-get install --no-install-recommends -y libvips

      - name: Install headless Chromium for Cuprite system specs
        if: matrix.suite == 'system'
        run: sudo apt-get install --no-install-recommends -y chromium

      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Run unit/request/view specs
        if: matrix.suite == 'unit'
        env:
          RAILS_ENV: test
        run: |
          bin/rails db:test:prepare
          bundle exec rspec --exclude-pattern "spec/system/**/*_spec.rb" --format progress --format RspecJunitFormatter --out tmp/rspec_junit/unit.xml

      - name: Smoke-test the asset pipeline
        if: matrix.suite == 'unit'
        env:
          RAILS_ENV: test
        run: bin/rails assets:precompile

      - name: Run system specs
        if: matrix.suite == 'system'
        env:
          RAILS_ENV: test
        run: |
          bin/rails db:test:prepare
          bundle exec rspec spec/system --format progress --format RspecJunitFormatter --out tmp/rspec_junit/system.xml

      - name: Keep screenshots from failed system tests
        uses: actions/upload-artifact@v4
        if: failure() && matrix.suite == 'system'
        with:
          name: screenshots
          path: ${{ github.workspace }}/tmp/screenshots
          if-no-files-found: ignore

      - name: Publish test results
        uses: mikepenz/action-junit-report@v4
        if: always()
        with:
          report_paths: "tmp/rspec_junit/*.xml"
          check_name: "RSpec Results (${{ matrix.suite }})"

  db-schema-check:
    runs-on: ubuntu-24.04
    timeout-minutes: 10

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: --health-cmd "pg_isready -U postgres" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true

      - name: Replay all migrations against a fresh database
        env:
          RAILS_ENV: test
        run: |
          bin/rails db:create
          bin/rails db:migrate

      - name: Fail if db/schema.rb doesn't match what the migrations produced
        run: git diff --exit-code db/schema.rb
```

- [ ] **Step 2: Validate YAML parses and Selenium is absent**

Run:
```bash
ruby -ryaml -e '
content = File.read("skills/rails-new-project-setup/templates/ci.yml")
raise "must not reference selenium" if content.downcase.include?("selenium")
raise "must reference chromium for cuprite" unless content.include?("chromium")
data = YAML.load_file("skills/rails-new-project-setup/templates/ci.yml")
raise "missing scan_js job" unless data["jobs"].key?("scan_js")
raise "missing test job" unless data["jobs"].key?("test")
puts "ci.yml OK: #{data["jobs"].keys.join(", ")}"
'
```
Expected output: `ci.yml OK: scan_ruby, scan_js, lint, test, db-schema-check`

- [ ] **Step 3: Commit**

```bash
git add skills/rails-new-project-setup/templates/ci.yml
git commit -m "Add CI workflow template for rails-new-project-setup skill"
```

---

### Task 4: Update README with the new skill

**Files:**
- Modify: `README.md` (skills table)

**Interfaces:**
- Consumes: `skills/rails-new-project-setup/SKILL.md`'s `name` and one-line purpose (from Task 1)
- Produces: nothing consumed by later tasks (last task)

- [ ] **Step 1: Add a row to the Skills table in README.md**

Find this block in `README.md`:
```markdown
| `rails-view-components` | ViewComponent structure, partial vs. component, Hotwire (Turbo/Stimulus) |

Each skill auto-triggers on relevant file changes (e.g. `app/models/**` invokes `rails-active-record`) so conventions get applied without remembering to ask.
```

Replace with:
```markdown
| `rails-view-components` | ViewComponent structure, partial vs. component, Hotwire (Turbo/Stimulus) |
| `rails-new-project-setup` | Bootstraps a new Rails app (or aligns an existing one) with house gems, `.rubocop.yml`, and CI workflow |

Each skill auto-triggers on relevant file changes (e.g. `app/models/**` invokes `rails-active-record`) so conventions get applied without remembering to ask. `rails-new-project-setup` instead triggers on project bootstrap moments — "new Rails app", "set up this project", "align with our conventions" — since there's no file change to key off yet.
```

- [ ] **Step 2: Verify the table still renders as valid markdown**

Run: `grep -A2 "rails-new-project-setup" README.md`
Expected output: shows the new table row followed by the updated trailing paragraph, with matching `|` column counts to the rows above it.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document rails-new-project-setup skill in README"
```
