import { createDatabaseContext } from './context';
import { can, authorize, type PermissionContext } from './permissions';

// Types for WorkItem operations
export type WorkItemType = 'TICKET' | 'TASK';
export type WorkItemStatus = 'TODO' | 'IN_PROGRESS' | 'QA' | 'DONE';
export type WorkItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface WorkItemMeta {
  tags?: string[];
  estimatedHours?: number;
  browser?: string;
  version?: string;
  [key: string]: any;
}

export interface CreateWorkItemInput {
  type: WorkItemType;
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assigneeId?: string;
  meta?: WorkItemMeta;
}

export interface UpdateWorkItemInput {
  id: string;
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assigneeId?: string;
  meta?: WorkItemMeta;
}

export interface WorkItemFilters {
  type?: WorkItemType;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  assigneeId?: string;
  createdById?: string;
}

// Create WorkItem
export async function createWorkItem(
  tenantId: string,
  userId: string,
  userRole: string,
  input: CreateWorkItemInput
) {
  const start = performance.now();

  // Check permissions
  const permissionContext: PermissionContext = {
    role: userRole as any,
    tenantId,
    userId,
  };

  authorize(permissionContext, 'create:ticket'); // Both tickets and tasks use ticket permission

  const { db } = createDatabaseContext(tenantId);

  const workItem = await db.workItem.create({
    data: {
      tenantId,
      type: input.type,
      title: input.title,
      description: input.description,
      status: input.status || 'TODO',
      priority: input.priority || 'MEDIUM',
      assigneeId: input.assigneeId,
      createdById: userId,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const duration = performance.now() - start;
  return {
    ...workItem,
    meta: workItem.meta ? JSON.parse(workItem.meta) : null,
    _performance: { duration },
  };
}

// Get WorkItems with filters
export async function getWorkItems(
  tenantId: string,
  userId: string,
  userRole: string,
  filters?: WorkItemFilters
) {
  const start = performance.now();

  // Check permissions
  const permissionContext: PermissionContext = {
    role: userRole as any,
    tenantId,
    userId,
  };

  // Check if user can read all tickets or just their own
  const canReadAll = can(permissionContext, 'read:all_tickets');

  const { db } = createDatabaseContext(tenantId);

  const where: any = {};

  // Apply tenant isolation (handled by middleware)
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters?.createdById) where.createdById = filters.createdById;

  // If user can't read all tickets, only show their own
  if (!canReadAll) {
    where.OR = [{ assigneeId: userId }, { createdById: userId }];
  }

  const workItems = await db.workItem.findMany({
    where,
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [
      {
        priority: 'desc', // URGENT, HIGH, MEDIUM, LOW
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  const duration = performance.now() - start;
  return {
    items: workItems.map(item => ({
      ...item,
      meta: item.meta ? JSON.parse(item.meta) : null,
    })),
    _performance: { duration },
  };
}

// Get single WorkItem
export async function getWorkItem(
  tenantId: string,
  userId: string,
  userRole: string,
  id: string
) {
  const start = performance.now();

  // Check permissions
  const permissionContext: PermissionContext = {
    role: userRole as any,
    tenantId,
    userId,
  };

  authorize(permissionContext, 'read:ticket');

  const { db } = createDatabaseContext(tenantId);

  const workItem = await db.workItem.findFirst({
    where: { id },
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!workItem) {
    throw new Error('WorkItem not found');
  }

  // Check if user can access this specific work item
  const canReadAll = can(permissionContext, 'read:all_tickets');
  if (
    !canReadAll &&
    workItem.assigneeId !== userId &&
    workItem.createdById !== userId
  ) {
    throw new Error('Access denied: You can only view your own work items');
  }

  const duration = performance.now() - start;
  return {
    ...workItem,
    meta: workItem.meta ? JSON.parse(workItem.meta) : null,
    _performance: { duration },
  };
}

// Update WorkItem
export async function updateWorkItem(
  tenantId: string,
  userId: string,
  userRole: string,
  input: UpdateWorkItemInput
) {
  const start = performance.now();

  // Check permissions
  const permissionContext: PermissionContext = {
    role: userRole as any,
    tenantId,
    userId,
  };

  authorize(permissionContext, 'update:ticket');

  const { db } = createDatabaseContext(tenantId);

  // First check if the work item exists and user can access it
  await getWorkItem(tenantId, userId, userRole, input.id);

  const updateData: any = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;
  if (input.meta !== undefined) {
    updateData.meta = input.meta ? JSON.stringify(input.meta) : null;
  }

  const workItem = await db.workItem.update({
    where: { id: input.id },
    data: updateData,
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const duration = performance.now() - start;
  return {
    ...workItem,
    meta: workItem.meta ? JSON.parse(workItem.meta) : null,
    _performance: { duration },
  };
}

// Delete WorkItem
export async function deleteWorkItem(
  tenantId: string,
  userId: string,
  userRole: string,
  id: string
) {
  const start = performance.now();

  // Check permissions
  const permissionContext: PermissionContext = {
    role: userRole as any,
    tenantId,
    userId,
  };

  authorize(permissionContext, 'delete:ticket');

  const { db } = createDatabaseContext(tenantId);

  // First check if the work item exists and user can access it
  await getWorkItem(tenantId, userId, userRole, id);

  await db.workItem.delete({
    where: { id },
  });

  const duration = performance.now() - start;
  return {
    success: true,
    _performance: { duration },
  };
}

// Bulk update WorkItem status (for Kanban drag & drop)
export async function updateWorkItemStatus(
  tenantId: string,
  userId: string,
  userRole: string,
  id: string,
  status: WorkItemStatus
) {
  const start = performance.now();

  const result = await updateWorkItem(tenantId, userId, userRole, {
    id,
    status,
  });

  const duration = performance.now() - start;
  return {
    ...result,
    _performance: { duration },
  };
}

// Get WorkItems grouped by status (for Kanban board)
export async function getWorkItemsKanban(
  tenantId: string,
  userId: string,
  userRole: string,
  filters?: Omit<WorkItemFilters, 'status'>
) {
  const start = performance.now();

  const { items } = await getWorkItems(tenantId, userId, userRole, filters);

  const grouped = {
    TODO: items.filter(item => item.status === 'TODO'),
    IN_PROGRESS: items.filter(item => item.status === 'IN_PROGRESS'),
    QA: items.filter(item => item.status === 'QA'),
    DONE: items.filter(item => item.status === 'DONE'),
  };

  const duration = performance.now() - start;
  return {
    columns: grouped,
    _performance: { duration },
  };
}
