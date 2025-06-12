export type UserRole = 'CLIENT' | 'STAFF' | 'ADMIN';

export type Action =
  | 'create:ticket'
  | 'read:ticket'
  | 'update:ticket'
  | 'delete:ticket'
  | 'assign:ticket'
  | 'read:all_tickets'
  | 'manage:users'
  | 'manage:tenant'
  | 'read:profile'
  | 'update:profile'
  | 'create:comment'
  | 'read:comment'
  | 'update:comment'
  | 'delete:comment'
  | 'read:reports'
  | 'manage:settings'
  | 'read:system_logs'
  | 'manage:billing'
  | 'export:data';

export interface PermissionContext {
  role: UserRole;
  tenantId: string;
  userId?: string;
  resourceOwnerId?: string; // For resource-specific permissions
}

// Permission matrix defining what each role can do
const PERMISSIONS: Record<UserRole, Action[]> = {
  CLIENT: [
    'create:ticket',
    'read:ticket', // Own tickets only
    'update:ticket', // Own tickets only
    'read:profile',
    'update:profile',
    'create:comment', // On own tickets
    'read:comment', // On own tickets
    'update:comment', // Own comments only
  ],
  STAFF: [
    'create:ticket',
    'read:ticket',
    'update:ticket',
    'assign:ticket',
    'read:all_tickets',
    'read:profile',
    'update:profile',
    'create:comment',
    'read:comment',
    'update:comment',
    'delete:comment',
    'read:reports',
  ],
  ADMIN: [
    'create:ticket',
    'read:ticket',
    'update:ticket',
    'delete:ticket',
    'assign:ticket',
    'read:all_tickets',
    'manage:users',
    'manage:tenant',
    'read:profile',
    'update:profile',
    'create:comment',
    'read:comment',
    'update:comment',
    'delete:comment',
    'read:reports',
    'manage:settings',
    'read:system_logs',
    'manage:billing',
    'export:data',
  ],
};

export class PermissionError extends Error {
  public readonly code = 'PERMISSION_DENIED';
  public readonly statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'PermissionError';
  }
}

export function can(context: PermissionContext, action: Action): boolean {
  const rolePermissions = PERMISSIONS[context.role];

  if (!rolePermissions.includes(action)) {
    return false;
  }

  // Additional checks for resource-specific permissions
  if (needsOwnershipCheck(action)) {
    return checkOwnership(context, action);
  }

  return true;
}

export function authorize(context: PermissionContext, action: Action): void {
  if (!can(context, action)) {
    throw new PermissionError(
      `User with role ${context.role} cannot perform action: ${action}`
    );
  }
}

// Helper function to check if action requires ownership verification
function needsOwnershipCheck(action: Action): boolean {
  const ownershipActions: Action[] = [
    'read:ticket', // CLIENT can only read own tickets
    'update:ticket', // CLIENT can only update own tickets
    'update:comment', // All roles can only update own comments
  ];

  return ownershipActions.includes(action);
}

// Check if user owns the resource or has elevated permissions
function checkOwnership(_context: PermissionContext, _action: Action): boolean {
  // ADMIN and STAFF have elevated permissions for most actions
  if (_context.role === 'ADMIN' || _context.role === 'STAFF') {
    return true;
  }

  // CLIENT users can only access their own resources
  if (_context.role === 'CLIENT') {
    // For tickets and comments, check if user is the owner
    if (
      (_action === 'read:ticket' || _action === 'update:ticket') &&
      _context.resourceOwnerId
    ) {
      return _context.userId === _context.resourceOwnerId;
    }

    // For comments, check if user is the comment author
    if (_action === 'update:comment' && _context.resourceOwnerId) {
      return _context.userId === _context.resourceOwnerId;
    }
  }

  return false;
}

// Utility function to get all permissions for a role
export function getRolePermissions(role: UserRole): Action[] {
  return [...PERMISSIONS[role]];
}

// Utility function to check multiple permissions at once
export function canAll(context: PermissionContext, actions: Action[]): boolean {
  return actions.every(action => can(context, action));
}

// Utility function to get allowed actions from a list
export function getAllowedActions(
  context: PermissionContext,
  actions?: Action[]
): Action[] {
  const actionList = actions || Object.values(PERMISSIONS).flat();
  return actionList.filter(action => can(context, action));
}
