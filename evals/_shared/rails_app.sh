#!/usr/bin/env bash
# Minimal Rails app skeleton shared by the eval cases' fixture scripts.
set -euo pipefail

mkdir -p app/models app/controllers app/views/layouts app/jobs app/services app/components config db spec

cat > Gemfile <<'RUBY'
source "https://rubygems.org"

gem "rails", "~> 8.0"
gem "pg"
gem "view_component"

group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "standard"
end
RUBY

cat > app/models/application_record.rb <<'RUBY'
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
RUBY

cat > app/controllers/application_controller.rb <<'RUBY'
class ApplicationController < ActionController::Base
end
RUBY

cat > spec/rails_helper.rb <<'RUBY'
require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rspec/rails"

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
  config.include ActiveSupport::Testing::TimeHelpers
end
RUBY
