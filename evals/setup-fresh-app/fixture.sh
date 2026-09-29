#!/usr/bin/env bash
set -euo pipefail
mkdir -p app/models config
cat > Gemfile <<'RUBY'
source "https://rubygems.org"

gem "rails", "~> 8.0"
gem "pg"
gem "puma"
RUBY
cat > config/application.rb <<'RUBY'
require_relative "boot"
require "rails/all"

module FreshApp
  class Application < Rails::Application
    config.load_defaults 8.0
  end
end
RUBY
