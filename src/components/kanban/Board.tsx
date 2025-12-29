'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getAllTagsWithColors, getLightTagColor, getTagColor, addTagToManaged } from '@/lib/tags';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Column } from './Column'
import toast from 'react-hot-toast'
import { createTask, updateTask, deleteTask, updateTaskStatus } from '@/app/actions'

interface BoardProps {
    lists: any[]
    tasks: any[]
    workspaceId: string
    selectedTag?: string
    onTasksChange?: (tasks: any[]) => void
    allTags?: string[] // All existing tags from all tasks
    allTagsWithColors?: { name: string; color: string }[] // Pre-loaded tags with colors (for performance)
    onSelectTag?: (tagName: string | undefined) => void // Add tag selection handler
    createDialogOpen?: boolean // External control of create dialog (for keyboard shortcuts)
    onCreateDialogOpenChange?: (open: boolean) => void // Callback when create dialog state changes
    onRefreshTasks?: () => Promise<void> // Direct refresh function for quick actions
}

export function Board({ lists: initialLists, tasks: initialTasks, workspaceId, selectedTag, onTasksChange, allTags = [], allTagsWithColors: preloadedTags, onSelectTag, createDialogOpen: externalCreateDialogOpen, onCreateDialogOpenChange, onRefreshTasks }: BoardProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const skipSyncRef = useRef(false);
    const [internalCreateDialogOpen, setInternalCreateDialogOpen] = useState(false);
    const [createDialogListId, setCreateDialogListId] = useState<string>('queue'); // Default to first column
    const [mobileSelectedTab, setMobileSelectedTab] = useState<string>('queue'); // Mobile tab selection
    const [isMobile, setIsMobile] = useState(false); // Track if we're on mobile
    
    // Use external control if provided, otherwise use internal state
    const createDialogOpen = externalCreateDialogOpen !== undefined ? externalCreateDialogOpen : internalCreateDialogOpen;
    const setCreateDialogOpen = (open: boolean) => {
        if (externalCreateDialogOpen !== undefined) {
            onCreateDialogOpenChange?.(open);
        } else {
            setInternalCreateDialogOpen(open);
        }
    };
    
    // Optimized sync with external changes - use ref to track previous tasks for efficient comparison
    const prevTasksRef = useRef<string>('');
    
    useEffect(() => {
        if (skipSyncRef.current) {
            skipSyncRef.current = false;
            return;
        }
        
        // Create a lightweight hash of task IDs and key fields for quick comparison
        const tasksHash = initialTasks.map((t: any) => 
            `${t.id}:${t.status}:${(t.tags || []).map((tag: any) => typeof tag === 'string' ? tag : tag.name).sort().join(',')}`
        ).sort().join('|');
        
        // Only update if hash changed (much faster than deep comparison)
        if (prevTasksRef.current !== tasksHash) {
            prevTasksRef.current = tasksHash;
            setTasks(initialTasks);
        }
    }, [initialTasks]);
    
    // Sync internal state with external changes
    const updateTasks = (newTasksOrUpdater: any[] | ((current: any[]) => any[])) => {
        skipSyncRef.current = true;
        
        setTasks((currentTasks) => {
            const newTasks = typeof newTasksOrUpdater === 'function' 
                ? newTasksOrUpdater(currentTasks)
                : newTasksOrUpdater;
            
            // Only call onTasksChange if it's the old signature (state updater)
            // If it's a refresh function, don't call it here (it will be called explicitly)
            if (onTasksChange && typeof onTasksChange !== 'function' || 
                (typeof onTasksChange === 'function' && onTasksChange.length === 1)) {
                (onTasksChange as (tasks: any[]) => void)(newTasks);
            }
            
            return newTasks;
        });
    };
    const [activeTask, setActiveTask] = useState<any>(null);
    
    // Helper function to map UI column IDs to database status values
    // New columns: queue, today, this-week, done
    // Memoized to avoid recreation on every render
    const mapListIdToStatus = useCallback((listId: string): string => {
        if (listId === 'done') return 'done';
        // All other columns (queue, today, this-week) map to 'todo' status
        return 'todo';
    }, []);
    
    // Detect mobile breakpoint and disable DND on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Create sensors - disable on mobile by using a very high activation constraint
    // This ensures hooks are always called in the same order
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: {
            distance: isMobile ? 9999 : 8, // Disable on mobile by requiring impossible distance
        },
    });
    
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: isMobile ? 999999 : 500, // Disable on mobile with very long delay
            tolerance: 5,
        },
    });
    
    const keyboardSensor = useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    });
    
    // Only include sensors on desktop (mobile will have impossible activation constraints)
    const sensors = useSensors(
        pointerSensor,
        touchSensor,
        keyboardSensor
    );
    
    // Memoize filtered tasks to avoid recalculating on every render
    const filteredTasks = useMemo(() => {
        if (!selectedTag) return tasks;
        return tasks.filter((task: any) => 
            task.tags?.some((tag: any) => tag.name === selectedTag)
        );
    }, [tasks, selectedTag]);
    
    /**
     * Categorize a task into the appropriate column based on due date and status
     */
    const categorizeTask = useCallback((task: any): string => {
        // DONE tasks always go to DONE column
        if (task.status === 'done' || task.status === 'shipped') {
            return 'done';
        }

        // If no due date, it goes to QUEUE
        if (!task.dueDate) {
            return 'queue';
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (7 - today.getDay())); // End of week (Sunday)
        endOfWeek.setHours(23, 59, 59, 999);

        // Parse due date - handle YYYY-MM-DD format correctly (avoid UTC timezone issues)
        let dueDateStart: Date;
        if (typeof task.dueDate === 'string') {
            // Handle relative dates like "today", "tomorrow"
            const lowerDate = task.dueDate.toLowerCase();
            if (lowerDate === 'today') {
                dueDateStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            } else if (lowerDate === 'tomorrow') {
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                dueDateStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
            } else if (task.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format - parse as local date to avoid UTC issues
                const [year, month, day] = task.dueDate.split('-').map(Number);
                dueDateStart = new Date(year, month - 1, day); // month is 0-indexed
            } else {
                // Try to parse as date string
                const parsed = new Date(task.dueDate);
                dueDateStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            }
        } else if (task.dueDate instanceof Date) {
            dueDateStart = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate());
        } else {
            // Fallback
            dueDateStart = new Date(today);
        }

        // Normalize to start of day for comparison
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Calculate days difference (positive = future, 0 = today, negative = past)
        const daysDiff = Math.floor((dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

        console.log('[CATEGORIZE] Task categorization:', {
            taskTitle: task.title,
            dueDateRaw: task.dueDate,
            dueDateStart: `${dueDateStart.getFullYear()}-${String(dueDateStart.getMonth() + 1).padStart(2, '0')}-${String(dueDateStart.getDate()).padStart(2, '0')}`,
            todayStart: `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`,
            daysDiff: daysDiff,
            endOfWeek: `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`
        });

        // TODAY: due date is exactly today (daysDiff === 0)
        if (daysDiff === 0) {
            console.log('[CATEGORIZE] → TODAY (due today)');
            return 'today';
        }

        // THIS WEEK: due date is tomorrow or later, but within this week (up to Sunday)
        // Check if it's after today AND before/equal to end of week
        if (daysDiff > 0 && dueDateStart <= endOfWeek) {
            console.log('[CATEGORIZE] → THIS WEEK (due between tomorrow and end of week)');
            return 'this-week';
        }

        // QUEUE: due date is in the future (beyond this week) or in the past (overdue)
        console.log('[CATEGORIZE] → QUEUE (due date beyond this week or overdue)');
        return 'queue';
    }, []);

    // Memoize task grouping to avoid recalculating on every render
    // Tasks are automatically categorized based on due dates
    const tasksByList = useMemo(() => {
        const grouped = (initialLists || []).reduce((acc: any, list: any) => {
            // Categorize each task and filter by the target column
            const tasksForList = (filteredTasks || []).filter((task: any) => {
                const category = categorizeTask(task);
                return category === list.id;
            });
            acc[list.id] = tasksForList;
            
            // Debug logging (only in development)
            if (process.env.NODE_ENV === 'development' && (tasksForList.length > 0 || filteredTasks.length > 0)) {
                console.log(`[Board] Column "${list.id}": ${tasksForList.length} tasks`, {
                    columnId: list.id,
                    taskCount: tasksForList.length,
                    taskIds: tasksForList.map((t: any) => t.id)
                });
            }
            
            return acc;
        }, {});
        return grouped;
    }, [filteredTasks, initialLists, categorizeTask]);

    const handleCreateTask = useCallback(async (newTask: any) => {
        try {
            // Map list_id to status for database
            const listId = newTask.list_id || 'queue';
            const status = mapListIdToStatus(listId);
            
            const result = await createTask({
                title: newTask.title,
                description: newTask.description,
                status: status,
                dueDate: newTask.dueDate,
                duration: newTask.duration,
                tags: newTask.tags?.map((t: any) => t.name) || []
            });

            if (result.error) {
                toast.error('Failed to create task: ' + result.error);
                return null;
            }

            toast.success('Task created successfully');
            // Refresh tasks from database
            if (onTasksChange) {
                // onTasksChange is now always a refresh function
                if (typeof onTasksChange === 'function' && onTasksChange.length === 0) {
                    await (onTasksChange as () => Promise<void>)();
                } else {
                    // Fallback: try to call as refresh function anyway
                    try {
                        await (onTasksChange as () => Promise<void>)();
                    } catch {
                        // If that fails, refresh tasks manually
                        if (onRefreshTasks) {
                            await onRefreshTasks();
                        }
                    }
                }
            }
            
            // Return the created task with its database ID
            return result.task;
        } catch (error: any) {
            console.error('Error creating task:', error);
            toast.error('Failed to create task');
            return null;
        }
    }, [mapListIdToStatus, onTasksChange, onRefreshTasks]);

    const handleUpdateTask = useCallback(async (updatedTask: any) => {
        try {
            // Map list_id to status for database
            const listId = updatedTask.list_id || updatedTask.status || 'queue';
            const status = mapListIdToStatus(listId);
            
            const result = await updateTask(updatedTask.id, {
                title: updatedTask.title,
                description: updatedTask.description,
                status: status,
                dueDate: updatedTask.dueDate,
                duration: updatedTask.duration,
                tags: updatedTask.tags?.map((t: any) => t.name) || [],
                chunkCount: updatedTask.chunkCount,
                chunkDuration: updatedTask.chunkDuration
            });

            if (result.error) {
                toast.error('Failed to update task: ' + result.error);
                return;
            }

            toast.success('Task updated successfully');
            // Refresh tasks from database
            if (onTasksChange) {
                // onTasksChange is now a refresh function, call it
                await onTasksChange();
            }
        } catch (error: any) {
            console.error('Error updating task:', error);
            toast.error('Failed to update task');
        }
    }, [mapListIdToStatus, onTasksChange]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        // Find the task to get its calendar event IDs
        const task = tasks.find((t: any) => t.id === taskId);
        
        // Optimistically remove the task from UI immediately
        updateTasks((currentTasks) => currentTasks.filter((t: any) => t.id !== taskId));
        
        // Delete calendar events if they exist (fire and forget)
        if (task?.googleEventIds && task.googleEventIds.length > 0) {
            const accessToken = localStorage.getItem('google_calendar_token');
            if (accessToken) {
                // Don't await - do this in background
                Promise.all(
                    task.googleEventIds.map(eventId =>
                        fetch(
                            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                            {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                            }
                        ).catch(error => {
                            console.error('Error deleting calendar event:', error);
                        })
                    )
                ).catch(error => {
                    console.error('Error deleting calendar events:', error);
                });
            }
        }

        // Delete from database
        try {
            const result = await deleteTask(taskId);
            if (result.error) {
                // Revert optimistic update on error
                if (onTasksChange && typeof onTasksChange === 'function') {
                    await onTasksChange();
                }
                toast.error('Failed to delete task: ' + result.error);
                return;
            }

            toast.success('Task deleted successfully');
            // Refresh tasks from database to ensure consistency
            if (onTasksChange && typeof onTasksChange === 'function') {
                await onTasksChange();
            }
        } catch (error: any) {
            console.error('Error deleting task:', error);
            // Revert optimistic update on error
            if (onTasksChange && typeof onTasksChange === 'function') {
                await onTasksChange();
            }
            toast.error('Failed to delete task');
        }
    }, [tasks, updateTasks, onTasksChange]);

    // Define calendar event handlers first (used by handleDragEnd)
    const handleDeleteCalendarEvents = useCallback(async (eventIds: string[]): Promise<boolean> => {
        const accessToken = localStorage.getItem('google_calendar_token');
        if (!accessToken) {
            console.warn('[DRAG] No access token for deleting events');
            return false;
        }

        console.log('[DRAG] Deleting calendar events:', eventIds);
        let successCount = 0;

        for (const eventId of eventIds) {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    }
                );

                if (response.ok) {
                    console.log('[DRAG] ✅ Deleted event:', eventId);
                    successCount++;
                } else {
                    const errorText = await response.text();
                    console.error('[DRAG] Failed to delete event:', eventId, errorText);
                }
            } catch (error) {
                console.error('[DRAG] Error deleting event:', error);
            }
        }

        return successCount > 0;
    }, []);

    const handleRescheduleTask = useCallback(async (task: any): Promise<boolean> => {
        const accessToken = localStorage.getItem('google_calendar_token');
        const refreshToken = localStorage.getItem('google_calendar_refresh_token');
        
        if (!accessToken) {
            console.warn('[DRAG] No access token for re-scheduling task');
            return false;
        }

        try {
            // Get working hours from localStorage
            const workingHoursStart = localStorage.getItem('working_hours_start') || '09:00';
            const workingHoursEnd = localStorage.getItem('working_hours_end') || '18:00';

            const { scheduleTask } = await import('@/app/actions');
            const result = await scheduleTask(
                {
                    id: task.id,
                    title: task.title,
                    duration: task.duration,
                    dueDate: task.dueDate,
                    list_id: task.list_id || 'todo'
                },
                accessToken,
                refreshToken || undefined,
                workingHoursStart,
                workingHoursEnd
            );

            if (result.success) {
                console.log('[DRAG] ✅ Task re-scheduled successfully');
                return true;
            } else {
                console.error('[DRAG] Failed to re-schedule task:', result.message);
                return false;
            }
        } catch (error) {
            console.error('[DRAG] Error re-scheduling task:', error);
            return false;
        }
    }, [updateTasks]);

    const handleDragStart = useCallback((event: any) => {
        const { active } = event;
        const task = tasks.find((t: any) => t.id === active.id);
        setActiveTask(task);
    }, [tasks]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        
        // Find the task being dragged
        const task = tasks.find((t: any) => t.id === taskId);
        if (!task) {
            console.warn('[DRAG] Task not found:', taskId);
            return;
        }

        // Use categorization to determine current column
        const oldListId = categorizeTask(task);
        
        // Determine the target column ID
        // If dropped on another task, find which column that task belongs to
        // If dropped on a column (droppable area), use the column id directly
        let newListId: string;
        const overId = over.id as string;
        
        // Check if over.id is a column id (from initialLists)
        const isColumnId = initialLists.some((list: any) => list.id === overId);
        
        if (isColumnId) {
            // Dropped directly on column
            newListId = overId;
        } else {
            // Dropped on another task - find which column that task is in using categorization
            const targetTask = tasks.find((t: any) => t.id === overId);
            if (targetTask) {
                // Use categorization to determine the column
                newListId = categorizeTask(targetTask);
            } else {
                console.warn('[DRAG] Could not determine target column for:', overId);
                return;
            }
        }

        // If dropped in the same column, just reorder (for future implementation)
        if (oldListId === newListId) {
            console.log('[DRAG] Dropped in same column, no update needed');
            return;
        }

        console.log('[DRAG] Moving task from', oldListId, 'to', newListId);

        // Map UI column ID to database status value
        const newStatus = mapListIdToStatus(newListId);

        // Check if we're moving to or from "done" column
        const isMovingToDone = newListId === 'done';
        const isMovingFromDone = oldListId === 'done';

        // Calculate new due date based on target column
        let newDueDate = task.dueDate;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (newListId === 'today') {
            // Set due date to today
            newDueDate = today.toISOString().split('T')[0];
        } else if (newListId === 'this-week') {
            // Set due date to end of week (Sunday)
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
            newDueDate = endOfWeek.toISOString().split('T')[0];
        } else if (newListId === 'queue') {
            // Clear due date or set to far future
            newDueDate = null; // or set to a far future date
        }
        // For 'done', keep the existing due date

        // Update task in database (status and due date)
        try {
            // Use updateTask to update both status and due date
            const { updateTask } = await import('@/app/actions');
            const updateData: any = {
                status: newStatus
            };
            // Only include dueDate if it's not null (null means clear it, undefined means don't change)
            if (newDueDate !== undefined) {
                updateData.dueDate = newDueDate || null; // null to clear, or a date string
            }
            const result = await updateTask(taskId, updateData);
            
            if (result.error) {
                console.error('[DRAG] Error updating task:', result.error);
                toast.error('Failed to update task');
                return; // Don't update UI if database update failed
            }
        } catch (error) {
            console.error('[DRAG] Error updating task:', error);
            toast.error('Failed to update task');
            return;
        }

        // Update task IMMEDIATELY (after successful DB update)
        let updatedTask = { 
            ...task, 
            list_id: newListId,
            status: newStatus,
            dueDate: newDueDate
        };
        
        // Update task in state IMMEDIATELY so it appears in the new column
        // Use functional update to ensure we have the latest state
        updateTasks((currentTasks) => {
            return currentTasks.map(t => t.id === taskId ? updatedTask : t);
        });
        console.log('[DRAG] Task state updated immediately');

        // Handle calendar events asynchronously (don't block UI update)
        if (isMovingToDone && task.googleEventIds && task.googleEventIds.length > 0) {
            // Delete calendar events
            handleDeleteCalendarEvents(task.googleEventIds).then((deleted) => {
                if (deleted) {
                    toast.success('Calendar events removed');
                    // Update task to clear event IDs using functional update
                    updateTasks((currentTasks) => {
                        const finalTask = { ...updatedTask, googleEventIds: [] };
                        return currentTasks.map(t => t.id === taskId ? finalTask : t);
                    });
                }
            }).catch((error) => {
                console.error('[DRAG] Error deleting calendar events:', error);
            });
        } else if (isMovingFromDone && task.duration) {
            // Re-schedule the task
            handleRescheduleTask(updatedTask).then((rescheduled) => {
                if (rescheduled) {
                    toast.success('Task re-scheduled in calendar');
                    // Task should already be updated, but ensure state is synced
                    // The updateTasks call above already handled the state update
                }
            }).catch((error) => {
                console.error('[DRAG] Error re-scheduling task:', error);
            });
        }
    }, [tasks, mapListIdToStatus, initialLists, updateTasks, handleDeleteCalendarEvents, handleRescheduleTask, categorizeTask]);

    // Get tags from props (pre-loaded) or load from cache/database
    // Start with preloaded tags if available, otherwise empty array
    const [allTagsWithColors, setAllTagsWithColors] = useState<{ name: string; color: string }[]>(preloadedTags || []);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoadingTags, setIsLoadingTags] = useState(!preloadedTags || preloadedTags.length === 0);
    
    useEffect(() => {
        // Mark as mounted to prevent hydration mismatch
        setIsMounted(true);
        
        // If we have preloaded tags, use them immediately (no loading needed)
        if (preloadedTags && preloadedTags.length > 0) {
            console.log('[Board] Using preloaded tags:', preloadedTags.length);
            setAllTagsWithColors(preloadedTags);
            setIsLoadingTags(false);
            return;
        }
        
        const loadTags = async () => {
            setIsLoadingTags(true);
            try {
                // Check cache first
                const { getCachedTags, setCachedTags } = await import('@/lib/tags-cache');
                const cachedTags = getCachedTags();
                
                if (cachedTags && cachedTags.length > 0) {
                    console.log('[Board] Using cached tags:', cachedTags.length);
                    // Still need to combine with task tags
                    const taskTagsMap = new Map<string, { name: string; color: string }>();
                    tasks.forEach((task: any) => {
                        if (task.tags && Array.isArray(task.tags)) {
                            task.tags.forEach((tag: any) => {
                                const tagName = typeof tag === 'string' ? tag : tag.name;
                                if (tagName && !taskTagsMap.has(tagName)) {
                                    const cachedTag = cachedTags.find((t: any) => t.name === tagName);
                                    const tagColor = typeof tag === 'object' && tag.color 
                                        ? tag.color 
                                        : cachedTag?.color || getTagColor(tagName);
                                    taskTagsMap.set(tagName, {
                                        name: tagName,
                                        color: tagColor
                                    });
                                }
                            });
                        }
                    });
                    
                    // Combine cached tags with task tags
                    const combinedTags = new Map<string, { name: string; color: string }>();
                    cachedTags.forEach((tag: any) => {
                        combinedTags.set(tag.name, tag);
                    });
                    taskTagsMap.forEach((tag, name) => {
                        if (!combinedTags.has(name)) {
                            combinedTags.set(name, tag);
                        }
                    });
                    
                    const finalTags = Array.from(combinedTags.values());
                    setAllTagsWithColors(finalTags);
                    setIsLoadingTags(false);
                    return;
                }
                
                // Cache miss - fetch from database
                const { getUserTags } = await import('@/app/actions');
                const { tags: dbTags, error } = await getUserTags();
                
                if (error) {
                    console.error('[Board] Error loading tags from database:', error);
                    // Fallback to localStorage if database fails
                    const managedTags = getAllTagsWithColors();
                    setAllTagsWithColors(managedTags);
                    setIsLoadingTags(false);
                    return;
                }
                
                console.log('[Board] Loaded tags from database:', dbTags.length, dbTags.map((t: any) => t.name));
                
                // Also extract tags from actual tasks (in case some tags aren't in database yet)
                const taskTagsMap = new Map<string, { name: string; color: string }>();
                tasks.forEach((task: any) => {
                    if (task.tags && Array.isArray(task.tags)) {
                        task.tags.forEach((tag: any) => {
                            const tagName = typeof tag === 'string' ? tag : tag.name;
                            if (tagName && !taskTagsMap.has(tagName)) {
                                // Use color from tag if available, otherwise get from database tags or generate
                                const dbTag = dbTags.find((t: any) => t.name === tagName);
                                const tagColor = typeof tag === 'object' && tag.color 
                                    ? tag.color 
                                    : dbTag?.color || getTagColor(tagName);
                                taskTagsMap.set(tagName, {
                                    name: tagName,
                                    color: tagColor
                                });
                            }
                        });
                    }
                });
                console.log('[Board] Extracted tags from tasks:', taskTagsMap.size, Array.from(taskTagsMap.keys()));
                
                // If database is empty but we have tags in tasks, save them to database
                if (dbTags.length === 0 && taskTagsMap.size > 0) {
                    console.log('[Board] ⚠️ No tags in database, but found tags in tasks. Saving to database...');
                    const { saveUserTag } = await import('@/app/actions');
                    for (const [tagName, tag] of taskTagsMap) {
                        await saveUserTag(tagName, tag.color);
                    }
                    console.log('[Board] ✅ Saved', taskTagsMap.size, 'tags to database');
                    // Reload tags from database
                    const { tags: updatedTags } = await getUserTags();
                    dbTags.push(...(updatedTags || []));
                }
                
                // Combine database tags and task tags, with database tags taking precedence for colors
                const combinedTags = new Map<string, { name: string; color: string }>();
                
                // First add all database tags
                dbTags.forEach((tag: any) => {
                    combinedTags.set(tag.name, {
                        name: tag.name,
                        color: tag.color || getTagColor(tag.name)
                    });
                });
                
                // Then add task tags that aren't in database
                taskTagsMap.forEach((tag, name) => {
                    if (!combinedTags.has(name)) {
                        combinedTags.set(name, tag);
                    }
                });
                
                const finalTags = Array.from(combinedTags.values());
                console.log('[Board] Final combined tags:', finalTags.length, finalTags.map(t => t.name));
                setAllTagsWithColors(finalTags);
                
                // Update cache with database tags (not task tags)
                const dbTagsFormatted = dbTags.map((t: any) => ({
                    name: t.name,
                    color: t.color || getTagColor(t.name)
                }));
                setCachedTags(dbTagsFormatted);
            } catch (error) {
                console.error('[Board] Error loading tags:', error);
                // Fallback to localStorage
                const managedTags = getAllTagsWithColors();
                setAllTagsWithColors(managedTags);
            } finally {
                setIsLoadingTags(false);
            }
        };
        
        // Load tags immediately after mount
        loadTags();
        
        // Listen for custom events (when tags are updated)
        const handleTagUpdate = async () => {
            // Clear cache when tags are updated
            const { clearTagsCache } = await import('@/lib/tags-cache');
            clearTagsCache();
            loadTags();
        };
        
        window.addEventListener('tagsUpdated', handleTagUpdate);
        
        return () => {
            window.removeEventListener('tagsUpdated', handleTagUpdate);
        };
    }, [tasks, preloadedTags]); // Re-run when tasks or preloaded tags change

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-full min-h-0">
                {/* Global Tags Section - Always render container to prevent layout shift */}
                <div className="px-3 sm:px-4 md:px-5 lg:px-6 pt-3 sm:pt-4 md:pt-5 lg:pt-6 pb-2 sm:pb-2.5 md:pb-3 flex-shrink-0 min-h-[44px]">
                    {isMounted && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {/* All Tasks button - Always show */}
                            <button
                                onClick={() => onSelectTag?.(undefined)}
                                className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border transition-all ${
                                    !selectedTag
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-50'
                                }`}
                            >
                                All Tasks
                            </button>
                            {/* Show loading skeleton or tags */}
                            {isLoadingTags ? (
                                <div className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border bg-gray-100 text-gray-400 border-gray-300 animate-pulse">
                                    Loading...
                                </div>
                            ) : (
                                allTagsWithColors.length > 0 && allTagsWithColors.map((tag) => {
                                    const isSelected = selectedTag === tag.name;
                                    return (
                                        <button
                                            key={tag.name}
                                            onClick={() => onSelectTag?.(isSelected ? undefined : tag.name)}
                                            className={`text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border transition-all ${
                                                isSelected
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-700 border-gray-400 hover:bg-gray-50'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Tab Bar - Only show on mobile (below md) */}
                <div className="md:hidden px-3 sm:px-4 pt-2 pb-3 flex-shrink-0 border-b border-slate-200">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {initialLists.map((list) => {
                            const isActive = mobileSelectedTab === list.id;
                            // Use the list title directly (already uppercase)
                            const displayName = list.title.toUpperCase();
                            
                            return (
                                <button
                                    key={list.id}
                                    onClick={() => setMobileSelectedTab(list.id)}
                                    className={`flex-1 px-4 py-2 text-xs font-bold tracking-wider uppercase rounded transition-all ${
                                        isActive
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {displayName}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Columns - Stack vertically on mobile (single tab), horizontal on tablet+ */}
                <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-5 lg:gap-6 px-3 sm:px-4 md:px-5 lg:px-6 pb-4 sm:pb-6 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden">
                    {initialLists.map((list) => {
                        // On mobile, only show the selected tab's column
                        const shouldShow = isMobile ? mobileSelectedTab === list.id : true;
                        
                        if (!shouldShow) return null;
                        
                        return (
                            <Column 
                                key={list.id} 
                                id={list.id} 
                                title={list.title} 
                                tasks={tasksByList[list.id] || []} 
                                workspaceId={workspaceId}
                                onCreateTask={handleCreateTask}
                                onUpdateTask={handleUpdateTask}
                                onDeleteTask={handleDeleteTask}
                                allTags={allTags}
                                createDialogOpen={createDialogOpen && createDialogListId === list.id}
                                onCreateDialogOpenChange={(open) => {
                                    if (open) {
                                        setCreateDialogListId(list.id);
                                        setCreateDialogOpen(true);
                                    } else {
                                        setCreateDialogOpen(false);
                                    }
                                }}
                                onRefreshTasks={onRefreshTasks}
                            />
                        );
                    })}
                </div>
            </div>
            <DragOverlay>
                {activeTask ? (
                    <div className="bg-white p-4 rounded-md shadow-lg border border-gray-200 opacity-90 rotate-2">
                        <h3 className="text-[15px] font-semibold text-gray-800">{activeTask.title}</h3>
        </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
