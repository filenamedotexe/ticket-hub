'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWorkItemsKanban, updateWorkItemStatus } from '@ticket-hub/db';

type WorkItemStatus = 'TODO' | 'IN_PROGRESS' | 'QA' | 'DONE';
type WorkItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type WorkItemType = 'TICKET' | 'TASK';

interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  type: WorkItemType;
  assigneeId: string | null;
  createdById: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  meta: any;
}

interface KanbanColumn {
  id: WorkItemStatus;
  title: string;
  items: WorkItem[];
}

interface KanbanBoardProps {
  tenantId: string;
  userId: string;
  userRole: string;
}

function WorkItemCard({ item }: { item: WorkItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: WorkItemPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: WorkItemType) => {
    return type === 'TICKET' ? '🎫' : '✅';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`work-item-${item.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow touch-manipulation"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(item.type)}</span>
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
              item.priority
            )}`}
          >
            {item.priority}
          </span>
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {item.title}
      </h3>

      {item.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          {item.assignee && (
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">
                {(item.assignee.name ?? item.assignee.email)
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <span className="hidden sm:inline">
                {item.assignee.name ?? item.assignee.email.split('@')[0]}
              </span>
            </div>
          )}
        </div>
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function KanbanColumnComponent({ column }: { column: KanbanColumn }) {
  const getColumnColor = (status: WorkItemStatus) => {
    switch (status) {
      case 'TODO':
        return 'bg-gray-50 border-gray-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 border-blue-200';
      case 'QA':
        return 'bg-yellow-50 border-yellow-200';
      case 'DONE':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-80 ${getColumnColor(column.id)} rounded-lg border p-4`}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{column.title}</h2>
        <span className="bg-white px-2 py-1 rounded-full text-sm text-gray-600 font-medium">
          {column.items.length}
        </span>
      </div>

      <div className="space-y-2 min-h-96">
        <SortableContext
          items={column.items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.items.map(item => (
            <WorkItemCard key={item.id} item={item} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tenantId,
  userId,
  userRole,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'TODO', title: 'To Do', items: [] },
    { id: 'IN_PROGRESS', title: 'In Progress', items: [] },
    { id: 'QA', title: 'QA Review', items: [] },
    { id: 'DONE', title: 'Done', items: [] },
  ]);
  const [activeItem, setActiveItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile-friendly sensors with better touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const loadKanbanData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getWorkItemsKanban(tenantId, userId, userRole);

      if (result.columns) {
        setColumns([
          {
            id: 'TODO',
            title: 'To Do',
            items: (result.columns.TODO ?? []) as WorkItem[],
          },
          {
            id: 'IN_PROGRESS',
            title: 'In Progress',
            items: (result.columns.IN_PROGRESS ?? []) as WorkItem[],
          },
          {
            id: 'QA',
            title: 'QA Review',
            items: (result.columns.QA ?? []) as WorkItem[],
          },
          {
            id: 'DONE',
            title: 'Done',
            items: (result.columns.DONE ?? []) as WorkItem[],
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading kanban data:', err);
      setError('Failed to load work items. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, userRole]);

  useEffect(() => {
    loadKanbanData();
  }, [loadKanbanData]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = findItemById(active.id as string);
    setActiveItem(item || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!active || !over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active item and its current column
    const activeItem = findItemById(activeId);
    if (!activeItem) return;

    const activeColumn = findColumnByItemId(activeId);
    const overColumn = findColumnById(overId) || findColumnByItemId(overId);

    if (!activeColumn || !overColumn) return;

    // If moving to a different column, update the status
    if (activeColumn.id !== overColumn.id) {
      try {
        // Optimistically update the UI
        setColumns(prevColumns => {
          const newColumns = [...prevColumns];

          // Remove item from source column
          const sourceColumn = newColumns.find(
            col => col.id === activeColumn.id
          );
          if (sourceColumn) {
            sourceColumn.items = sourceColumn.items.filter(
              item => item.id !== activeId
            );
          }

          // Add item to destination column with new status
          const destColumn = newColumns.find(col => col.id === overColumn.id);
          if (destColumn) {
            const updatedItem = { ...activeItem, status: overColumn.id };
            destColumn.items.push(updatedItem);
          }

          return newColumns;
        });

        // Update the database
        await updateWorkItemStatus(
          tenantId,
          userId,
          userRole,
          activeId,
          overColumn.id
        );
      } catch (err) {
        console.error('Error updating work item status:', err);
        setError('Failed to update work item. Changes reverted.');
        // Reload data to revert the optimistic update
        await loadKanbanData();
      }
    }
    // Handle reordering within the same column
    else if (activeColumn.id === overColumn.id) {
      const activeIndex = activeColumn.items.findIndex(
        item => item.id === activeId
      );
      const overIndex = activeColumn.items.findIndex(
        item => item.id === overId
      );

      if (activeIndex !== overIndex) {
        setColumns(prevColumns => {
          const newColumns = [...prevColumns];
          const columnIndex = newColumns.findIndex(
            col => col.id === activeColumn.id
          );
          if (columnIndex !== -1) {
            newColumns[columnIndex].items = arrayMove(
              newColumns[columnIndex].items,
              activeIndex,
              overIndex
            );
          }
          return newColumns;
        });
      }
    }
  };

  const findItemById = (id: string): WorkItem | undefined => {
    for (const column of columns) {
      const item = column.items.find(item => item.id === id);
      if (item) return item;
    }
    return undefined;
  };

  const findColumnByItemId = (itemId: string): KanbanColumn | undefined => {
    return columns.find(column =>
      column.items.some(item => item.id === itemId)
    );
  };

  const findColumnById = (columnId: string): KanbanColumn | undefined => {
    return columns.find(column => column.id === columnId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={loadKanbanData}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full" data-testid="kanban-board">
        <div className="flex space-x-6 overflow-x-auto pb-6">
          {columns.map(column => (
            <KanbanColumnComponent key={column.id} column={column} />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeItem ? <WorkItemCard item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
