---
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Edit, Write]
---

UsersController#create has grown to do everything at signup and it's impossible to test. Pull that logic out of the controller. Don't run any commands, just make the code change.
