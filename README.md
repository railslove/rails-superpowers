# rails-superpowers

Claude Code plugin: Ruby on Rails skills covering anti-patterns to avoid, patterns to embrace, and Railslove's house conventions where they differ from Rails defaults.

## Install

### Claude Code

1. Add this repo as a marketplace:
   ```
   /plugin marketplace add railslove/rails-superpowers
   ```
2. Install the plugin from it (marketplace name and plugin name are both `rubyonrails-superpowers`):
   ```
   /plugin install rubyonrails-superpowers@rubyonrails-superpowers
   ```
3. Reload, then verify:
   ```
   /reload-plugins
   /plugin list
   ```

To auto-enable this for your whole team without manual steps, add to the project's `.claude/settings.json`:
```json
{
  "extraKnownMarketplaces": {
    "rubyonrails-superpowers": {
      "source": { "source": "github", "repo": "railslove/rails-superpowers" }
    }
  },
  "enabledPlugins": {
    "rubyonrails-superpowers@rubyonrails-superpowers": true
  }
}
```

### OpenCode

Add to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["rails-superpowers@git+https://github.com/railslove/rails-superpowers.git"]
}
```

Restart OpenCode. The plugin installs through OpenCode's plugin manager and registers all skills automatically — no symlinks or manual copying.

Verify by asking: "list your rails skills"

## Skills

| Skill | Covers |
|---|---|
| `rails-active-record` | N+1 queries, `includes`/preload, callbacks, concerns, query objects |
| `rails-background-jobs` | ActiveJob/Sidekiq, idempotency, GlobalID, one-job-one-action |
| `rails-controllers` | Strong params, `before_action`, thin controllers, RESTful actions |
| `rails-conventions` | Pre-commit/PR hygiene — rubocop, tests green, reversible migrations, no debug leftovers |
| `rails-service-objects` | Structure, naming, `.call` convention, error handling, when to extract |
| `rails-rspec-testing` | Request/system/unit specs, mocking, time-based flakiness |
| `rails-view-components` | ViewComponent structure, partial vs. component, Hotwire (Turbo/Stimulus) |
| `rails-new-project-setup` | Bootstraps a new Rails app (or aligns an existing one) with house gems, `.rubocop.yml`, and CI workflow |
| `rails-naming-conventions` | What makes a name good — saying what a thing is/does, avoiding catch-all words like `Manager`/`Helper`, one concept per name |

Each skill auto-triggers on relevant file changes (e.g. `app/models/**` invokes `rails-active-record`) so conventions get applied without remembering to ask. Two mechanisms make this reliable in Claude Code:

- **`paths:` frontmatter** — each skill declares the globs it owns, so Claude loads it when working with matching files, even if the prompt never mentions the layer.
- **`PreToolUse` hook** (`hooks/skill-reminder.mjs`) — before any file edit, it reminds the agent to invoke each skill whose `paths:` match that file and that hasn't been invoked yet this session. It only adds a reminder; it never blocks the edit. The globs are read from the skills' frontmatter, so `paths:` is the single place to change them.

OpenCode doesn't read `paths:` or Claude Code hooks; there, triggering relies on the skill descriptions alone.

`rails-new-project-setup` instead triggers on project bootstrap moments — "new Rails app", "set up this project", "align with our conventions" — since there's no file change to key off yet.

### Using `rails-new-project-setup`

Auto-triggers when Claude detects a bootstrap moment, but you can invoke it explicitly too:

```
Set up this project with our house conventions
```
```
Align this Rails app with our conventions
```
```
rails new myapp --database=postgresql, then set it up
```

What it does, in order:

1. **Gemfile checklist** — reads your `Gemfile` and adds any missing house gems (`view_component`, `lookbook`, `standard`/`rubocop-rails`, `factory_bot_rails`, `rspec-rails`, `rspec_junit_formatter`, `capybara`/`cuprite`) via `bundle add`, skipping anything already present. Deliberately does **not** add Bullet, Brakeman/bundler-audit, importmap-rails, or Sidekiq — see the skill's Gemfile table for why.
2. **Config files** — copies `.rubocop.yml` and `.github/workflows/ci.yml` from its templates if missing. If either already exists, it leaves it untouched and reports the diff instead of overwriting.
3. **Install + lint check** — runs `bundle install` and a one-off `bin/rubocop` pass to surface offenses (it does not auto-fix them; that's `rails-conventions`' job).
4. **Summary report** — tells you what was added, what was already present, and what needs your decision (e.g. a conflicting `.rubocop.yml`).

Requires a `Gemfile` at the project root — it refuses to run (and won't create one) on a non-Rails directory. Full details: [`skills/rails-new-project-setup/SKILL.md`](skills/rails-new-project-setup/SKILL.md).

## Evals

`evals/` holds a [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) suite that measures whether the skills actually fire when an agent writes Rails code, and whether the result follows house conventions. Each case pairs a realistic prompt, which never names a skill, with a small Rails fixture app built by `fixture.sh` (shared skeleton in `evals/_shared/rails_app.sh`). It has two kinds of graders:

- **`*-fired`** (`tool_used: Skill`): did the expected skill trigger? Reported as a with-plugin indicator, not scored against the baseline.
- **Convention checks** (`regex` / `file_exists`): e.g. the job's `perform` takes an ID, the archive action is its own resource rather than a `member` route, the spec uses `travel_to`. Scored in both arms, so `Δ` shows what the plugin changes.

`negative-non-rails` asserts that no `rails-*` skill fires on a non-Rails prompt.

Run the full suite from the repo root:

```
claude plugin eval . --scaffold --allow-tools Edit Write --threshold 0.8
```

`--scaffold` runs the fixture scripts (they only write files into the run's empty workspace), and `Edit`/`Write` let the agent change the fixture, which is what exercises `paths:` and the reminder hook. A full run is 8 cases × 3 runs × 2 arms. While iterating, use `--case <name> --runs 1 --ablation none`. Results land in `evals/results/` (gitignored).

When you change a skill's `description` or `paths:`, re-run the suite and compare the `*-fired` rates before and after.

## Releasing

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`type(scope): description`) — see [`AGENTS.md`](AGENTS.md) for the type-to-changelog mapping. [`CHANGELOG.md`](CHANGELOG.md) is generated from these commit subjects, not hand-edited.

Version numbers live in three places (`package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) and must stay in sync. Don't hand-edit them — bump with:

```
npm version patch   # or: minor | major | <explicit semver>
```

This updates `package.json`, runs `scripts/sync-plugin-version.mjs` to mirror the new version into `plugin.json` and `marketplace.json`, greps the commits since the last tag for a `CHANGELOG.md` entry (failing if none are Conventional Commits — nothing user-facing to release), and commits + tags all four files together. Push both the commit and the tag when ready:

```
git push && git push --tags
```

## License

MIT
