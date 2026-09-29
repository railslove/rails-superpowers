#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

mkdir -p app/views/orders
badge='<span class="badge badge-<%= order.status %>"><%= order.status.humanize %></span>'
for view in index show edit; do
  cat > "app/views/orders/$view.html.erb" <<ERB
<h1>Order <%= order.number %></h1>
$badge
ERB
done
