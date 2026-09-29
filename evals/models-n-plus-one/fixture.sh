#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

mkdir -p app/views/orders
cat > app/models/order.rb <<'RUBY'
class Order < ApplicationRecord
  belongs_to :customer
end
RUBY
cat > app/models/customer.rb <<'RUBY'
class Customer < ApplicationRecord
  has_many :orders
end
RUBY
cat > app/controllers/orders_controller.rb <<'RUBY'
class OrdersController < ApplicationController
  def index
    @orders = Order.order(created_at: :desc)
  end
end
RUBY
cat > app/views/orders/index.html.erb <<'ERB'
<% @orders.each do |order| %>
  <tr><td><%= order.number %></td><td><%= order.customer.name %></td></tr>
<% end %>
ERB
cat > config/routes.rb <<'RUBY'
Rails.application.routes.draw do
  resources :orders, only: :index
end
RUBY
