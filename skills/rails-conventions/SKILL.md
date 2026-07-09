---
name: rails-conventions
description: Use before any commit or PR, and right after editing any Ruby file, to check general project hygiene — rubocop clean, no debug leftovers, tests green, reversible migrations. Triggers on "commit", "PR", "pull request", "ready to merge", "done with this", or any change to a .rb file. Always invoke before telling the user a Ruby change is finished.
---

# Rails Project Conventions

Baseline hygiene checks that apply across models, controllers, jobs, and services — the stuff that isn't specific to any one layer. Run these before calling a Ruby change done.

## Rubocop Clean

A change isn't finished if it introduces new offenses. Run:

```bash
bin/rubocop
```

If offenses show up in files you touched, try autocorrect first:

```bash
bin/rubocop -a
```

For offenses `-a` can't fix, fix them by hand rather than adding a `# rubocop:disable` comment. A disable comment is only acceptable when the rule is genuinely wrong for that one line (rare) — not as a shortcut to move past a real style violation.

If `bin/rubocop` isn't present, fall back to `bundle exec rubocop`, and mention to the user that the binstub is missing so they can add one.

Only worry about offenses in files you actually changed — don't feel obligated to fix pre-existing offenses in untouched files as a drive-by.

## No Debug Leftovers

Search for anything left behind from debugging before considering a change done:

```bash
git diff --cached -- '*.rb' | grep -nE 'binding\.(pry|irb)|byebug|debugger|^\+.*\bputs\b'
```

`binding.pry`, `byebug`, stray `puts`, and commented-out old code are all signs a change was tested interactively but not cleaned up. Remove them rather than leaving them commented out "just in case."

## Tests Green

Run the specs touching the files you changed (see `rails-rspec-testing` for how to pick the right spec type) before saying a change is complete. Don't rely on having read the code carefully instead of running it — Rails has enough implicit behavior (callbacks, validations, autoloading) that reading isn't a substitute for running.

## Migrations Are Reversible

If the change includes a migration, it must either:
- Use reversible methods only (`add_column`, `add_index`, `create_table`, etc.), or
- Define an explicit `up`/`down` pair if it does anything `change` can't infer (data backfills, irreversible drops).

```ruby
# Wrong — change can't infer how to reverse a data migration
def change
  User.where(status: nil).update_all(status: "active")
end

# Right — explicit up/down
def up
  User.where(status: nil).update_all(status: "active")
end

def down
  # no-op: reversing this would need the prior state, which wasn't recorded
end
```

## Reviewing Before Calling It Done

1. **`bin/rubocop` clean on touched files?**
2. **Any `binding.pry`, `byebug`, or stray `puts` left in the diff?**
3. **Do the relevant specs pass?**
4. **If a migration was added, is it reversible or does it have an explicit `down`?**
