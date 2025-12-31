'use client'

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock, User, CalendarCheck, GripVertical, Trash2, ChevronRight, CheckCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditTaskDialog } from '@/components/edit-task-dialog'
import { DeleteTaskDialog } from '@/components/delete-task-dialog'
import { scheduleTask } from '@/app/actions'
import toast from 'react-hot-toast'

interface TaskCardProps {
    task: {
        id: string
        title: string
        tags: { name: string; color: string }[]
        dueDate?: string
        duration?: number // minutes
        list_id?: string
        googleEventIds?: string[] // Store calendar event IDs
    }
    onEdit?: (task: any) => void
    onDelete?: (taskId: string) => void
    allTags?: string[] // All existing tags from all tasks
    columnId?: string // The column this task is in (for quick actions)
    onMoveTask?: (task: any) => void // Handler for moving tasks between columns
    onRefreshTasks?: () => Promise<void> // Direct refresh function for quick actions
}

export function TaskCard({ task, onEdit, onDelete, allTags = [], columnId, onMoveTask, onRefreshTasks }: TaskCardProps) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const touchStartRef = useRef<number | null>(null);
    const hasMovedRef = useRef(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    // Detect mobile breakpoint
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isDone = task.list_id === 'done';
    
    // Calculate if task is "at risk" - likely to be missed
    const isAtRisk = (() => {
        if (isDone || !task.dueDate || !task.duration) return false;
        
        try {
            const dueDate = new Date(task.dueDate);
            const now = new Date();
            const timeUntilDue = dueDate.getTime() - now.getTime();
            
            // If due date is in the past, it's at risk
            if (timeUntilDue < 0) return true;
            
            // Calculate available working hours until due date
            // Assume 9 hours per day (9 AM to 6 PM)
            const workingHoursPerDay = 9;
            const workingMinutesPerDay = workingHoursPerDay * 60;
            
            // Calculate days until due (excluding today if it's past working hours)
            const daysUntilDue = Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24));
            
            // If less than 1 day, check if we have enough hours today
            if (daysUntilDue === 0) {
                const hoursRemainingToday = Math.max(0, 18 - now.getHours());
                return task.duration > hoursRemainingToday * 60;
            }
            
            // Calculate total available minutes
            const availableMinutes = daysUntilDue * workingMinutesPerDay;
            
            // Task is at risk if duration exceeds available time
            // Add 20% buffer for safety
            return task.duration > availableMinutes * 0.8;
        } catch {
            return false;
        }
    })();
    
    // Get status stripe color based on column (thick left border)
    const getStatusStripeColor = () => {
        // At-risk tasks get red border
        if (isAtRisk) return 'border-l-4 border-l-red-500';
        if (task.list_id === 'todo') return 'border-l-4 border-l-slate-400';
        if (task.list_id === 'in-progress') return 'border-l-4 border-l-amber-500';
        if (task.list_id === 'done') return 'border-l-4 border-l-emerald-500';
        return 'border-l-4 border-l-slate-400'; // default
    };

    const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
        // Don't open edit if clicking on schedule button or delete button
        if ((e.target as HTMLElement).closest('.schedule-button') || 
            (e.target as HTMLElement).closest('.delete-button') ||
            (e.target as HTMLElement).closest('.drag-handle') ||
            (e.target as HTMLElement).closest('.quick-action-button')) {
            return;
        }
        
        // Don't open if we're currently dragging or if we moved during touch
        if (isDragging || hasMovedRef.current) {
            hasMovedRef.current = false;
            touchStartRef.current = null;
            return;
        }
        
        // For touch events, check if it was a quick tap (not a long press)
        if (e.type === 'touchend' && touchStartRef.current) {
            const touchDuration = Date.now() - touchStartRef.current;
            // If touch was held for more than 400ms, it might have been a long press attempt
            // (Our drag activation is 500ms, so 400ms is safe threshold)
            if (touchDuration > 400) {
                touchStartRef.current = null;
                return;
            }
        }
        
        touchStartRef.current = null;
        hasMovedRef.current = false;
        
        if (onEdit) {
            setIsEditDialogOpen(true);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = Date.now();
        hasMovedRef.current = false;
    };

    const handleTouchMove = () => {
        // If user moves finger during touch, mark as moved (likely a drag attempt)
        if (touchStartRef.current) {
            hasMovedRef.current = true;
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        
        if (!onDelete) return;
        
        // Open delete confirmation dialog
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!onDelete) return;
        
        setIsDeleting(true);
        // Delete the task (Board will handle calendar event deletion)
        await onDelete(task.id);
        setIsDeleteDialogOpen(false);
        setIsDeleting(false);
    };

    const handleUpdate = (updatedTask: any) => {
        if (onEdit) {
            onEdit(updatedTask);
        }
        setIsEditDialogOpen(false);
    };

    const handleSchedule = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        
        console.log('[CLIENT] Schedule button clicked');
        console.log('[CLIENT] Task data:', {
            id: task.id,
            title: task.title,
            duration: task.duration,
            dueDate: task.dueDate,
            list_id: task.list_id
        });
        
        if (!task.duration) {
            console.warn('[CLIENT] Task has no duration');
            toast.error('Task must have a duration to schedule');
            return;
        }

        // Get access token and refresh token from localStorage
        const accessToken = localStorage.getItem('google_calendar_token');
        const refreshToken = localStorage.getItem('google_calendar_refresh_token');
        
        console.log('[CLIENT] Token check:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length || 0
        });
        
        if (!accessToken) {
            console.error('[CLIENT] No access token found');
            toast.error('Google Calendar not connected. Please connect in Settings first.');
            return;
        }

        setIsScheduling(true);
        console.log('[CLIENT] Calling scheduleTask server action...');
        
        try {
            // Get working hours and timezone from localStorage
            const workingHoursStart = localStorage.getItem('working_hours_start') || '09:00';
            const workingHoursEnd = localStorage.getItem('working_hours_end') || '18:00';
            const userTimezone = localStorage.getItem('user_timezone') || 
                                 Intl.DateTimeFormat().resolvedOptions().timeZone || 
                                 'America/New_York';
            
            console.log('[CLIENT] Scheduling with timezone:', userTimezone);

            const result = await scheduleTask({
                id: task.id,
                title: task.title,
                duration: task.duration,
                dueDate: task.dueDate,
                list_id: task.list_id || 'todo'
            }, accessToken, refreshToken || undefined, workingHoursStart, workingHoursEnd, userTimezone);
            
            console.log('[CLIENT] Schedule result received:', result);

            if (result.success) {
                toast.success(result.message);
                // Update task with event IDs
                if ('eventIds' in result && result.eventIds && onEdit) {
                    onEdit({ ...task, googleEventIds: result.eventIds });
                }
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error('Schedule error:', error);
            toast.error('Failed to schedule task. Please check your calendar connection.');
        } finally {
            setIsScheduling(false);
        }
    };

    // Quick action handler for mobile
    const handleQuickAction = async (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation(); // Prevent opening edit dialog
        e.preventDefault(); // Prevent any default behavior
        
        // Also prevent the card click handler from firing
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
        }
        
        if (!columnId) {
            console.warn('[QuickAction] No columnId provided');
            return;
        }

        let newStatus: string;
        let newListId: string;
        
        // Map actions based on current column
        if (columnId === 'todo') {
            // QUEUE → ACTIVE (Play button)
            newStatus = 'in_progress';
            newListId = 'in-progress';
        } else if (columnId === 'in-progress') {
            // ACTIVE → SHIPPED (Check button)
            newStatus = 'done';
            newListId = 'done';
        } else if (columnId === 'done') {
            // SHIPPED → ACTIVE (Rewind button)
            newStatus = 'in_progress';
            newListId = 'in-progress';
        } else {
            return; // Unknown column
        }

        // Optimistic update: Update UI immediately for instant feedback
        const updatedTask = {
            ...task,
            status: newStatus,
            list_id: newListId,
            title: task.title,
            dueDate: task.dueDate,
            duration: task.duration,
            tags: task.tags || []
        };
        
        // Update UI immediately (optimistic)
        if (onMoveTask) {
            onMoveTask(updatedTask);
        }
        
        // Show success immediately
        toast.success('Task moved', { duration: 2000 });
        
        // Update database in background
        try {
            console.log('[QuickAction] Moving task:', {
                taskId: task.id,
                fromColumn: columnId,
                toStatus: newStatus,
                toListId: newListId
            });
            
            const { updateTaskStatus, deleteCalendarEvents } = await import('@/app/actions');
            const result = await updateTaskStatus(task.id, newStatus);
            
            if (result.error) {
                console.error('[QuickAction] Error updating status:', result.error);
                // Rollback optimistic update by refreshing from server
                if (onRefreshTasks) {
                    await onRefreshTasks();
                }
                toast.error(result.error);
            } else {
                console.log('[QuickAction] Status updated successfully');
                
                // If moving to 'done' and task had calendar events, delete them
                if (newStatus === 'done' && result.hadCalendarEvents && result.calendarEventIds && result.calendarEventIds.length > 0) {
                    console.log('[QuickAction] Task moved to done - deleting calendar events:', result.calendarEventIds);
                    
                    const accessToken = localStorage.getItem('google_calendar_token');
                    if (accessToken) {
                        // Delete calendar events in background (don't block UI)
                        deleteCalendarEvents(result.calendarEventIds, accessToken)
                            .then((deleteResult) => {
                                if (deleteResult.success) {
                                    console.log('[QuickAction] ✅ Calendar events deleted:', deleteResult.deleted);
                                    toast.success('Calendar events removed', { duration: 2000 });
                                } else {
                                    console.warn('[QuickAction] ⚠️ Some calendar events could not be deleted:', deleteResult.message);
                                }
                            })
                            .catch((error) => {
                                console.error('[QuickAction] Error deleting calendar events:', error);
                            });
                    } else {
                        console.warn('[QuickAction] No access token - cannot delete calendar events');
                    }
                }
                
                // Refresh in background to sync with server (no user wait)
                if (onRefreshTasks) {
                    // Don't await - let it happen in background
                    onRefreshTasks().catch(err => {
                        console.error('[QuickAction] Background refresh error:', err);
                    });
                }
            }
        } catch (error) {
            console.error('[QuickAction] Exception:', error);
            // Rollback optimistic update
            if (onRefreshTasks) {
                await onRefreshTasks();
            }
            toast.error('Failed to move task');
        }
    };

    // Determine which quick action button to show (mobile only)
    const getQuickActionButton = () => {
        if (!columnId || !isMobile) return null;

        if (columnId === 'todo') {
            // QUEUE: Show Play button (ChevronRight)
            return (
                <button
                    onClick={handleQuickAction}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleQuickAction(e);
                    }}
                    className="quick-action-button md:hidden h-10 w-10 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-all active:scale-95 z-10 relative"
                    style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                    title="Execute"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            );
        } else if (columnId === 'in-progress') {
            // ACTIVE: Show Check button (CheckCircle)
            return (
                <button
                    onClick={handleQuickAction}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleQuickAction(e);
                    }}
                    className="quick-action-button md:hidden h-10 w-10 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition-all active:scale-95 z-10 relative"
                    style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                    title="Mission Complete"
                >
                    <CheckCircle className="w-5 h-5" />
                </button>
            );
        } else if (columnId === 'done') {
            // SHIPPED: Show Rewind button (RotateCcw)
            return (
                <button
                    onClick={handleQuickAction}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                    onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleQuickAction(e);
                    }}
                    className="quick-action-button md:hidden h-10 w-10 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-all active:scale-95 z-10 relative"
                    style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                    title="Move to Active"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            );
        }
        
        return null;
    };

    return (
        <>
            <div 
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "p-3 sm:p-3.5 md:p-4 pl-10 sm:pl-12 md:pl-14 rounded-md shadow-none border-t border-r border-b border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-grab active:cursor-grabbing group relative w-full",
                    getStatusStripeColor(),
                    isDone ? "bg-gray-900/30 opacity-50 grayscale" : "bg-gray-900",
                    isDragging && "scale-105 opacity-50"
                )}
                onClick={handleCardClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleCardClick}
            >
                {/* Drag handle - visual indicator only, whole card is draggable */}
                <div 
                    className="drag-handle absolute left-0 top-0 bottom-0 w-10 sm:w-12 md:w-14 flex items-center justify-center z-10 pointer-events-none"
                >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                    </div>
                </div>
                
                {/* At Risk Indicator - positioned above title to avoid footer overlap */}
                {isAtRisk && (
                    <div className="absolute top-2 left-12 sm:left-14 md:left-16 z-20">
                        <div className="bg-red-500 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm">
                            AT RISK
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end items-start mb-2 sm:mb-3 gap-2">
                    <div className="flex items-center gap-1">
                        {task.duration && !isDone && (
                            <button
                                onClick={handleSchedule}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                disabled={isScheduling}
                                className="schedule-button opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-800 rounded-md text-emerald-500 hover:text-emerald-400 transition-all disabled:opacity-50 pointer-events-auto"
                                title="Schedule in Google Calendar"
                            >
                                <CalendarCheck className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {/* Quick Action Button (Mobile Only) */}
                    {getQuickActionButton()}
            </div>

                {/* Task Title */}
                <h3 className={cn(
                    "text-sm sm:text-[15px] font-semibold text-white mb-3 sm:mb-4 leading-snug pr-16 sm:pr-20",
                    isDone && "line-through text-gray-500",
                    isAtRisk && !isDone && "text-red-400"
                )}>
                {task.title}
            </h3>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-800">
                    <div className="flex items-center gap-2 sm:gap-4">
                        {task.dueDate && (() => {
                            // Format date for display
                            let displayDate = task.dueDate;
                            let dateColor = 'text-gray-400';
                            
                            try {
                                // Handle ISO date strings (YYYY-MM-DD)
                                if (task.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                    const dueDate = new Date(task.dueDate + 'T00:00:00');
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const tomorrow = new Date(today);
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const yesterday = new Date(today);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    
                                    dueDate.setHours(0, 0, 0, 0);
                                    
                                    if (dueDate.getTime() === today.getTime()) {
                                        displayDate = 'Today';
                                        dateColor = 'text-orange-500';
                                    } else if (dueDate.getTime() === tomorrow.getTime()) {
                                        displayDate = 'Tomorrow';
                                        dateColor = 'text-gray-400';
                                    } else if (dueDate.getTime() === yesterday.getTime()) {
                                        displayDate = 'Yesterday';
                                        dateColor = 'text-red-500';
                                    } else {
                                        // Format as "Dec 1" for other dates
                                        displayDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    }
                                } else {
                                    // Legacy format support (Today, Tomorrow, Yesterday)
                                    if (task.dueDate === 'Today') {
                                        dateColor = 'text-orange-500';
                                    } else if (task.dueDate === 'Yesterday') {
                                        dateColor = 'text-red-500';
                                    }
                                }
                            } catch (e) {
                                // If parsing fails, use original value
                            }
                            
                            return (
                                <div className={cn(
                                    "flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium",
                                    dateColor,
                                    isDone && "opacity-50"
                                )}>
                                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span className="font-mono">{displayDate}</span>
                                </div>
                            );
                        })()}

                        {task.duration && (
                            <div className={cn(
                                "flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-400 font-medium",
                                isDone && "opacity-50"
                            )}>
                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                <span className="font-mono">{formatDuration(task.duration)}</span>
                        </div>
                    )}
                </div>

                    {/* Delete Button - appears on hover */}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="delete-button opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 hover:bg-red-50 rounded-md text-red-500 hover:text-red-600 transition-all pointer-events-auto"
                            title="Delete task"
                        >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                )}
            </div>
        </div>

            {onEdit && (
                <EditTaskDialog
                    task={task}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onUpdateTask={handleUpdate}
                    allTags={allTags}
                />
            )}
            {onDelete && (
                <DeleteTaskDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={setIsDeleteDialogOpen}
                    taskTitle={task.title}
                    onConfirm={handleConfirmDelete}
                    isDeleting={isDeleting}
                />
            )}
        </>
    )
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}
