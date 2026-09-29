#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

cat > app/models/order.rb <<'RUBY'
class Order < ApplicationRecord
end
RUBY
cat > app/services/invoice_generator.rb <<'RUBY'
# frozen_string_literal: true

class InvoiceGenerator
  def self.call(...) = new(...).call

  def initialize(order)
    @order = order
  end

  def call
    order.invoice_pdf.attach(io: StringIO.new(render_pdf), filename: "invoice-#{order.number}.pdf")
  end

  private

  attr_reader :order

  def render_pdf
    "%PDF-1.4 ..."
  end
end
RUBY
cat > app/controllers/orders_controller.rb <<'RUBY'
class OrdersController < ApplicationController
  def complete
    order = Order.find(params[:id])
    order.update!(completed_at: Time.current)
    InvoiceGenerator.call(order)
    redirect_to order
  end
end
RUBY
