# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries are generated from [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) at release time — see [`AGENTS.md`](AGENTS.md). Don't hand-edit past entries; write a well-formed commit message instead.

## [Unreleased]

## [1.2.3] - 2026-09-14

### Changed

- `rails-conventions`: forbid narrative/commit-message-style comments.

## [1.2.2] - 2026-09-09

### Added

- Automate plugin version syncing (`plugin.json`, `marketplace.json`) via an `npm version` hook.

### Changed

- `rails-rspec-testing`: forbid testing private methods via `send`.

### Fixed

- `rails-rspec-testing`: recommend clean factories over mutating existing records in specs, so `build_stubbed` stays usable and context can't leak between examples.

[Unreleased]: https://github.com/railslove/rails-superpowers/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/railslove/rails-superpowers/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/railslove/rails-superpowers/releases/tag/v1.2.2
