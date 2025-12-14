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
}

export function Column({ title, tasks, id, workspaceId, onCreateTask, onUpdateTask, onDeleteTask, allTags = [], createDialogOpen, onCreateDialogOpenChange }: ColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div className="flex flex-col w-full md:min-w-[300px] md:w-[300px] lg:min-w-[320px] lg:w-[320px] md:h-full flex-shrink-0">
            <div className="flex items-center justify-between mb-3 sm:mb-4 px-3 sm:px-2 py-2 md:py-0 border-b md:border-b-0 border-gray-200 md:border-transparent flex-shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Color-coded indicator based on column title */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        id === 'todo' ? 'bg-blue-400' : 
                        id === 'in-progress' ? 'bg-yellow-400' : 
                        'bg-green-400'
                    }`} />
                    <h2 className="font-bold text-gray-700 text-sm sm:text-sm tracking-wide uppercase">{title}</h2>
                    <span className="ml-1.5 sm:ml-2 text-[10px] font-bold tracking-widest uppercase bg-white text-gray-700 border border-gray-400 px-1.5 py-0.5 rounded-[4px] font-mono flex-shrink-0">{tasks.length}</span>
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
                                className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-gray-700 transition-colors hover:shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        }
                    />
                    <button className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-gray-700 transition-colors hover:shadow-sm">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div 
                ref={setNodeRef}
                className="flex-1 space-y-2 sm:space-y-3 overflow-y-auto px-0 sm:px-1 pb-4 min-h-[100px] md:min-h-0"
            >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.length === 0 ? (
                        <div className="h-24 sm:h-32 border-2 border-dashed border-gray-200 rounded-md flex flex-col gap-1.5 sm:gap-2 items-center justify-center text-xs sm:text-sm text-gray-400 bg-gray-50/50 px-2">
                            <span className="text-center">{id === 'done' ? 'Sector Clear' : id === 'in-progress' ? 'Awaiting Orders' : 'No tasks yet'}</span>
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
                                        className="text-blue-500 hover:underline text-[10px] sm:text-xs"
                                    >
                                        Create one
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
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    )
}
