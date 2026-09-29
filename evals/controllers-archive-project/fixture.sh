#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

cat > app/models/project.rb <<'RUBY'
class Project < ApplicationRecord
end
RUBY
cat > app/controllers/projects_controller.rb <<'RUBY'
class ProjectsController < ApplicationController
  def index
    @projects = Project.where(archived_at: nil)
  end

  def show
    @project = Project.find(params[:id])
  end
end
RUBY
cat > config/routes.rb <<'RUBY'
Rails.application.routes.draw do
  resources :projects, only: %i[index show]
end
RUBY
