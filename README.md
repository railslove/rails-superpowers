# rails-superpowers

Claude Code plugin: Ruby on Rails skills covering anti-patterns to avoid, patterns to embrace, and Railslove's house conventions where they differ from Rails defaults.

## Install

### Claude Code

Add via a marketplace pointing at this repo's `.claude-plugin/marketplace.json`, then enable the `rubyonrails-superpowers` plugin.

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

Each skill auto-triggers on relevant file changes (e.g. `app/models/**` invokes `rails-active-record`) so conventions get applied without remembering to ask.

## License

MIT
