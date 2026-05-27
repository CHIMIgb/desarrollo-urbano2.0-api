const MESSAGES = {
  AUTH: {
    MISSING_TOKEN: 'auth.missing_token',
    EMPTY_TOKEN: 'auth.empty_token',
    INVALID_TOKEN: 'auth.invalid_token',
    EXPIRED_TOKEN: 'auth.expired_token',
    REVOKED_TOKEN: 'auth.revoked_token',
    LOGOUT_REVOKED: 'auth.logout_revoked',
    BAD_CREDENTIALS: 'auth.bad_credentials',
    LOGOUT_SUCCESS: 'auth.logout_success',
    USER_EXISTS: 'auth.user_exists'
  },
  PROJECTS: {
    NOT_FOUND: 'projects.not_found',
    NO_ACCESS: 'projects.no_access',
    NO_PERMISSION: 'projects.no_permission',
    SAVE_SUCCESS: 'projects.save_success',
    AUDIT_SUCCESS: 'projects.audit_success',
    MISSING_ACTION_TYPE: 'projects.missing_action_type',
    INVALID_FEATURES: 'projects.invalid_features',
    INVALID_ID: 'projects.invalid_id'
  },
  COMMON: {
    MISSING_FIELDS: 'common.missing_fields',
    SERVER_ERROR: 'common.server_error',
    NOT_FOUND: 'common.not_found',
    UNKNOWN_ERROR: 'common.unknown_error',
    HELLO: 'common.hello'
  },
  CONFIG: {
    FETCH_SUCCESS: 'config.fetch_success'
  },
  SECURITY: {
    IP_BLOCKED: 'security.ip_blocked',
    IP_BLOCKED_DETAILS: 'security.ip_blocked_details',
    DDOS_BLOCKED: 'security.ddos_blocked',
    DDOS_BLOCKED_DETAILS: 'security.ddos_blocked_details',
    RATE_LIMIT: 'security.rate_limit',
    RATE_LIMIT_DETAILS: 'security.rate_limit_details'
  }
};

module.exports = { MESSAGES };
