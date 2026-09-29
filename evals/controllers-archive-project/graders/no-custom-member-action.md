---
type: regex
target: { source: file, path: config/routes.rb }
pattern: '(member\s+do|(get|post|patch|put)\s+:archive\b|on:\s*:member)'
match: not_contains
---
