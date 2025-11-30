'use client'

import { useState, useMemo } from 'react';
import { Board } from "@/components/kanban/Board";
import { ListsSidebar } from "@/components/lists-sidebar";
import { TagFilterSidebar } from "@/components/tag-filter-sidebar";
import Link from 'next/link';
import { Settings, ArrowLeft } from 'lucide-react';

// Mock data - in production this would come from your database
const mockLists = [
  { id: 'list-1', title: 'Work Projects', taskCount: 5 },
  { id: 'list-2', title: 'Personal', taskCount: 3 },
  { id: 'list-3', title: 'Learning', taskCount: 2 },
];

const initialMockTasks = [
  {
    id: '1',
    list_id: 'todo',
    title: 'Figure out the link for multi-user workspaces',
    tags: [{ name: 'Dev', color: 'bg-yellow-100 text-yellow-700' }],
    dueDate: 'Today',
    duration: 30,
    googleEventIds: [] // Will be populated when scheduled
  },
  {
    id: '2',
    list_id: 'todo',
    title: 'Personal Commitment Review',
    tags: [{ name: 'Personal', color: 'bg-red-100 text-red-700' }],
    dueDate: 'Tomorrow',
    duration: 60,
    googleEventIds: []
  },
  {
    id: '3',
    list_id: 'in-progress',
    title: 'E2E testing review',
    tags: [{ name: 'QA', color: 'bg-blue-100 text-blue-700' }],
    duration: 45,
    googleEventIds: []
  },
  {
    id: '4',
    list_id: 'done',
    title: 'Schedule an appointment for Sivan',
    tags: [{ name: 'Admin', color: 'bg-green-100 text-green-700' }],
    dueDate: 'Yesterday',
    duration: 15,
    googleEventIds: []
  }
];

// Kanban columns (these are the status columns within each list)
const kanbanColumns = [
  { id: 'todo', title: 'The Queue' },
  { id: 'in-progress', title: 'Active' },
  { id: 'done', title: 'Shipped' }
];

export default function ListDetailPage({ params }: { params: { listId: string } }) {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [lists] = useState(mockLists);
  const [tasks, setTasks] = useState(initialMockTasks);

  // Extract all tags from tasks with their colors (for TagFilterSidebar)
  const allTagsWithColors = useMemo(() => {
    const tagMap = new Map<string, { name: string; color: string }>();
    tasks.forEach(task => {
      task.tags?.forEach((tag: any) => {
        if (!tagMap.has(tag.name)) {
          tagMap.set(tag.name, { name: tag.name, color: tag.color });
        }
      });
    });
    return Array.from(tagMap.values());
  }, [tasks]);

  // Extract just tag names (for Board and components)
  const allTags = useMemo(() => {
    return allTagsWithColors.map(tag => tag.name);
  }, [allTagsWithColors]);
  
  const currentList = lists.find(l => l.id === params.listId) || lists[0];

  const handleCreateList = (title: string) => {
    console.log('Creating new list:', title);
    // In production, this would call an API to create the list
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F5F7]">
      <header className="px-8 py-6 flex items-center justify-between bg-transparent border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{currentList.title}</h1>
            <p className="text-base text-gray-500 mt-1">Kanban board view</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <button className="p-2 hover:bg-white rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm text-gray-600 font-medium">
            JS
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tag Filter */}
        <TagFilterSidebar
          tags={allTagsWithColors}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />

        {/* Main Content - Kanban Board */}
        <main className="flex-1 overflow-hidden">
          <Board 
            lists={kanbanColumns} 
            tasks={tasks}
            workspaceId="mock-workspace-id"
            selectedTag={selectedTag}
            onTasksChange={setTasks}
            allTags={allTags}
          />
        </main>

        {/* Right Sidebar - Lists */}
        <ListsSidebar
          lists={lists}
          selectedListId={params.listId}
          onSelectList={(listId) => {
            window.location.href = `/list/${listId}`;
          }}
          onCreateList={handleCreateList}
        />
      </div>
    </div>
  );
}

