import { expect, test, describe } from 'bun:test';
import type { UserRole, Action, PermissionContext } from '@ticket-hub/db';

const {
  can,
  authorize,
  PermissionError,
  getRolePermissions,
  canAll,
  getAllowedActions,
} = require('@ticket-hub/db');

describe('Phase 2.2 - Permission System', () => {
  describe('Basic Permission Tests', () => {
    test('should allow CLIENT to create tickets', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      expect(can(context, 'create:ticket')).toBe(true);
    });

    test('should not allow CLIENT to manage users', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      expect(can(context, 'manage:users')).toBe(false);
    });

    test('should allow STAFF to read all tickets', () => {
      const context: PermissionContext = {
        role: 'STAFF',
        tenantId: 'tenant-1',
        userId: 'user-2',
      };

      expect(can(context, 'read:all_tickets')).toBe(true);
    });

    test('should allow ADMIN to manage tenant', () => {
      const context: PermissionContext = {
        role: 'ADMIN',
        tenantId: 'tenant-1',
        userId: 'user-3',
      };

      expect(can(context, 'manage:tenant')).toBe(true);
    });
  });

  describe('Ownership-based Permissions', () => {
    test('CLIENT should be able to read their own tickets', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
        resourceOwnerId: 'user-1', // Same as userId
      };

      expect(can(context, 'read:ticket')).toBe(true);
    });

    test('CLIENT should NOT be able to read other users tickets', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
        resourceOwnerId: 'user-2', // Different from userId
      };

      expect(can(context, 'read:ticket')).toBe(false);
    });

    test('STAFF should be able to read any tickets', () => {
      const context: PermissionContext = {
        role: 'STAFF',
        tenantId: 'tenant-1',
        userId: 'user-2',
        resourceOwnerId: 'user-1', // Different user's ticket
      };

      expect(can(context, 'read:ticket')).toBe(true);
    });

    test('ADMIN should be able to read any tickets', () => {
      const context: PermissionContext = {
        role: 'ADMIN',
        tenantId: 'tenant-1',
        userId: 'user-3',
        resourceOwnerId: 'user-1', // Different user's ticket
      };

      expect(can(context, 'read:ticket')).toBe(true);
    });
  });

  describe('Authorization Function', () => {
    test('authorize should pass for valid permissions', () => {
      const context: PermissionContext = {
        role: 'ADMIN',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      // Should not throw
      expect(() => authorize(context, 'manage:users')).not.toThrow();
    });

    test('authorize should throw PermissionError for invalid permissions', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      expect(() => authorize(context, 'manage:users')).toThrow(PermissionError);
    });

    test('PermissionError should have correct properties', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      try {
        authorize(context, 'manage:users');
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeInstanceOf(PermissionError);
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('CLIENT');
        expect(error.message).toContain('manage:users');
      }
    });
  });

  describe('Utility Functions', () => {
    test('getRolePermissions should return correct permissions for each role', () => {
      const clientPermissions = getRolePermissions('CLIENT');
      const staffPermissions = getRolePermissions('STAFF');
      const adminPermissions = getRolePermissions('ADMIN');

      expect(clientPermissions).toContain('create:ticket');
      expect(clientPermissions).not.toContain('manage:users');

      expect(staffPermissions).toContain('read:all_tickets');
      expect(staffPermissions).not.toContain('manage:users');

      expect(adminPermissions).toContain('manage:users');
      expect(adminPermissions).toContain('manage:tenant');
    });

    test('canAll should check multiple permissions', () => {
      const clientContext: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const actions: Action[] = ['create:ticket', 'read:profile'];
      expect(canAll(clientContext, actions)).toBe(true);

      const actionsWithForbidden: Action[] = ['create:ticket', 'manage:users'];
      expect(canAll(clientContext, actionsWithForbidden)).toBe(false);
    });

    test('getAllowedActions should filter actions', () => {
      const clientContext: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
      };

      const actions: Action[] = [
        'create:ticket',
        'manage:users',
        'read:profile',
      ];
      const allowed = getAllowedActions(clientContext, actions);

      expect(allowed).toContain('create:ticket');
      expect(allowed).toContain('read:profile');
      expect(allowed).not.toContain('manage:users');
    });
  });

  describe('30 Randomized Permission Tests', () => {
    const roles: UserRole[] = ['CLIENT', 'STAFF', 'ADMIN'];
    const actions: Action[] = [
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
    ];

    // Generate 30 randomized test cases
    const testCases = Array.from({ length: 30 }, (_, i) => {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const userId = `user-${Math.floor(Math.random() * 5) + 1}`;
      const resourceOwnerId =
        Math.random() < 0.5
          ? userId
          : `user-${Math.floor(Math.random() * 5) + 1}`;

      return {
        testId: i + 1,
        role,
        action,
        userId,
        resourceOwnerId,
        tenantId: 'tenant-1',
      };
    });

    testCases.forEach(
      ({ testId, role, action, userId, resourceOwnerId, tenantId }) => {
        test(`Randomized test ${testId}: ${role} - ${action}`, () => {
          const context: PermissionContext = {
            role,
            tenantId,
            userId,
            resourceOwnerId,
          };

          const result = can(context, action);

          // Verify the result makes sense based on our permission matrix
          const rolePermissions = getRolePermissions(role);
          const hasBasicPermission = rolePermissions.includes(action);

          if (!hasBasicPermission) {
            expect(result).toBe(false);
          } else {
            // For ownership-based actions, verify the logic
            if (action === 'read:ticket' || action === 'update:ticket') {
              if (role === 'CLIENT') {
                expect(result).toBe(userId === resourceOwnerId);
              } else {
                expect(result).toBe(true); // STAFF and ADMIN can access any ticket
              }
            } else if (action === 'update:comment') {
              if (role === 'CLIENT') {
                expect(result).toBe(userId === resourceOwnerId);
              } else {
                expect(result).toBe(true); // STAFF and ADMIN can update any comment
              }
            } else {
              expect(result).toBe(true); // Non-ownership-based action
            }
          }

          // Test that authorize works consistently with can
          if (result) {
            expect(() => authorize(context, action)).not.toThrow();
          } else {
            expect(() => authorize(context, action)).toThrow(PermissionError);
          }
        });
      }
    );
  });

  describe('Edge Cases', () => {
    test('should handle undefined resourceOwnerId gracefully', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        userId: 'user-1',
        // resourceOwnerId is undefined
      };

      // Should return false for ownership-based actions when resourceOwnerId is undefined
      expect(can(context, 'read:ticket')).toBe(false);
      expect(can(context, 'update:ticket')).toBe(false);
    });

    test('should handle missing userId gracefully', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: 'tenant-1',
        // userId is undefined
      };

      // Should return false for ownership-based actions when userId is undefined
      expect(can(context, 'read:ticket')).toBe(false);
    });

    test('should work with all role variations', () => {
      const testRoles: UserRole[] = ['CLIENT', 'STAFF', 'ADMIN'];

      testRoles.forEach(role => {
        const context: PermissionContext = {
          role,
          tenantId: 'tenant-1',
          userId: 'user-1',
        };

        // All roles should be able to read their own profile
        expect(can(context, 'read:profile')).toBe(true);

        // Only ADMIN should be able to manage users
        expect(can(context, 'manage:users')).toBe(role === 'ADMIN');
      });
    });

    test('should handle empty tenant ID', () => {
      const context: PermissionContext = {
        role: 'CLIENT',
        tenantId: '',
        userId: 'user-1',
      };

      // Should still work for basic permission checks
      expect(can(context, 'create:ticket')).toBe(true);
      expect(can(context, 'manage:users')).toBe(false);
    });
  });
});
