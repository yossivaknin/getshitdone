'use client'

import { useState, useMemo, useEffect } from 'react';
import { Board } from "@/components/kanban/Board";
import { MissionStatus } from "@/components/mission-status";
import { MotivatorSubtitle } from "@/components/motivator-subtitle";
import Link from 'next/link';
import { Settings, ChevronRight, ChevronLeft, Target, LogOut } from 'lucide-react';
import { getAllTagsWithColors, getTagNames } from '@/lib/tags';
import { logout } from './actions';

// Mock data - in production this would come from your database
const mockLists = [
  { id: 'list-1', title: 'Work Projects', taskCount: 5 },
  { id: 'list-2', title: 'Personal', taskCount: 3 },
  { id: 'list-3', title: 'Learning', taskCount: 2 },
];

// Helper function to get tag color - uses fallback for SSR, will be updated on client
const getTagColorForMock = (tagName: string): string => {
  const LIGHT_TAG_COLORS = [
    'bg-yellow-50 text-yellow-600 border-yellow-200',
    'bg-red-50 text-red-600 border-red-200',
    'bg-blue-50 text-blue-600 border-blue-200',
    'bg-green-50 text-green-600 border-green-200',
    'bg-purple-50 text-purple-600 border-purple-200',
  ];
  const index = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % LIGHT_TAG_COLORS.length;
  return LIGHT_TAG_COLORS[index];
};

// All tasks from all lists - unified view
// Note: Tag colors will be updated on client-side to use managed tags
const initialMockTasks = [
  {
    id: '1',
    list_id: 'todo',
    title: 'Figure out the link for multi-user workspaces',
    tags: [{ name: 'Dev', color: getTagColorForMock('Dev') }],
    dueDate: new Date().toISOString().split('T')[0], // Today as ISO
    duration: 30,
    googleEventIds: []
  },
  {
    id: '2',
    list_id: 'todo',
    title: 'Personal Commitment Review',
    tags: [{ name: 'Personal', color: getTagColorForMock('Personal') }],
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow as ISO
    duration: 60,
    googleEventIds: []
  },
  {
    id: '3',
    list_id: 'in-progress',
    title: 'E2E testing review',
    tags: [{ name: 'QA', color: getTagColorForMock('QA') }],
    duration: 45,
    googleEventIds: []
  },
  {
    id: '4',
    list_id: 'done',
    title: 'Schedule an appointment for Sivan',
    tags: [{ name: 'Admin', color: getTagColorForMock('Admin') }],
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday as ISO
    duration: 15,
    googleEventIds: []
  },
  {
    id: '5',
    list_id: 'todo',
    title: 'Review Q4 Performance',
    tags: [{ name: 'Work', color: getTagColorForMock('Work') }],
    dueDate: '2024-12-01',
    duration: 90,
    googleEventIds: []
  },
  {
    id: '6',
    list_id: 'in-progress',
    title: 'Prepare for client demo',
    tags: [{ name: 'Dev', color: getTagColorForMock('Dev') }],
    dueDate: '2024-12-05',
    duration: 120,
    googleEventIds: []
  },
  {
    id: '7',
    list_id: 'done',
    title: 'Plan weekend getaway',
    tags: [{ name: 'Personal', color: getTagColorForMock('Personal') }],
    dueDate: '2024-11-30',
    duration: 45,
    googleEventIds: []
  },
];

// Kanban columns (these are the status columns - unified across all lists)
const kanbanColumns = [
  { id: 'todo', title: 'The Queue' },
  { id: 'in-progress', title: 'Active' },
  { id: 'done', title: 'Shipped' }
];

export default function UnifiedViewPage() {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [tasks, setTasks] = useState(initialMockTasks);
  // Hide sidebar by default to prevent flickering, will be shown on desktop after mount
  const [isMissionStatusVisible, setIsMissionStatusVisible] = useState(false);
  const [managedTags, setManagedTags] = useState<{ name: string; color: string }[]>([]);

  // Set initial sidebar visibility based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      // Show sidebar on tablet and desktop (>= 768px), hide on mobile
      if (typeof window !== 'undefined') {
        setIsMissionStatusVisible(window.innerWidth >= 768);
      }
    };
    
    // Check on mount
    checkScreenSize();
    
    // Listen for resize events
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Load managed tags from localStorage and sync when storage changes
  // Only load after mount to prevent hydration mismatch
  useEffect(() => {
    const loadTags = () => {
      setManagedTags(getAllTagsWithColors());
    };
    
    // Load tags immediately after mount
    loadTags();
    
    // Listen for storage changes (when tags are updated in settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'getshitdone_tags') {
        loadTags();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (for same-tab updates)
    const handleTagUpdate = () => {
      loadTags();
    };
    
    window.addEventListener('tagsUpdated', handleTagUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tagsUpdated', handleTagUpdate);
    };
  }, []);

  // Use managed tags instead of extracting from tasks
  const allTagsWithColors = useMemo(() => {
    return managedTags;
  }, [managedTags]);

  // Extract just tag names (for Board and components)
  const allTags = useMemo(() => {
    return managedTags.map(tag => tag.name);
  }, [managedTags]);

  return (
    <div className="h-screen flex flex-col bg-[#F4F5F7]">
      <header className="px-4 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-transparent border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}>Mission Control</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500 mt-0.5 sm:mt-1">
            <MotivatorSubtitle tasks={tasks} />
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <button
            onClick={() => setIsMissionStatusVisible(!isMissionStatusVisible)}
            className={`p-2 rounded-lg transition-colors ${
              isMissionStatusVisible 
                ? 'bg-gray-100 text-gray-900' 
                : 'hover:bg-white text-gray-600'
            }`}
            title={isMissionStatusVisible ? "Hide Mission Status" : "Show Mission Status"}
          >
            <Target className={`w-5 h-5 ${isMissionStatusVisible ? 'text-gray-900' : 'text-gray-600'}`} />
          </button>
          <Link href="/settings">
            <button className="p-2 hover:bg-white rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </form>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Content - Unified Kanban Board */}
        <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
          <Board 
            lists={kanbanColumns} 
            tasks={tasks}
            workspaceId="mock-workspace-id"
            selectedTag={selectedTag}
            onTasksChange={setTasks}
            allTags={allTags}
            onSelectTag={setSelectedTag}
          />
        </main>

        {/* Right Sidebar - Mission Status */}
        {isMissionStatusVisible && (
          <div className="hidden md:block w-56 lg:w-64 flex-shrink-0 transition-all duration-300 ease-in-out border-l border-slate-300">
            <MissionStatus tasks={tasks} />
          </div>
        )}
        
        {/* Mobile Mission Status Drawer */}
        {isMissionStatusVisible && (
          <div className="md:hidden fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white border-l border-slate-300 z-40 shadow-xl transform transition-transform duration-300 ease-in-out">
            <MissionStatus tasks={tasks} />
          </div>
        )}
        
        {/* Mobile overlay when sidebar is open */}
        {isMissionStatusVisible && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMissionStatusVisible(false)}
          />
        )}
      </div>
    </div>
  );
}
