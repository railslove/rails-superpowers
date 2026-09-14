# Agent instructions — rails-superpowers

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for every commit in this repo: `type(scope): description`, lowercase, imperative mood, no trailing period.

The release script (`scripts/sync-plugin-version.mjs`) greps commit subjects since the last tag to build each `CHANGELOG.md` entry automatically. A subject that doesn't follow this grammar is silently skipped and its change never reaches the changelog.

| Type | Changelog section |
|---|---|
| `feat` | Added |
| `fix` | Fixed |
| `perf`, `refactor`, `docs`, `revert` | Changed |
| `chore`, `style`, `test`, `ci`, `build` | *(internal — not release-noted)* |

Scope is the skill or area touched: `feat(rails-rspec-testing): ...`, `docs(rails-conventions): ...`. For a breaking change, append `!` (`fix!: ...`) — it's forced into Changed and prefixed `**BREAKING:**`.

See [`README.md`](README.md#releasing) for the full release flow.
