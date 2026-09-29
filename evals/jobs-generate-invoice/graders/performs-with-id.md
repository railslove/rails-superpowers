---
type: regex
target: { source: file, path: app/jobs/generate_invoice_job.rb }
pattern: 'def perform\((\w+_)?id\b'
---
