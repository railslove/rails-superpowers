---
name: rails-controllers
description: Use when writing or reviewing Rails controller actions, adding a new route, extracting strong params, or deciding whether a controller action needs a new custom route. Triggers on "controller", "strong params", "before_action", "respond_to", or any change to app/controllers/. Always invoke before touching a file in app/controllers/.
---

# Rails Controller Conventions

A controller action's job: read params, call one service/query, respond. No business logic lives here.

## Thin Actions — Delegate Everything

```ruby
# Wrong — business logic inline
def create
  @group = UserGroup.find_by(invitation_token: params[:token])
  if @group && @group.users.count < @group.max_size
    user = @group.users.create(nickname: params[:nickname], login_code: SecureRandom.hex(4))
    redirect_to user
  else
    render :new, alert: "Group is full or token invalid"
  end
end

# Right — action is find params -> call service -> respond
def create
  user = RegisterUser.call(invitation_token: params[:token], nickname: params[:nickname])
  redirect_to user
rescue RegisterUser::Error => e
  render :new, alert: e.message
end
```

See `rails-service-objects` for how the called service should be structured.

An action is too fat if you can't read it top-to-bottom in one glance without a service/query call. If you're tempted to add an `if`/`each` beyond simple response branching, extract it.

## Strong Params

- Permitted params live in a `private` method at the bottom of the controller.
- Always named `<resource>_params`, matching the resource, never inlined into the action:

```ruby
private

def user_params
  params.require(:user).permit(:nickname, :email)
end
```

- Never call `params.permit` directly inside an action body.

## RESTful Actions Only

Stick to the seven standard actions (`index`, `show`, `new`, `create`, `edit`, `update`, `destroy`). A custom action (`publish`, `archive`, `approve`) is a sign the state transition deserves its own nested resource:

```ruby
# Wrong — custom action bolted onto PostsController
post "/posts/:id/publish", to: "posts#publish"

# Right — modeled as a nested resource's create
resources :posts do
  resource :publication, only: [:create], controller: "post_publications"
end
```

The nested controller's `create` action still just delegates to a service (e.g. `PublishPost.call(post_id: params[:post_id])`).

## Reviewing Existing Controllers

1. **Any model mutation, conditional, or loop beyond response branching?** → extract to a service or query object. This includes a single unguarded `update!`/`create!`/`destroy` call, not just multi-line logic.
2. **`params.permit` called outside a `*_params` private method?** → move it.
3. **Any non-CRUD action name?** → model as a nested resource instead.
4. **Does the action rescue the service's specific `Error` class, not a generic `StandardError`?**
