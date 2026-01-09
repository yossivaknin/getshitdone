'use client'

import { useState, useMemo, useEffect } from 'react';
import { Board } from "@/components/kanban/Board";
import { Insights } from "@/components/dashboard/Insights";
import Link from 'next/link';
import { Settings, LogOut, Plus, Zap, Clock, User, BarChart3, X } from 'lucide-react';
import { getAllTagsWithColors, getTagNames } from '@/lib/tags';
import { logout, getTasks } from '@/app/actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

// Kanban columns - tasks are automatically categorized by due date in the Board component
const kanbanColumns = [
  { id: 'queue', title: 'Queue' },
  { id: 'today', title: 'Today' },
  { id: 'this-week', title: 'This Week' }
];

export default function UnifiedViewPage() {
  console.log('[App Page] ========== APP PAGE COMPONENT RENDERED ==========');
  console.log('[App Page] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  console.log('[App Page] Search params:', typeof window !== 'undefined' ? new URLSearchParams(window.location.search).toString() : 'SSR');
  
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [managedTags, setManagedTags] = useState<{ name: string; color: string }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize token refresh
  useTokenRefresh();

  // Check for Google token from Supabase OAuth on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      
      // Check URL params for Google token from Supabase OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const googleToken = urlParams.get('google_token');
      const googleRefresh = urlParams.get('google_refresh');
      const fromSupabase = urlParams.get('from_supabase');

      if (fromSupabase === 'true' && googleToken) {
        console.log('[App] Extracting Google token from Supabase OAuth session');
        
        try {
          // Validate token format
          if (!googleToken.startsWith('1//')) {
            // It's an access token, save it locally
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('google_calendar_token', googleToken);
              console.log('[App] ✅ Google Calendar access token saved from Supabase session');

              if (googleRefresh) {
                localStorage.setItem('google_calendar_refresh_token', googleRefresh);
                console.log('[App] ✅ Google Calendar refresh token saved from Supabase session');
              }
            }

            // Attempt to persist tokens to database (server-side)
            try {
              fetch('/api/save-google-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_token: googleToken, google_refresh: googleRefresh })
              }).then(async (res) => {
                try {
                  const data = await res.json()
                  if (res.ok && data.success) {
                    console.log('[App] ✅ Tokens persisted to database')
                  } else {
                    console.warn('[App] Could not persist tokens to DB (will fallback to localStorage)', data)
                  }
                } catch (e) {
                  console.warn('[App] Save tokens response parse error', e)
                }
              }).catch(err => {
                console.warn('[App] Save tokens request failed (will rely on localStorage):', err)
              })
            } catch (err) {
              console.warn('[App] Error while calling save tokens endpoint:', err)
            }

            // Clean URL
            if (typeof window !== 'undefined' && window.history) {
              window.history.replaceState({}, '', '/app');
            }

            toast.success('Google Calendar connected! You can now schedule tasks.');
          }
        } catch (error: any) {
          console.error('[App] Error saving Google token:', {
            error: error,
            errorType: typeof error,
            errorString: String(error),
            errorStack: error?.stack,
            errorMessage: error?.message,
          });
        }
      }
    } catch (error: any) {
      console.error('[App] Error in Google token check useEffect:', {
        error: error,
        errorType: typeof error,
        errorString: String(error),
        errorStack: error?.stack,
        errorMessage: error?.message,
      });
    }
  }, []);

  // Load tasks and tags from database on mount (in parallel for better performance)
  useEffect(() => {
    const loadData = async () => {
      console.log('[App Page] ========== LOADING DATA ==========');
      console.log('[App Page] Starting data load...');
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
        
        // Load tags from database (always fetch fresh, cache is just for fallback)
        // getUserTags is already available from Promise.all above
        const { tags: dbTags, error } = await getUserTags();
        
        if (error || !dbTags || dbTags.length === 0) {
          // Fallback to cache, then localStorage
          const { getCachedTags, setCachedTags } = await import('@/lib/tags-cache');
          const cachedTags = getCachedTags();
          
          if (cachedTags && cachedTags.length > 0) {
            console.log('[App] Database fetch failed, using cached tags:', cachedTags.length);
            setManagedTags(cachedTags);
          } else {
            // Final fallback to localStorage
            const { getAllTagsWithColors } = await import('@/lib/tags');
            const fallbackTags = getAllTagsWithColors();
            setManagedTags(fallbackTags);
            setCachedTags(fallbackTags);
          }
        } else {
          // Convert database tags to the format expected by the UI
          const formattedTags = dbTags.map((t: any) => ({
            name: t.name,
            color: t.color || 'bg-gray-50 text-gray-600 border-gray-200'
          }));
          setManagedTags(formattedTags);
          
          // Update cache with fresh data
          const { setCachedTags } = await import('@/lib/tags-cache');
          setCachedTags(formattedTags);
          console.log('[App] Loaded and cached', formattedTags.length, 'tags from database');
        }
      } catch (error: any) {
        console.error('[App] ❌❌❌ CRITICAL ERROR loading data:', {
          error: error,
          errorType: typeof error,
          errorString: String(error),
          errorStack: error?.stack,
          errorMessage: error?.message,
          errorName: error?.name,
          errorJSON: (() => {
            try {
              return JSON.stringify(error, Object.getOwnPropertyNames(error));
            } catch {
              return 'Could not stringify error';
            }
          })(),
        });
        setHasError(true);
        setErrorMessage(error?.message || String(error) || 'Unknown error');
        toast.error('Failed to load data: ' + (error?.message || String(error)));
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
        console.log('[App Page] ✅ Data loaded successfully');
        console.log('[App Page] Tasks count:', result.tasks?.length || 0);
        setTasks(result.tasks || []);
      }
    } catch (error: any) {
      console.error('[App] Exception refreshing tasks:', {
        error: error,
        errorType: typeof error,
        errorString: String(error),
        errorStack: error?.stack,
        errorMessage: error?.message,
      });
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
      } catch (error: any) {
        console.error('[App] Error refreshing tags:', {
          error: error,
          errorType: typeof error,
          errorString: String(error),
          errorStack: error?.stack,
          errorMessage: error?.message,
        });
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('tagsUpdated', handleTagUpdate);
      
      return () => {
        window.removeEventListener('tagsUpdated', handleTagUpdate);
      };
    }
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
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Don't trigger if user is typing in an input, textarea, or contenteditable
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        // Get shortcut from localStorage (default: 'n')
        let shortcut = 'n';
        try {
          if (typeof localStorage !== 'undefined') {
            shortcut = (localStorage.getItem('create_task_shortcut') || 'n').toLowerCase();
          }
        } catch (error) {
          console.warn('[App] Error reading localStorage for shortcut:', error);
        }
        
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
      } catch (error: any) {
        console.error('[App] Error in keyboard handler:', {
          error: error,
          errorType: typeof error,
          errorString: String(error),
          errorStack: error?.stack,
          errorMessage: error?.message,
        });
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
      if (selectedTab === 'all') {
        return true;
      }
      const tags = task.tags || [];
      const tagNames = tags.map((t: any) => (typeof t === 'string' ? t : t.name)).map((n: string) => n.toLowerCase());
      return tagNames.includes(selectedTab.toLowerCase());
    });
  }, [tasks, selectedTab]);

  // Show error state if there's a critical error
  if (hasError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0F0F0F] text-white p-4">
        <div className="max-w-md w-full bg-[#1A1A1A] border border-red-500/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Application Error</h2>
          <p className="text-slate-300 mb-4">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              window.location.reload();
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0F0F0F]">
      {/* Top Header Bar */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between bg-[#1A1A1A] border-b border-gray-800 safe-top" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}>
        <div className="text-gray-400 text-sm font-mono">SITREP</div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Insights Toggle */}
          <button 
            onClick={() => setIsInsightsOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-2"
            title="Insights"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button className="hidden sm:block text-gray-400 hover:text-white transition-colors">
            <Zap className="w-5 h-5" />
          </button>
          <button className="hidden sm:block text-gray-400 hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCreateDialogOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2"
            title="New Task"
          >
            <Plus className="w-5 h-5" />
          </button>
          <Link href="/settings">
            <button className="text-gray-400 hover:text-white transition-colors p-2" title="Settings">
              <User className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between bg-[#1A1A1A] border-b border-gray-800 gap-3">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto flex-1 scrollbar-hide">
          <button
            onClick={() => setSelectedTab('all')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === 'all'
                ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All tasks
          </button>
          {managedTags.slice(0, 5).map((tag) => (
            <button
              key={tag.name}
              onClick={() => setSelectedTab(tag.name)}
              className={`text-sm font-medium transition-colors capitalize whitespace-nowrap ${
                selectedTab === tag.name
                  ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
        >
          <span className="hidden sm:inline">+ New Task</span>
          <span className="sm:hidden">+ New</span>
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

        {/* Right Sidebar - Insights (Desktop) */}
        <div className="hidden lg:block w-80 flex-shrink-0 border-l border-gray-800">
          <Insights tasks={tasks} />
        </div>
      </div>

      {/* Mobile Insights Drawer */}
      {isInsightsOpen && (
        <>
          {/* Overlay */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsInsightsOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 right-0 w-[85vw] max-w-sm bg-[#1A1A1A] z-50 shadow-2xl flex flex-col safe-top safe-bottom" style={{ paddingTop: `env(safe-area-inset-top)`, paddingBottom: `env(safe-area-inset-bottom)` }}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Insights</h2>
              <button
                onClick={() => setIsInsightsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto">
              <Insights tasks={tasks} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
