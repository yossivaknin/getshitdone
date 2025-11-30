'use client'

import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock, User, CalendarCheck, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditTaskDialog } from '@/components/edit-task-dialog'
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
}

export function TaskCard({ task, onEdit, onDelete, allTags = [] }: TaskCardProps) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isDone = task.list_id === 'done';
    
    // Get status stripe color based on column (thick left border)
    const getStatusStripeColor = () => {
        if (task.list_id === 'todo') return 'border-l-4 border-l-slate-400';
        if (task.list_id === 'in-progress') return 'border-l-4 border-l-amber-500';
        if (task.list_id === 'done') return 'border-l-4 border-l-emerald-500';
        return 'border-l-4 border-l-slate-400'; // default
    };

    const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
        // Don't open edit if clicking on schedule button or delete button
        if ((e.target as HTMLElement).closest('.schedule-button') || 
            (e.target as HTMLElement).closest('.delete-button') ||
            (e.target as HTMLElement).closest('.drag-handle')) {
            return;
        }
        
        // Don't open if we're currently dragging
        if (isDragging) {
            return;
        }
        
        // Don't open if clicking on drag handle area (left side)
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = 'touches' in e ? e.touches[0]?.clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        if (clickX < 50) { // Left 50px is drag handle area
            return;
        }
        
        if (onEdit) {
            setIsEditDialogOpen(true);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        
        if (!onDelete) return;
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
            return;
        }

        // Delete the task (Board will handle calendar event deletion)
        onDelete(task.id);
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
            const result = await scheduleTask({
                id: task.id,
                title: task.title,
                duration: task.duration,
                dueDate: task.dueDate,
                list_id: task.list_id || 'todo'
            }, accessToken, refreshToken || undefined);
            
            console.log('[CLIENT] Schedule result received:', result);

            if (result.success) {
                toast.success(result.message);
                // Update task with event IDs
                if (result.eventIds && onEdit) {
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

    return (
        <>
            <div 
                ref={setNodeRef}
                style={style}
                {...attributes}
                className={cn(
                    "p-3 sm:p-3.5 md:p-4 pl-6 sm:pl-7 md:pl-8 rounded-md shadow-none border-t border-r border-b border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer group relative w-full",
                    getStatusStripeColor(),
                    isDone ? "bg-slate-50 opacity-50 grayscale" : "bg-white",
                    isDragging && "scale-105 opacity-50"
                )}
                onClick={handleCardClick}
                onTouchEnd={handleCardClick}
            >
                {/* Drag handle - only this area is draggable */}
                <div 
                    {...listeners}
                    className="drag-handle absolute left-0 top-0 bottom-0 w-12 sm:w-14 md:w-16 cursor-grab active:cursor-grabbing flex items-center justify-center z-10"
                >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end items-start mb-2 sm:mb-3">
                    <div className="flex items-center gap-1">
                        {task.duration && !isDone && (
                            <button
                                onClick={handleSchedule}
                                disabled={isScheduling}
                                className="schedule-button opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-md text-blue-500 hover:text-blue-600 transition-all disabled:opacity-50"
                                title="Schedule in Google Calendar"
                            >
                                <CalendarCheck className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Task Title */}
                <h3 className={cn(
                    "text-sm sm:text-[15px] font-semibold text-gray-800 mb-3 sm:mb-4 leading-snug",
                    isDone && "line-through text-gray-400"
                )}>
                    {task.title}
                </h3>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-50">
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
                            className="delete-button opacity-0 group-hover:opacity-100 p-1 sm:p-1.5 hover:bg-red-50 rounded-md text-red-500 hover:text-red-600 transition-all"
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
