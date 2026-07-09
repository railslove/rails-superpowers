---
name: rails-rspec-testing
description: Use when writing or reviewing RSpec specs, choosing between request/system/unit specs, mocking a dependency, or dealing with a flaky or time-dependent test. Triggers on "RSpec", "flaky test", "spec fails intermittently", "mock", "stub", "Timecop", "travel_to", or any file under spec/. Always invoke before writing a new spec file.
---

# Rails RSpec Conventions

RSpec is the standard test framework here (not Minitest). These rules exist to keep specs deterministic and meaningful, not just green.

## No Time-Based Flakiness

Never rely on real wall-clock time in code under test or in the spec itself. Use `ActiveSupport::Testing::TimeHelpers` (`travel_to`, `freeze_time`) — never `sleep`, and never assert against a freshly-computed `Time.current` in the same line the code under test also computes it.

```ruby
# Wrong — flaky, depends on how fast the test runs
it "expires after 1 hour" do
  token = GenerateLoginCode.call
  expect(token.expires_at).to eq(Time.current + 1.hour)
end

# Right — time frozen for the whole example
it "expires after 1 hour" do
  freeze_time do
    token = GenerateLoginCode.call
    expect(token.expires_at).to eq(Time.current + 1.hour)
  end
end
```

## Mock Only External Services

Stub/mock third-party boundaries (payment gateways, external APIs, mailers' delivery). Never mock your own app's models or service objects — that tests your mocks, not your code, and hides real integration breakage.

```ruby
# Wrong — mocking your own service hides real bugs
allow(RegisterUser).to receive(:call).and_return(user)

# Right — mock only the external boundary
allow(StripeClient).to receive(:charge).and_return(success_response)
```

If setting up real collaborators is painful, that's a signal the collaborator needs a better factory or the code needs restructuring — not a signal to mock it away.

## Request vs. System vs. Unit Specs

| Spec type   | Use for                                                              |
| ----------- | --------------------------------------------------------------------- |
| Unit        | Service objects, models, query objects, jobs — the default, fastest |
| Request     | Controller behavior: status codes, redirects, JSON shape             |
| System      | A full user flow through the browser (JS, multiple pages) — expensive, use sparingly |

Default to unit specs for anything with a `.call`. Reach for a request spec only to verify the controller wiring (params → service → response), not to re-test the service's branches — those belong in the service's own unit spec, per `rails-service-objects`. Reach for a system spec only when the behavior genuinely spans multiple pages or requires JS (Turbo/Stimulus interaction) — not as a default "test it end-to-end" habit.

## FactoryBot

- No default associations on a factory unless every use needs them — build associations explicitly per example via traits, so a spec's setup states what it actually depends on.
- Traits over conditional factory logic (`trait :admin { role { "admin" } }`, not an `if` inside the factory block).
- No fixtures — FactoryBot only.

## Reviewing Existing Specs

1. **Any `sleep`, unwrapped `Time.current`/`Date.today` comparison, or real HTTP call?** → freeze time / use `travel_to` / stub the external client.
2. **Any `allow(...).to receive` on an internal model or service?** → replace with the real collaborator.
3. **Request spec re-testing service branch logic already covered by the service's unit spec?** → trim to wiring-only assertions.
4. **Factory with default associations nobody asked for?** → make them explicit at the call site.
