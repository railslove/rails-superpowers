---
name: rails-view-components
description: Use when building or reviewing view-layer code with ViewComponent, deciding whether markup belongs in a partial or a component, or working with Hotwire (Turbo/Stimulus) frontend behavior. Triggers on "ViewComponent", "partial", "Turbo Frame", "Turbo Stream", "Stimulus controller", or any change to app/components/ or app/views/. Always invoke before adding a new partial or component.
---

# Rails View Layer Conventions (ViewComponent + Hotwire)

ViewComponent is this codebase's standard for reusable view logic — not plain ERB partials, not Phlex.

## Partial vs. Component

| Use a **partial** for                          | Use a **ViewComponent** for                                  |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Static markup with no Ruby logic beyond `each`  | Anything with conditional rendering, formatting, or state      |
| One-off markup used in a single view            | Markup reused across 2+ views, or that needs a dedicated spec  |

If a partial grows a helper method to format its data, or gets reused a second time, promote it to a component.

## Structure

```ruby
# app/components/user_badge_component.rb
# frozen_string_literal: true

class UserBadgeComponent < ViewComponent::Base
  def initialize(user:, size: :medium)
    @user = user
    @size = size
  end

  private

  attr_reader :user, :size
end
```

```erb
<%# app/components/user_badge_component.html.erb %>
<span class="badge badge--<%= size %>"><%= user.nickname %></span>
```

Rules:

- **All params in `initialize`**, mirroring the `rails-service-objects` convention — no logic split between constructor and template.
- **`private attr_reader`** for anything only used internally; leave public only what the template needs.
- **One component = one concern.** If a component renders two unrelated pieces of UI, split it.
- **Sidecar directory** (`component_name/component_name.html.erb`) once a component grows a preview, JS, or CSS file alongside it; single file is fine for simple components.
- Every component gets a **preview class** in `test/components/previews/` (or `spec/components/previews/`) for non-trivial states (empty, error, long content).

## Hotwire (Turbo + Stimulus)

- **Turbo Frames** scope a page update to one region — use for independent, replaceable sections (a form, a list row).
- **Turbo Streams** broadcast multi-element updates (e.g. after a background job finishes) — use for anything triggered outside the current request/response cycle.
- **Stimulus controllers** hold DOM-interaction JS only. Business logic (validation, calculations) that could live server-side, does — Stimulus is for UI wiring (toggling, drag state, debounced input), not a second place for domain rules.
- Naming: Stimulus controller `identifier` matches its file name (`data-controller="user-badge"` ↔ `user_badge_controller.js`).

## Reviewing Existing View Code

1. **Partial with a helper method or reused in 2+ places?** → promote to a component.
2. **Component initializer args split across `initialize` and template locals?** → consolidate into `initialize`.
3. **Component rendering multiple unrelated UI concerns?** → split.
4. **Stimulus controller containing domain/business logic?** → move server-side, keep controller to DOM wiring.
5. **Non-trivial component missing a preview class?** → add one.
