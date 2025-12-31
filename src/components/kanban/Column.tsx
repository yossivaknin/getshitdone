'use client'

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus } from 'lucide-react'
import { TaskCard } from './TaskCard'
import { CreateTaskDialog } from '@/components/create-task-dialog'

interface ColumnProps {
    title: string
    tasks: any[]
    id: string
    workspaceId: string
    onCreateTask: (task: any) => void
    onUpdateTask: (task: any) => void
    onDeleteTask?: (taskId: string) => void
    allTags?: string[] // All existing tags from all tasks
    createDialogOpen?: boolean // Controlled open state for keyboard shortcut
    onCreateDialogOpenChange?: (open: boolean) => void // Callback for open state changes
    onRefreshTasks?: () => Promise<void> // Direct refresh function for quick actions
}

export function Column({ title, tasks, id, workspaceId, onCreateTask, onUpdateTask, onDeleteTask, allTags = [], createDialogOpen, onCreateDialogOpenChange, onRefreshTasks }: ColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    // Format column title with count for "Focus" column
    const getColumnTitle = () => {
        if (id === 'today') {
            return `TODAY ${tasks.length}`;
        }
        if (id === 'this-week') {
            return `THIS WEEK ${tasks.length}`;
        }
        return title;
    };

    return (
        <div className="flex flex-col w-full md:min-w-[300px] md:w-[300px] lg:min-w-[320px] lg:w-[320px] md:h-full flex-shrink-0">
            <div className="flex items-center justify-between mb-4 px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                    {/* Green square indicator */}
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm flex-shrink-0" />
                    <h2 className="font-semibold text-white text-sm tracking-wide">{getColumnTitle()}</h2>
                </div>
                <div className="flex items-center gap-1">
                    <CreateTaskDialog 
                        listId={id} 
                        workspaceId={workspaceId} 
                        onCreateTask={onCreateTask}
                        allTags={allTags}
                        open={createDialogOpen}
                        onOpenChange={onCreateDialogOpenChange}
                        trigger={
                            <button 
                                type="button"
                                className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        }
                    />
                    <button className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div 
                ref={setNodeRef}
                className="flex-1 space-y-3 overflow-y-auto px-2 pb-4 min-h-[100px] md:min-h-0"
            >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.length === 0 ? (
                        <div className="h-32 border-2 border-dashed border-gray-800 rounded-md flex flex-col gap-2 items-center justify-center text-sm text-gray-500 bg-gray-900/30 px-2">
                            <span className="text-center">
                                {id === 'today' ? 'No tasks for today' :
                                 id === 'this-week' ? 'No tasks this week' :
                                 id === 'queue' ? 'No tasks in queue' : 'No tasks yet'}
                            </span>
                            <CreateTaskDialog 
                                listId={id} 
                                workspaceId={workspaceId} 
                                onCreateTask={onCreateTask}
                                allTags={allTags}
                                open={createDialogOpen}
                                onOpenChange={onCreateDialogOpenChange}
                                trigger={
                                    <button 
                                        type="button"
                                        className="text-emerald-500 hover:underline text-xs"
                                    >
                                        + Add task
                                    </button>
                                }
                            />
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <TaskCard 
                                key={task.id} 
                                task={{ ...task, list_id: task.list_id || id }} 
                                onEdit={onUpdateTask}
                                onDelete={onDeleteTask}
                                allTags={allTags}
                                columnId={id}
                                onMoveTask={onUpdateTask}
                                onRefreshTasks={onRefreshTasks}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    )
}
