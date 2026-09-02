"""Services layer — toda la lógica de negocio vive aquí (R3 Reliability)."""
from app.services.admin_service import (
    list_all_payments,
    list_plans as admin_list_plans,
    list_users as admin_list_users,
    set_user_active,
    update_plan_price,
)
from app.services.analytics_service import (
    get_analytics_summary,
    get_top_pages,
    record_pageview,
)
from app.services.auth_service import (
    authenticate_user,
    issue_tokens_for_user,
    logout_user,
    register_user,
    rotate_refresh_token,
)
from app.services.payment_service import (
    get_all_payments,
    get_user_payments,
    record_payment,
    update_payment_status,
)
from app.services.subscription_service import (
    cancel_subscription,
    create_trial,
    get_user_active_subscription,
    is_subscription_active,
    is_trial_active,
    upgrade_subscription,
)
from app.services.trading_account_service import (
    TradingAccountError,
    create_trading_account,
    delete_account,
    fund_account,
    list_user_accounts,
    withdraw_account,
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
    "admin_list_users",
    "set_user_active",
    "admin_list_plans",
    "update_plan_price",
    "record_payment",
    "update_payment_status",
    "get_user_payments",
    "get_all_payments",
    "list_all_payments",
    "record_pageview",
    "get_top_pages",
    "get_analytics_summary",
    "create_trading_account",
    "fund_account",
    "withdraw_account",
    "delete_account",
    "list_user_accounts",
]