'use client'

import { useState, useMemo, useEffect } from 'react';
import { Board } from "@/components/kanban/Board";
import { Insights } from "@/components/dashboard/Insights";
import Link from 'next/link';
import { Settings, LogOut, Plus, Zap, Clock, User } from 'lucide-react';
import { getAllTagsWithColors, getTagNames } from '@/lib/tags';
import { logout, getTasks } from '@/app/actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

// Kanban columns - tasks are automatically categorized by due date in the Board component
const kanbanColumns = [
  { id: 'queue', title: 'Queue' },
  { id: 'today', title: 'Focus' },
  { id: 'this-week', title: 'This Week' }
];

export default function UnifiedViewPage() {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'all' | 'work' | 'personal'>('all');
  const [managedTags, setManagedTags] = useState<{ name: string; color: string }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Automatically refresh Google Calendar token in the background
  useTokenRefresh();

  // Check for Google token from Supabase OAuth on mount
  useEffect(() => {
    // Check URL params for Google token from Supabase OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const googleToken = urlParams.get('google_token');
    const googleRefresh = urlParams.get('google_refresh');
    const fromSupabase = urlParams.get('from_supabase');

    if (fromSupabase === 'true' && googleToken) {
      console.log('[App] Extracting Google token from Supabase OAuth session');
      
      // Validate token format
      if (!googleToken.startsWith('1//')) {
        // It's an access token, save it
        localStorage.setItem('google_calendar_token', googleToken);
        console.log('[App] ✅ Google Calendar access token saved from Supabase session');
        
        if (googleRefresh) {
          localStorage.setItem('google_calendar_refresh_token', googleRefresh);
          console.log('[App] ✅ Google Calendar refresh token saved from Supabase session');
        }
        
        // Clean URL
        window.history.replaceState({}, '', '/app');
        
        toast.success('Google Calendar connected! You can now schedule tasks.');
      }
    }
  }, []);

  // Load tasks and tags from database on mount (in parallel for better performance)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load tasks and tags in parallel
        const [tasksResult, { getUserTags }] = await Promise.all([
          getTasks(),
          import('@/app/actions')
        ]);
        
        // Load tasks
        if (tasksResult.error) {
          console.error('Error loading tasks:', tasksResult.error);
          toast.error('Failed to load tasks');
        } else {
          setTasks(tasksResult.tasks || []);
        }
        
        // Load tags (with caching)
        const { getCachedTags, setCachedTags } = await import('@/lib/tags-cache');
        const cachedTags = getCachedTags();
        
        if (cachedTags) {
          console.log('[App] Using cached tags:', cachedTags.length);
          setManagedTags(cachedTags);
        } else {
          const { tags: dbTags, error } = await getUserTags();
          
          if (error || !dbTags || dbTags.length === 0) {
            // Fallback to localStorage
            const { getAllTagsWithColors } = await import('@/lib/tags');
            const fallbackTags = getAllTagsWithColors();
            setManagedTags(fallbackTags);
            setCachedTags(fallbackTags);
          } else {
            // Convert database tags to the format expected by the UI
            const formattedTags = dbTags.map((t: any) => ({
              name: t.name,
              color: t.color || 'bg-gray-50 text-gray-600 border-gray-200'
            }));
            setManagedTags(formattedTags);
            setCachedTags(formattedTags);
            console.log('[App] Loaded and cached', formattedTags.length, 'tags from database');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh tasks when needed (after create/update/delete)
  const refreshTasks = async () => {
    try {
      console.log('[App] Refreshing tasks...');
      const result = await getTasks();
      if (result.error) {
        console.error('[App] Error refreshing tasks:', result.error);
        toast.error('Failed to refresh tasks');
      } else {
        console.log('[App] Tasks refreshed:', {
          count: result.tasks?.length || 0,
          tasks: result.tasks?.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            list_id: t.list_id
          }))
        });
        setTasks(result.tasks || []);
      }
    } catch (error) {
      console.error('[App] Exception refreshing tasks:', error);
      toast.error('Failed to refresh tasks');
    }
  };

  // Listen for tag updates and refresh cache
  useEffect(() => {
    const handleTagUpdate = async () => {
      try {
        // Clear cache and reload tags
        const { clearTagsCache } = await import('@/lib/tags-cache');
        clearTagsCache();
        
        const { getUserTags } = await import('@/app/actions');
        const { tags: dbTags, error } = await getUserTags();
        
        if (error || !dbTags || dbTags.length === 0) {
          // Fallback to localStorage
          const fallbackTags = getAllTagsWithColors();
          setManagedTags(fallbackTags);
        } else {
          // Convert database tags to the format expected by the UI
          const formattedTags = dbTags.map((t: any) => ({
            name: t.name,
            color: t.color || 'bg-gray-50 text-gray-600 border-gray-200'
          }));
          setManagedTags(formattedTags);
          
          // Update cache
          const { setCachedTags } = await import('@/lib/tags-cache');
          setCachedTags(formattedTags);
        }
      } catch (error) {
        console.error('[App] Error refreshing tags:', error);
      }
    };
    
    window.addEventListener('tagsUpdated', handleTagUpdate);
    
    return () => {
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

  // Keyboard shortcut for creating tasks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Get shortcut from localStorage (default: 'n')
      const shortcut = (localStorage.getItem('create_task_shortcut') || 'n').toLowerCase();
      const key = e.key.toLowerCase();

      // Check if the pressed key matches the shortcut
      // Support both single key (e.g., 'n') and modifier combinations (e.g., 'ctrl+k', 'cmd+k')
      if (key === shortcut) {
        // For single letter shortcuts, check if no modifier is pressed (or just shift)
        if (shortcut.length === 1 && /^[a-z0-9]$/.test(shortcut)) {
          // Allow Shift for capital letters, but ignore other modifiers
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setCreateDialogOpen(true);
            console.log('[Keyboard] Create task dialog opened via shortcut:', shortcut);
          }
        }
      }
      
      // Also support common shortcuts like Ctrl+K / Cmd+K if shortcut is 'k'
      if (shortcut === 'k' && (e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setCreateDialogOpen(true);
        console.log('[Keyboard] Create task dialog opened via Ctrl/Cmd+K');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter tasks based on selected tab
  const filteredTasks = useMemo(() => {
    if (selectedTab === 'all') return tasks;
    return tasks.filter((task: any) => {
      const tags = task.tags || [];
      const tagNames = tags.map((t: any) => (typeof t === 'string' ? t : t.name)).map((n: string) => n.toLowerCase());
      if (selectedTab === 'work') {
        return tagNames.includes('work');
      }
      if (selectedTab === 'personal') {
        return tagNames.includes('personal');
      }
      return true;
    });
  }, [tasks, selectedTab]);

  return (
    <div className="h-screen flex flex-col bg-[#0F0F0F]">
      {/* Top Header Bar */}
      <header className="px-6 py-3 flex items-center justify-between bg-[#1A1A1A] border-b border-gray-800">
        <div className="text-gray-400 text-sm font-mono">SITREP</div>
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <Zap className="w-5 h-5" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCreateDialogOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <Link href="/settings">
            <button className="text-gray-400 hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 py-3 flex items-center justify-between bg-[#1A1A1A] border-b border-gray-800">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setSelectedTab('all')}
            className={`text-sm font-medium transition-colors ${
              selectedTab === 'all'
                ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All tasks
          </button>
          <button
            onClick={() => setSelectedTab('work')}
            className={`text-sm font-medium transition-colors ${
              selectedTab === 'work'
                ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Work
          </button>
          <button
            onClick={() => setSelectedTab('personal')}
            className={`text-sm font-medium transition-colors ${
              selectedTab === 'personal'
                ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Personal
          </button>
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Task
        </button>
      </div>
      
      {/* Main Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content - Unified Kanban Board */}
        <main className="flex-1 overflow-hidden min-w-0 flex flex-col bg-[#0F0F0F]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500 font-mono">Loading tasks...</p>
            </div>
          ) : (
            <Board 
              lists={kanbanColumns} 
              tasks={filteredTasks}
              workspaceId="user-workspace"
              selectedTag={selectedTag}
              onTasksChange={refreshTasks as any}
              allTags={allTags}
              allTagsWithColors={allTagsWithColors}
              onSelectTag={setSelectedTag}
              createDialogOpen={createDialogOpen}
              onCreateDialogOpenChange={setCreateDialogOpen}
              onRefreshTasks={refreshTasks}
            />
          )}
        </main>

        {/* Right Sidebar - Insights */}
        <div className="hidden lg:block w-80 flex-shrink-0 border-l border-gray-800">
          <Insights tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
