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

Each skill auto-triggers on relevant file changes (e.g. `app/models/**` invokes `rails-active-record`) so conventions get applied without remembering to ask. `rails-new-project-setup` instead triggers on project bootstrap moments — "new Rails app", "set up this project", "align with our conventions" — since there's no file change to key off yet.

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

## License

MIT
