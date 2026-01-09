'use client'

import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag as TagIcon, Plus, X, CalendarCheck } from 'lucide-react';
import { scheduleTask } from '@/app/actions';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { getTagNames, addTagToManaged, getTagColor } from '@/lib/tags';

interface CreateTaskDialogProps {
  listId: string;
  workspaceId: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  onCreateTask: (task: any) => Promise<any> | any; // Can return the created task or void
  allTags?: string[]; // All existing tags from all tasks
  open?: boolean; // Controlled mode - if provided, dialog is controlled externally
  onOpenChange?: (open: boolean) => void; // Callback when open state changes
}

export function CreateTaskDialog({ listId, workspaceId, children, trigger, onCreateTask, allTags = [], open: controlledOpen, onOpenChange }: CreateTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen !== undefined) {
      // Controlled mode - notify parent
      onOpenChange?.(newOpen);
    } else {
      // Uncontrolled mode - use internal state
      setInternalOpen(newOpen);
    }
  };
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [duration, setDuration] = useState('30'); // Default to 30 minutes
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [managedTags, setManagedTags] = useState<string[]>([]);
  const [manualChunking, setManualChunking] = useState(false);
  const [chunkCount, setChunkCount] = useState(1);
  const [chunkDuration, setChunkDuration] = useState(30); // Duration per chunk in minutes
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Load managed tags from database (with localStorage fallback)
  useEffect(() => {
    const loadTags = async () => {
      try {
        // Try to load from database first
        const { getUserTags } = await import('@/app/actions');
        const { tags: dbTags, error } = await getUserTags();
        
        if (error || !dbTags || dbTags.length === 0) {
          // Fallback to localStorage
          setManagedTags(getTagNames());
        } else {
          setManagedTags(dbTags.map((t: any) => t.name));
        }
      } catch (error) {
        console.error('[CreateTask] Error loading tags:', error);
        // Fallback to localStorage
        setManagedTags(getTagNames());
      }
    };
    
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
  
  // Use managed tags instead of allTags prop
  const availableTags = useMemo(() => {
    return Array.from(new Set([...managedTags, ...selectedTags])).sort();
  }, [managedTags, selectedTags]);
  
  // Set default date to today when dialog opens and refresh tags
  React.useEffect(() => {
    if (open) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDueDate(today.toISOString().split('T')[0]);
      setTitle('');
      setDescription('');
      setDuration('30'); // Reset to default 30 minutes
      setSelectedTags([]);
      setNewTagName('');
      setShowNewTagInput(false);
      setManualChunking(false);
      setChunkCount(1);
      setChunkDuration(30);
      setIsScheduling(false);
      
      // Refresh tags when dialog opens to ensure we have the latest tags
      const refreshTags = async () => {
        try {
          const { getUserTags } = await import('@/app/actions');
          const { tags: dbTags, error } = await getUserTags();
          
          if (error || !dbTags || dbTags.length === 0) {
            setManagedTags(getTagNames());
          } else {
            setManagedTags(dbTags.map((t: any) => t.name));
          }
        } catch (error) {
          console.error('[CreateTask] Error refreshing tags:', error);
          setManagedTags(getTagNames());
        }
      };
      
      refreshTags();
    }
  }, [open]);
  
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  
  const triggerElement = trigger || children;

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    
    if (selectedTags.includes(trimmedName)) {
      return;
    }

    // Save tag to database (syncs across devices)
    const { saveUserTag } = await import('@/app/actions');
    const tagColor = getTagColor(trimmedName);
    const result = await saveUserTag(trimmedName, tagColor);
    
    if (result.error) {
      console.error('[CreateTask] Error saving tag to database:', result.error);
      // Fallback to localStorage
      addTagToManaged(trimmedName);
    }
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('tagsUpdated'));
    
    setSelectedTags(prev => [...prev, trimmedName]);
    setNewTagName('');
    setShowNewTagInput(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate duration
    const durationValue = duration ? parseInt(duration) : undefined;
    if (durationValue !== undefined && (durationValue <= 0 || isNaN(durationValue))) {
      toast.error('Duration must be a positive number');
      return;
    }
    
    // Calculate total duration if manual chunking is enabled
    const finalDuration = manualChunking && chunkCount > 1 
      ? chunkCount * chunkDuration 
      : durationValue;
    
    const newTask = {
      id: Date.now().toString(),
      list_id: listId,
      title,
      description,
      tags: selectedTags.map(name => ({
        name,
        color: getTagColor(name)
      })),
      // Store date as ISO string for consistent parsing
      dueDate: dueDate || undefined,
      duration: finalDuration,
    };

    onCreateTask(newTask);
    setOpen(false);
    // Reset form
    setTitle('');
    setDescription('');
    setDueDate('');
    setDuration('30');
    setSelectedTags([]);
    setManualChunking(false);
    setChunkCount(1);
    setChunkDuration(30);
  };

  const handleCreateAndSchedule = async () => {
    // Validate duration
    const taskDuration = duration ? parseInt(duration) : undefined;
    if (!taskDuration || taskDuration <= 0) {
      toast.error('Task must have a duration to schedule');
      return;
    }

    // Get access token and refresh token from localStorage
    const accessToken = localStorage.getItem('google_calendar_token');
    const refreshToken = localStorage.getItem('google_calendar_refresh_token');
    
    // If client doesn't have access token, try server-side scheduling using stored tokens
    if (!accessToken) {
      try {
        setIsScheduling(true);

        const finalDuration = manualChunking && chunkCount > 1 
          ? chunkCount * chunkDuration 
          : taskDuration;

        // Call server-side schedule endpoint which will use tokens from `user_tokens`
        const response = await fetch('/api/calendar/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskData: {
              id: createdTask.id,
              title,
              duration: finalDuration,
              dueDate: dueDate || undefined,
              list_id: listId,
              chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
              chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
            },
            workingHoursStart: workingHoursStart,
            workingHoursEnd: workingHoursEnd,
            timezone: localStorage.getItem('user_timezone') || undefined
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setOpen(false);
          toast.success('Task created and scheduled successfully!');
          // Reset form
          setTitle('');
          setDescription('');
          setDueDate('');
          setDuration('30');
          setSelectedTags([]);
          setManualChunking(false);
          setChunkCount(1);
          setChunkDuration(30);
        } else {
          toast.error(data.message || data.error || 'Server scheduling failed. Please connect Google Calendar in Settings.');
        }
      } catch (error) {
        console.error('Server schedule error:', error);
        toast.error('Failed to schedule task via server. Please check your calendar connection.');
      } finally {
        setIsScheduling(false);
      }

      return;
    }

    setIsScheduling(true);
    
    try {
      // Calculate total duration if manual chunking is enabled
      const finalDuration = manualChunking && chunkCount > 1 
        ? chunkCount * chunkDuration 
        : taskDuration;

      // First create the task
      const newTask = {
        id: Date.now().toString(), // Temporary ID, will be replaced
        list_id: listId,
        title,
        description,
        tags: selectedTags.map(name => ({
          name,
          color: getTagColor(name)
        })),
        dueDate: dueDate || undefined,
        duration: finalDuration,
      };

      // Create task first and wait for the actual task ID
      const createdTask = await onCreateTask(newTask);
      
      if (!createdTask || !createdTask.id) {
        toast.error('Failed to create task. Cannot schedule.');
        setIsScheduling(false);
        return;
      }

      // Get working hours from localStorage
      const workingHoursStart = localStorage.getItem('working_hours_start') || '09:00';
      const workingHoursEnd = localStorage.getItem('working_hours_end') || '18:00';

      // Now schedule it with the actual task ID from the database
      const result = await scheduleTask({
        id: createdTask.id, // Use the actual database ID
        title,
        duration: finalDuration,
        dueDate: dueDate || undefined,
        list_id: listId,
        chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
        chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
      }, accessToken, refreshToken || undefined, workingHoursStart, workingHoursEnd);
      
      if (result.success) {
        setOpen(false);
        toast.success('Task created and scheduled successfully!');
        // Reset form
        setTitle('');
        setDescription('');
        setDueDate('');
        setDuration('30');
        setSelectedTags([]);
        setManualChunking(false);
        setChunkCount(1);
        setChunkDuration(30);
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

  const renderedTrigger = React.useMemo(() => {
    if (!triggerElement) return null;
    
    if (React.isValidElement(triggerElement)) {
      return React.cloneElement(triggerElement as React.ReactElement<any>, {
        onClick: handleTriggerClick,
      });
    }
    
    return triggerElement;
  }, [triggerElement]);

  return (
    <>
      {renderedTrigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[520px] md:max-w-[550px] lg:max-w-[600px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-[#0F0F0F] border-gray-800">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-white">Add Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-400">
              Create a new task for your kanban board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
              {/* Title */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="create-title" className="text-xs sm:text-sm font-semibold text-gray-300">
                  Title *
                </Label>
                <Input
                  id="create-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to get done?"
                  className="w-full h-10 sm:h-11 text-sm sm:text-base bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="create-description" className="text-xs sm:text-sm font-semibold text-gray-300">
                  Description
                </Label>
                <textarea
                  id="create-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Define the output. No fluff."
                  className="w-full min-h-[80px] sm:min-h-[100px] px-3 py-2 text-sm bg-gray-900 border-2 border-gray-700 rounded-md text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-300 flex items-center gap-1.5 sm:gap-2">
                  <TagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-32 overflow-y-auto">
                  {availableTags.length === 0 ? (
                    <p className="text-xs text-gray-500">No tags available. Create one below.</p>
                  ) : (
                    availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={cn(
                            "text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border transition-all",
                            isSelected
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })
                  )}
                  {!showNewTagInput ? (
                    <button
                      type="button"
                      onClick={() => setShowNewTagInput(true)}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold bg-gray-50 text-gray-600 border-2 border-dashed border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">New Tag</span>
                      <span className="sm:hidden">Tag</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateTag();
                          } else if (e.key === 'Escape') {
                            setShowNewTagInput(false);
                            setNewTagName('');
                          }
                        }}
                        placeholder="Tag name..."
                        className="h-8 flex-1 sm:w-32 text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateTag}
                        className="h-8 px-2 text-xs"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewTagInput(false);
                          setNewTagName('');
                        }}
                        className="h-8 px-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Date and Duration Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="create-dueDate" className="text-xs sm:text-sm font-semibold text-gray-300">
                    Deadline
                  </Label>
                  <Input
                    id="create-dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 sm:h-11 bg-gray-900 border-gray-700 text-white text-sm sm:text-base focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="create-duration" className="text-xs sm:text-sm font-semibold text-gray-300">
                    Time Budget
                  </Label>
                  <Input
                    id="create-duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    className="w-full h-10 sm:h-11 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-sm sm:text-base focus:border-emerald-500"
                    min="1"
                  />
                </div>
              </div>

              {/* Manual Chunking Option */}
              <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-gray-900 rounded-md border-2 border-gray-700">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-manual-chunking" className="text-sm sm:text-base font-bold text-gray-200 cursor-pointer">
                    Chunk it!
                  </Label>
                  <input
                    id="create-manual-chunking"
                    type="checkbox"
                    checked={manualChunking}
                    onChange={(e) => setManualChunking(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 bg-gray-800 border-2 border-gray-600 rounded focus:ring-emerald-500"
                  />
                </div>
                {manualChunking && (
                  <>
                    <p className="text-xs sm:text-sm text-gray-400 font-medium">
                      Split task into manageable calendar blocks.
                    </p>
                    <div className="space-y-3 sm:space-y-4 pl-0 sm:pl-6">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="create-chunk-count" className="text-xs sm:text-sm text-gray-300">
                          Number of chunks
                        </Label>
                        <Input
                          id="create-chunk-count"
                          type="number"
                          value={chunkCount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              setChunkCount(1);
                            } else {
                              const num = parseInt(value);
                              if (!isNaN(num) && num >= 1) {
                                setChunkCount(Math.min(10, Math.max(1, num)));
                              }
                            }
                          }}
                          min="1"
                          max="10"
                          className="w-full sm:w-32 h-9 bg-gray-800 border-gray-700 text-white text-sm focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="create-chunk-duration" className="text-xs sm:text-sm text-gray-300">
                          Duration per chunk (minutes)
                        </Label>
                        <Input
                          id="create-chunk-duration"
                          type="number"
                          value={chunkDuration}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              setChunkDuration(30);
                            } else {
                              const num = parseInt(value);
                              if (!isNaN(num) && num >= 15) {
                                setChunkDuration(Math.min(240, Math.max(15, num)));
                              }
                            }
                          }}
                          min="15"
                          max="240"
                          className="w-full sm:w-32 h-9 bg-gray-800 border-gray-700 text-white text-sm focus:border-emerald-500"
                        />
                      </div>
                      {duration && (
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                          Total: {chunkCount} chunks × {chunkDuration} min = {chunkCount * chunkDuration} minutes
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2 md:gap-0 pt-3 sm:pt-4 border-t border-gray-800">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto order-3 sm:order-1 text-sm bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                Cancel
              </Button>
              <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
                <Button 
                  type="submit" 
                  className="flex-1 sm:flex-initial text-sm px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Create Task
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCreateAndSchedule}
                  disabled={isScheduling || !duration}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 sm:px-4 disabled:opacity-50"
                >
                  <CalendarCheck className="w-4 h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden md:inline">{isScheduling ? 'Booking...' : 'Book The Time'}</span>
                  <span className="hidden sm:inline md:hidden">{isScheduling ? 'Booking...' : 'Book Time'}</span>
                  <span className="sm:hidden">{isScheduling ? 'Booking...' : 'Book'}</span>
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
