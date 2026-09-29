---
type: regex
target: { source: file, path: spec/models/subscription_spec.rb }
pattern: '(Timecop|Time\.now|sleep\b)'
match: not_contains
---
