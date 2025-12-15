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
    onSelectTag?: (tagName: string | undefined) => void // Add tag selection handler
    createDialogOpen?: boolean // External control of create dialog (for keyboard shortcuts)
    onCreateDialogOpenChange?: (open: boolean) => void // Callback when create dialog state changes
    onRefreshTasks?: () => Promise<void> // Direct refresh function for quick actions
}

export function Board({ lists: initialLists, tasks: initialTasks, workspaceId, selectedTag, onTasksChange, allTags = [], onSelectTag, createDialogOpen: externalCreateDialogOpen, onCreateDialogOpenChange, onRefreshTasks }: BoardProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const skipSyncRef = useRef(false);
    const [internalCreateDialogOpen, setInternalCreateDialogOpen] = useState(false);
    const [createDialogListId, setCreateDialogListId] = useState<string>('todo'); // Default to first column
    const [mobileSelectedTab, setMobileSelectedTab] = useState<string>('todo'); // Mobile tab selection
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
    // UI uses 'in-progress' (hyphen), DB uses 'in_progress' (underscore)
    // Memoized to avoid recreation on every render
    const mapListIdToStatus = useCallback((listId: string): string => {
        if (listId === 'in-progress') return 'in_progress';
        return listId; // 'todo' and 'done' are the same
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
    
    // Memoize task grouping to avoid recalculating on every render
    const tasksByList = useMemo(() => {
        const grouped = (initialLists || []).reduce((acc: any, list: any) => {
            const tasksForList = (filteredTasks || []).filter((task: any) => task.list_id === list.id);
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
    }, [filteredTasks, initialLists]);

    const handleCreateTask = useCallback(async (newTask: any) => {
        try {
            // Map list_id to status for database
            const listId = newTask.list_id || 'todo';
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
            const listId = updatedTask.list_id || updatedTask.status || 'todo';
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

        const oldListId = task.list_id;
        
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
            // Dropped on another task - find which column that task is in
            const targetTask = tasks.find((t: any) => t.id === overId);
            if (targetTask) {
                newListId = targetTask.list_id;
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

        // Update task status in database
        try {
            const result = await updateTaskStatus(taskId, newStatus);
            if (result.error) {
                console.error('[DRAG] Error updating task status:', result.error);
                toast.error('Failed to update task status');
                return; // Don't update UI if database update failed
            }
        } catch (error) {
            console.error('[DRAG] Error updating task status:', error);
            toast.error('Failed to update task status');
            return;
        }

        // Update task list_id IMMEDIATELY (after successful DB update)
        let updatedTask = { ...task, list_id: newListId };
        
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
    }, [tasks, mapListIdToStatus, initialLists, updateTasks, handleDeleteCalendarEvents, handleRescheduleTask]);

    // Get tags from database (synced across devices)
    // Start with empty array to match server render, load after mount
    const [allTagsWithColors, setAllTagsWithColors] = useState<{ name: string; color: string }[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        // Mark as mounted to prevent hydration mismatch
        setIsMounted(true);
        
        const loadTags = async () => {
            try {
                // Fetch tags from database
                const { getUserTags } = await import('@/app/actions');
                const { tags: dbTags, error } = await getUserTags();
                
                if (error) {
                    console.error('[Board] Error loading tags from database:', error);
                    // Fallback to localStorage if database fails
                    const managedTags = getAllTagsWithColors();
                    setAllTagsWithColors(managedTags);
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
            } catch (error) {
                console.error('[Board] Error loading tags:', error);
                // Fallback to localStorage
                const managedTags = getAllTagsWithColors();
                setAllTagsWithColors(managedTags);
            }
        };
        
        // Load tags immediately after mount
        loadTags();
        
        // Listen for custom events (when tags are updated)
        const handleTagUpdate = () => {
            loadTags();
        };
        
        window.addEventListener('tagsUpdated', handleTagUpdate);
        
        return () => {
            window.removeEventListener('tagsUpdated', handleTagUpdate);
        };
    }, [tasks]); // Re-run when tasks change to pick up new tags

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
                            {/* Show tags if they exist */}
                            {allTagsWithColors.length > 0 && allTagsWithColors.map((tag) => {
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
                            })}
                        </div>
                    )}
                </div>

                {/* Mobile Tab Bar - Only show on mobile (below md) */}
                <div className="md:hidden px-3 sm:px-4 pt-2 pb-3 flex-shrink-0 border-b border-slate-200">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {initialLists.map((list) => {
                            const isActive = mobileSelectedTab === list.id;
                            // Map list IDs to display names
                            const displayName = list.id === 'todo' ? 'QUEUE' : 
                                              list.id === 'in-progress' ? 'ACTIVE' : 
                                              list.id === 'done' ? 'SHIPPED' : list.title.toUpperCase();
                            
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
