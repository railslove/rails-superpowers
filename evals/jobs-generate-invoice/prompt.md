---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Edit, Write]
---

Completing an order takes about 8 seconds because the invoice PDF is generated inside the request. Move invoice generation into a background job at app/jobs/generate_invoice_job.rb. Don't run any commands, just make the code change.
