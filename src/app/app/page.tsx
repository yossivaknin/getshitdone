'use client'

import { useState, useMemo, useEffect } from 'react';
import { Board } from "@/components/kanban/Board";
import { MissionStatus } from "@/components/mission-status";
import { MotivatorSubtitle } from "@/components/motivator-subtitle";
import Link from 'next/link';
import { Settings, ChevronRight, ChevronLeft, Target, LogOut, Plus } from 'lucide-react';
import { getAllTagsWithColors, getTagNames } from '@/lib/tags';
import { logout, getTasks } from '@/app/actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

// Kanban columns (these are the status columns - unified across all lists)
const kanbanColumns = [
  { id: 'todo', title: 'The Queue' },
  { id: 'in-progress', title: 'Active' },
  { id: 'done', title: 'Shipped' }
];

export default function UnifiedViewPage() {
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Hide sidebar by default to prevent flickering, will be shown on desktop after mount
  const [isMissionStatusVisible, setIsMissionStatusVisible] = useState(false);
  const [managedTags, setManagedTags] = useState<{ name: string; color: string }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Automatically refresh Google Calendar token in the background
  useTokenRefresh();

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
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500 font-mono">Loading tasks...</p>
            </div>
          ) : (
                <Board 
                  lists={kanbanColumns} 
                  tasks={tasks}
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

      {/* Floating Create Task Button */}
      <button
        onClick={() => {
          // Open create dialog - Board defaults to 'todo' column
          setCreateDialogOpen(true);
        }}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 h-14 w-14 md:h-16 md:w-16 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95"
        title="Create New Task"
        aria-label="Create New Task"
      >
        <Plus className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}
