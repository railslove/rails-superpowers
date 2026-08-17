---
name: rails-service-objects
description: Conventions for writing, reviewing, and refactoring Ruby on Rails service objects. Use whenever creating a new service object, extracting business logic from a controller into a service, reviewing or auditing code in app/services/, refactoring an existing service, or any time someone mentions "service object", "service class", or "extract to service". Always invoke before touching any file in app/services/.
---

# Rails Service Object Conventions

Service objects encapsulate a single business action. They keep controllers thin and business logic testable in isolation.

## Naming

Names are **verb-first** and describe the action performed:

| Wrong                | Right               |
| -------------------- | ------------------- |
| `UserRegistration`   | `RegisterUser`      |
| `PaymentProcessor`   | `ProcessPayment`    |
| `WelcomeEmailSender` | `SendWelcomeEmail`  |
| `LoginCodeGenerator` | `GenerateLoginCode` |

File name mirrors the class: `RegisterUser` → `app/services/register_user.rb`.

## Structure

```ruby
# frozen_string_literal: true

class RegisterUser
  Error = Class.new(StandardError)

  def self.call(...)
    new(...).call
  end

  def initialize(invitation_token:, nickname:)
    @invitation_token = invitation_token
    @nickname = nickname
  end

  def call
    group = UserGroup.find_by(invitation_token: @invitation_token)
    raise Error, "Ungültiger Einladungs-Token." unless group

    user = group.users.build(nickname: @nickname, login_code: GenerateLoginCode.call)
    raise Error, user.errors.full_messages.first unless user.save

    user
  end

  private

  attr_reader :invitation_token, :nickname
end
```

### Rules

- **All params in `initialize`** — `call` takes no arguments
- **Class-level `.call(...)` delegates to `new(...).call`** — callers write `RegisterUser.call(...)` without two-step construction
- **Single public method** — only `call` (and the class-level convenience) are public
- **`private attr_reader`** for all instance variables
- **`# frozen_string_literal: true`** at the top

## Error Handling

Failures raise — never return `nil`, `false`, or result structs.

Define a nested error constant:

```ruby
Error = Class.new(StandardError)
```

Callers rescue specifically:

```ruby
user = RegisterUser.call(invitation_token: token, nickname: name)
rescue RegisterUser::Error => e
  render json: { error: e.message }, status: :unprocessable_entity
```

Use descriptive messages — they surface directly to callers and often to users.

## Single Responsibility

One service = one action. If a second public method is tempting, or "and" appears in the class name, split into two services.

## Testing

Test via the public `.call` class method. Cover success and all failure paths:

```ruby
RSpec.describe RegisterUser do
  describe ".call" do
    context "with valid params" do
      it "returns the persisted user" do
        user = described_class.call(invitation_token: group.invitation_token, nickname: "wolf")
        expect(user).to be_persisted
      end
    end

    context "with invalid invitation token" do
      it "raises RegisterUser::Error" do
        expect {
          described_class.call(invitation_token: "bad", nickname: "wolf")
        }.to raise_error(RegisterUser::Error, "Ungültiger Einladungs-Token.")
      end
    end
  end
end
```

## Reviewing Existing Service Objects

When reviewing or refactoring, check each item:

1. **Verb-first name?** e.g. `UserRegistration` → `RegisterUser`
2. **Params in `initialize`, `call` takes no args?**
3. **Class-level `.call` convenience method present?**
4. **Single public method?** (only `call`)
5. **Failures raise `ServiceName::Error`, not return nil/false/struct?**
6. **`private attr_reader` for instance variables?**
7. **`# frozen_string_literal: true` present?**
8. **Tests cover success and all failure paths?**

## When to Extract to a Service

Extract from a controller when:

- Action involves multiple model interactions
- Logic needs reuse across controllers or background jobs
- Controller action exceeds ~10 lines of business logic
- The logic is complex enough that testing via request specs would be slow
