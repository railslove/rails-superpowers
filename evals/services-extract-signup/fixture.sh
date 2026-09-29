#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../_shared/rails_app.sh"

cat > app/models/user.rb <<'RUBY'
class User < ApplicationRecord
  has_many :workspaces
end
RUBY
cat > app/controllers/users_controller.rb <<'RUBY'
class UsersController < ApplicationController
  def create
    @user = User.new(params.require(:user).permit(:email, :password, :name))
    if @user.save
      workspace = @user.workspaces.create!(name: "#{@user.name}'s workspace")
      workspace.memberships.create!(user: @user, role: :owner)
      UserMailer.welcome(@user).deliver_later
      redirect_to workspace
    else
      render :new, status: :unprocessable_entity
    end
  end
end
RUBY
