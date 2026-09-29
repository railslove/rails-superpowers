#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

cat > app/models/subscription.rb <<'RUBY'
class Subscription < ApplicationRecord
  def expired?
    expires_at < Time.current
  end
end
RUBY
mkdir -p spec/factories
cat > spec/factories/subscriptions.rb <<'RUBY'
FactoryBot.define do
  factory :subscription do
    expires_at { 1.month.from_now }
  end
end
RUBY
