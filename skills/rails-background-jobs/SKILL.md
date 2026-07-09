---
name: rails-background-jobs
description: Use when writing or reviewing an ActiveJob/Sidekiq background job, enqueuing a job with arguments, or deciding what logic belongs in a job versus a service. Triggers on "background job", "ActiveJob", "Sidekiq", "perform_later", "perform_async", or any change to app/jobs/. Always invoke before touching a file in app/jobs/.
---

# Rails Background Job Conventions

A job's body is a thin adapter: fetch records by ID, delegate to a service, done. No business logic lives in the job class itself.

## Jobs Delegate to Services

```ruby
# Wrong — business logic inline in the job
class SendWeeklyDigestJob < ApplicationJob
  def perform(user_id)
    user = User.find(user_id)
    return if user.unsubscribed?
    posts = Post.published.where("created_at > ?", 1.week.ago)
    DigestMailer.weekly(user, posts).deliver_now
  end
end

# Right — job fetches nothing but the id, service does the work
class SendWeeklyDigestJob < ApplicationJob
  def perform(user_id)
    SendWeeklyDigest.call(user_id: user_id)
  end
end
```

See `rails-service-objects` for the service's own structure and error handling.

## Pass IDs, Not Objects

Job arguments must be primitives (IDs, strings, numbers) or `GlobalID`-backed records — never pass a serialized ActiveRecord object as-is beyond what `ActiveJob` already supports via GlobalID. Re-fetch inside `perform`:

```ruby
# Wrong — stale object risk, larger queue payload
SendWeeklyDigestJob.perform_later(user)

# Right — re-fetched fresh at execution time
SendWeeklyDigestJob.perform_later(user.id)
```

This avoids acting on stale data if the record changed between enqueue and execution.

## Idempotency Is Required

Jobs run **at least once** — retries, redeploys, and Sidekiq's own retry mechanism can execute a job more than once with the same arguments. Every job must be safe to run twice with no bad side effect.

```ruby
# Wrong — running twice double-charges
class ChargeOrderJob < ApplicationJob
  def perform(order_id)
    ChargeOrder.call(order_id: order_id)
  end
end

# Right — service itself guards against double-processing
class ChargeOrder
  def call
    return if order.charged?
    # ... charge and mark order.charged_at
  end
end
```

The idempotency check belongs in the **service**, not the job — that way it also protects direct/synchronous callers. If the job has no service yet (business logic still inline), extracting to a service is step one; add the guard there, not as a patch on the job.

## One Job = One Action

Same single-responsibility rule as service objects: one job performs one action. Don't add a second unrelated task "while we're in there" (e.g. sending an email *and* updating analytics in the same job) — enqueue two jobs, or have one service publish an event that triggers both.

## Reviewing Existing Jobs

1. **Any query, conditional, or external call beyond fetching the record and calling one service?** → extract to a service.
2. **Job argument is a serialized object rather than an ID?** → change to ID, re-fetch in `perform`.
3. **Would running this job twice with the same args cause a bad side effect (double charge, duplicate email)?** → add an idempotency guard in the service.
4. **Job performing more than one distinct action?** → split into separate jobs.
