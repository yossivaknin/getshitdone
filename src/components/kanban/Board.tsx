'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import { getAllTagsWithColors, getLightTagColor } from '@/lib/tags';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
}

export function Board({ lists: initialLists, tasks: initialTasks, workspaceId, selectedTag, onTasksChange, allTags = [], onSelectTag }: BoardProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const skipSyncRef = useRef(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createDialogListId, setCreateDialogListId] = useState<string>('todo'); // Default to first column
    
    // Sync with external changes, but skip if we just made a local update
    useEffect(() => {
        if (skipSyncRef.current) {
            skipSyncRef.current = false;
            return;
        }
        
        // Only sync if tasks have actually changed (different IDs or count)
        setTasks((currentTasks) => {
            const currentTaskIds = currentTasks.map((t: any) => t.id).sort().join(',');
            const newTaskIds = initialTasks.map((t: any) => t.id).sort().join(',');
            
            // Only update if IDs or count actually changed
            if (currentTaskIds !== newTaskIds || initialTasks.length !== currentTasks.length) {
                return initialTasks;
            }
            return currentTasks;
        });
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
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px of movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    // Filter tasks by selected tag
    const filteredTasks = selectedTag
        ? tasks.filter((task: any) => 
            task.tags?.some((tag: any) => tag.name === selectedTag)
          )
        : tasks;
    
    // Group tasks by listId
    const tasksByList = (initialLists || []).reduce((acc: any, list: any) => {
        acc[list.id] = (filteredTasks || []).filter((task: any) => task.list_id === list.id);
        return acc;
    }, {});

    const handleCreateTask = async (newTask: any) => {
        try {
            // Map list_id to status for database
            const status = newTask.list_id || 'todo';
            
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
                // onTasksChange can be either a refresh function or state updater
                if (typeof onTasksChange === 'function' && onTasksChange.length === 0) {
                    await (onTasksChange as () => Promise<void>)();
                } else {
                    // For backward compatibility, if it's the old signature, trigger refresh by calling with empty array
                    // The parent will handle the refresh
                    window.location.reload(); // Simple refresh for now
                }
            }
            
            // Return the created task with its database ID
            return result.task;
        } catch (error: any) {
            console.error('Error creating task:', error);
            toast.error('Failed to create task');
            return null;
        }
    };

    const handleUpdateTask = async (updatedTask: any) => {
        try {
            // Map list_id to status for database
            const status = updatedTask.list_id || updatedTask.status || 'todo';
            
            const result = await updateTask(updatedTask.id, {
                title: updatedTask.title,
                description: updatedTask.description,
                status: status,
                dueDate: updatedTask.dueDate,
                duration: updatedTask.duration,
                tags: updatedTask.tags?.map((t: any) => t.name) || []
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
    };

    const handleDeleteTask = async (taskId: string) => {
        // Find the task to get its calendar event IDs
        const task = tasks.find((t: any) => t.id === taskId);
        
        // Delete calendar events if they exist
        if (task?.googleEventIds && task.googleEventIds.length > 0) {
            const accessToken = localStorage.getItem('google_calendar_token');
            if (accessToken) {
                try {
                    for (const eventId of task.googleEventIds) {
                        await fetch(
                            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                            {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                            }
                        );
                    }
                } catch (error) {
                    console.error('Error deleting calendar events:', error);
                }
            }
        }

        // Delete from database
        try {
            const result = await deleteTask(taskId);
            if (result.error) {
                toast.error('Failed to delete task: ' + result.error);
                return;
            }

            toast.success('Task deleted successfully');
            // Refresh tasks from database
            if (onTasksChange) {
                // onTasksChange is now a refresh function, call it
                await onTasksChange();
            }
        } catch (error: any) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        }
    };

    const handleDragStart = (event: any) => {
        const { active } = event;
        const task = tasks.find((t: any) => t.id === active.id);
        setActiveTask(task);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
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

        // Check if we're moving to or from "done" column
        const isMovingToDone = newListId === 'done';
        const isMovingFromDone = oldListId === 'done';

        // Update task status in database
        try {
            const result = await updateTaskStatus(taskId, newListId);
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
    };

    const handleDeleteCalendarEvents = async (eventIds: string[]): Promise<boolean> => {
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
    };

    const handleRescheduleTask = async (task: any): Promise<boolean> => {
        const accessToken = localStorage.getItem('google_calendar_token');
        const refreshToken = localStorage.getItem('google_calendar_refresh_token');
        
        if (!accessToken || !task.duration) {
            console.warn('[DRAG] Cannot re-schedule: missing token or duration');
            return false;
        }

        console.log('[DRAG] Re-scheduling task:', task.title);

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
                    list_id: task.list_id
                },
                accessToken,
                refreshToken || undefined,
                workingHoursStart,
                workingHoursEnd
            );

            if (result.success && result.eventIds) {
                // Update task with new event IDs using functional update to get latest state
                updateTasks((currentTasks) => {
                    const updatedTask = { ...task, googleEventIds: result.eventIds };
                    return currentTasks.map(t => t.id === task.id ? updatedTask : t);
                });
                console.log('[DRAG] ✅ Re-scheduled task with events:', result.eventIds);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[DRAG] Error re-scheduling task:', error);
            return false;
        }
    };

    // Get managed tags from localStorage (synced across app)
    // Start with empty array to match server render, load after mount
    const [allTagsWithColors, setAllTagsWithColors] = useState<{ name: string; color: string }[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        // Mark as mounted to prevent hydration mismatch
        setIsMounted(true);
        
        const loadTags = () => {
            setAllTagsWithColors(getAllTagsWithColors());
        };
        
        // Load tags immediately after mount
        loadTags();
        
        // Listen for storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'getshitdone_tags') {
                loadTags();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('tagsUpdated', loadTags);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('tagsUpdated', loadTags);
        };
    }, []);

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
                    {isMounted && allTagsWithColors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {/* All Tasks button */}
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
                            {allTagsWithColors.map((tag) => {
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

                {/* Columns - Stack vertically on mobile, horizontal on tablet+ */}
                <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-5 lg:gap-6 px-3 sm:px-4 md:px-5 lg:px-6 pb-4 sm:pb-6 overflow-y-auto md:overflow-x-auto md:overflow-y-hidden">
                    {initialLists.map((list) => (
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
                        />
                    ))}
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
