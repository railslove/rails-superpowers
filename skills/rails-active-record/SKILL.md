---
name: rails-active-record
description: Use when writing or reviewing ActiveRecord models, adding callbacks, fixing N+1 queries, extracting shared model behavior into concerns, or implementing soft deletion. Triggers on "N+1", "includes", "preload", "callback", "before_save", "after_commit", "concern", "default_scope", "soft delete", "discard", or any change to app/models/. Always invoke before touching a file in app/models/.
---

# Rails ActiveRecord Conventions

Models persist and validate data. Business logic, cross-model side effects, and query optimization live elsewhere.

## No Business Logic in Models

Models hold persistence, validations, associations, and simple derived attributes. Anything else — external API calls, sending emails, multi-model orchestration — belongs in a service object.

| Wrong                                          | Right                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| `user.register!` sends welcome email internally | `RegisterUser.call` sends the email, model just saves |
| `Order#charge_card` calls the payment gateway    | `ChargeOrder.call` calls the gateway                  |

Rule of thumb: if a model method's implementation needs to know about a *different* domain concept (payments, mailers, external APIs), it doesn't belong on the model.

## Non-Database-Backed Models Are Fine

Not every model needs a table. When data has validations, attributes, and a natural name but no persistence (a multi-step form, an API request payload, a search filter set), model it with `ActiveModel::Model` / `ActiveModel::Attributes` instead of bolting attributes onto a controller or stretching an AR model to cover a shape it doesn't persist.

```ruby
# app/models/contact_form.rb
# frozen_string_literal: true

class ContactForm
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :name, :string
  attribute :email, :string
  attribute :message, :string

  validates :name, :email, :message, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
end
```

This gets you the same validation/error API as an ActiveRecord model (`valid?`, `errors`, form builder compatibility) without a migration. Don't reach for a hash and manual checks in a controller or service just because the data isn't going in a table.

## Callbacks: Normalization Only

Callbacks are allowed **only** for in-model data normalization — no cross-model or external effects.

```ruby
# Right — pure data normalization, no side effects
before_validation { self.email = email.strip.downcase if email }

# Wrong — side effect (external call, other models) hidden in a callback
after_create { NotifyMailer.welcome(self).deliver_later }
after_commit { Analytics.track("user_created", user: self) }
```

For side effects (notifications, analytics, syncing other models), publish an event instead of hooking a callback:

```ruby
# app/models/user.rb
after_create { ActiveSupport::Notifications.instrument("user.created", user_id: id) }

# app/subscribers/user_created_subscriber.rb (or an initializer)
ActiveSupport::Notifications.subscribe("user.created") do |*, payload|
  SendWelcomeEmail.call(user_id: payload[:user_id])
end
```

This keeps the model ignorant of *who* reacts to the event — subscribers can be added or removed without touching the model.

## Fixing N+1 Queries

Three approved tools, in order of preference:

1. **`includes`/`preload` at the call site** — the controller (or service) knows what it needs to render/return:
   ```ruby
   @posts = Post.includes(:author, :comments).where(published: true)
   ```
2. **Named scopes on the model** for reusable eager-loading combined with filtering:
   ```ruby
   scope :with_comments, -> { includes(:comments) }
   ```
3. **Query objects** when the query is complex enough to need its own tests (multiple joins, conditional filters, reporting queries):
   ```ruby
   # app/queries/published_posts_query.rb
   # frozen_string_literal: true

   class PublishedPostsQuery
     def self.call(...) = new(...).call

     def initialize(author: nil)
       @author = author
     end

     def call
       scope = Post.includes(:author, :comments).where(published: true)
       scope = scope.where(author: author) if author
       scope
     end

     private

     attr_reader :author
   end
   ```

Never eager-load "just in case" — every `includes` should map to an actual access pattern used later. Use the Bullet gem in development to catch missed cases; don't rely on manual review alone.

## Never Change `default_scope`

Don't touch `default_scope` on a model. It applies silently to every query against the model — including joins, associations, and `unscoped` callers who forgot to say so — and it's the source of some of the worst Rails footguns: records that mysteriously vanish from `count`, associations that silently exclude rows, admin screens that can't find "deleted" data without `.unscoped`.

The classic anti-pattern this rule exists to kill:

```ruby
# Wrong — soft deletion via default_scope
class User < ApplicationRecord
  default_scope { where(deleted_at: nil) }
end
```

This looks convenient, then breaks joins (`Company.joins(:users)` silently drops companies whose only users are soft-deleted), breaks `validates :email, uniqueness: true` (uniqueness checks run against the scoped table, so a "deleted" email blocks a new signup), and forces every legitimate "show deleted records" code path to remember `.unscoped`, which is easy to forget and hard to grep for.

If a model needs a default filter, use an explicit named scope instead and require callers to opt in:

```ruby
scope :active, -> { where(deleted_at: nil) }
```

## Soft Deletion: Use the `discard` Gem

Don't hand-roll soft deletion (a `deleted_at` column plus a `default_scope`, or a `deleted` boolean plus ad-hoc `where` clauses scattered across the app). Use the [`discard`](https://github.com/jhawthorn/discard) gem.

```ruby
# Gemfile
gem "discard", "~> 1.4"

# app/models/user.rb
class User < ApplicationRecord
  include Discard::Model
end
```

```ruby
user.discard          # sets discarded_at, does not delete the row
user.discarded?       # true
user.undiscard        # clears discarded_at

User.kept             # where(discarded_at: nil) — the default query scope in views/controllers
User.discarded         # where.not(discarded_at: nil)
User.with_discarded    # everything, explicit opt-in
```

Why this over hand-rolled soft delete:

- No `default_scope` — `kept`/`discarded`/`with_discarded` are explicit scopes, so every call site says what it means instead of relying on implicit global filtering.
- Associations that need to exclude discarded records declare it explicitly (`has_many :comments, -> { kept }`), rather than inheriting a silent global filter.
- Migration is a single `discarded_at:datetime` column (`rails g migration AddDiscardedAtToUsers discarded_at:datetime:index`).

## Concerns: Shared Behavior Only

A `Concern` module is for behavior **shared across multiple models**. If only one model uses it, it's just an unextracted chunk of that model — inline it instead.

```ruby
# Right — Sluggable is mixed into Post, Category, and Page
module Sluggable
  extend ActiveSupport::Concern
  included { before_validation :generate_slug }
  ...
end

# Wrong — a concern that exists only to shrink one model's file
module UserHelperMethods # only User includes this
  ...
end
```

## Validation Conventions

- Prefer built-in validators (`presence`, `uniqueness`, `format`, `numericality`) over custom code.
- Custom validators live in `app/validators/`, named `<Thing>Validator`, subclassing `ActiveModel::EachValidator`.
- Error messages go through i18n (`config/locales/*.yml`), never hardcoded strings in the validator or model — this matches how the existing `rails-service-objects` skill expects error messages to surface to callers/users.

## Reviewing Existing Models

1. **Any method calling out to mailers, external APIs, or other domains?** → extract to a service.
2. **Any callback with a side effect beyond normalizing an attribute?** → replace with `ActiveSupport::Notifications` or move the call into the service that mutates the record.
3. **Any `includes`/`preload` missing where an association is accessed in a loop?** → N+1.
4. **Any concern included by exactly one model?** → inline it.
5. **Any hardcoded error string in a validator?** → move to i18n.
6. **Any `default_scope` on the model?** → remove it, replace with an explicit named scope.
7. **Any hand-rolled soft deletion (`deleted_at`/`deleted` column with manual `where` clauses)?** → replace with the `discard` gem.
