"""Services layer — toda la lógica de negocio vive aquí (R3 Reliability)."""
from app.services.auth_service import (
    authenticate_user,
    issue_tokens_for_user,
    logout_user,
    register_user,
    rotate_refresh_token,
)
from app.services.subscription_service import (
    cancel_subscription,
    create_trial,
    get_user_active_subscription,
    is_subscription_active,
    is_trial_active,
    upgrade_subscription,
)
from app.services.user_service import (
    get_user_by_email,
    get_user_with_subscription,
    get_user_workspaces,
)
from app.services.workspace_service import (
    create_default_workspace_for_user,
    get_user_workspace_role,
)

__all__ = [
    "register_user",
    "authenticate_user",
    "issue_tokens_for_user",
    "rotate_refresh_token",
    "logout_user",
    "get_user_by_email",
    "get_user_workspaces",
    "get_user_with_subscription",
    "create_default_workspace_for_user",
    "get_user_workspace_role",
    "create_trial",
    "get_user_active_subscription",
    "is_subscription_active",
    "is_trial_active",
    "upgrade_subscription",
    "cancel_subscription",
]
