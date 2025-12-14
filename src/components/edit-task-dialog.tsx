'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarCheck, X, Tag as TagIcon, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { scheduleTask } from '@/app/actions';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getTagNames, addTagToManaged, getTagColor } from '@/lib/tags';
import { useMemo } from 'react';

// Use getTagColor from lib/tags (already imported)

interface EditTaskDialogProps {
  task: {
    id: string;
    title: string;
    tags: { name: string; color: string }[];
    dueDate?: string;
    duration?: number;
    list_id?: string;
    description?: string;
    chunkCount?: number;
    chunkDuration?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask: (updatedTask: any) => void;
  allTags?: string[]; // All existing tags from all tasks
}

export function EditTaskDialog({ task, open, onOpenChange, onUpdateTask, allTags = [] }: EditTaskDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [dueDate, setDueDate] = useState('');
  const [duration, setDuration] = useState(task.duration?.toString() || '30'); // Default to 30 minutes
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags?.map(t => t.name) || []);
  const [manualChunking, setManualChunking] = useState(false);
  const [chunkCount, setChunkCount] = useState(1);
  const [chunkDuration, setChunkDuration] = useState(30); // Duration per chunk in minutes
  const [isScheduling, setIsScheduling] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [managedTags, setManagedTags] = useState<string[]>([]);

  // Load managed tags from localStorage
  useEffect(() => {
    const loadTags = () => {
      setManagedTags(getTagNames());
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

  // Pre-populate form when task changes
  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDuration(task.duration?.toString() || '30'); // Default to 30 minutes
      
      // Always update selectedTags from task.tags to reflect latest state
      // Handle both object format {name, color} and string format
      const taskTagNames = task.tags?.map((t: any) => typeof t === 'string' ? t : t.name) || [];
      console.log('[EditTaskDialog] Updating selectedTags from task:', {
        taskId: task.id,
        taskTags: task.tags,
        tagNames: taskTagNames,
        currentSelectedTags: selectedTags
      });
      setSelectedTags(taskTagNames);
      
      // Load chunking settings from task
      if (task.chunkCount && task.chunkCount > 1 && task.chunkDuration) {
        setManualChunking(true);
        setChunkCount(task.chunkCount);
        setChunkDuration(task.chunkDuration);
      } else {
        setManualChunking(false);
        setChunkCount(1);
        setChunkDuration(30);
      }
      
      // Set default date to today if no due date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const defaultDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (task.dueDate) {
        // Handle relative dates like "Today", "Tomorrow", "Yesterday"
        if (task.dueDate === 'Today') {
          setDueDate(defaultDate);
        } else if (task.dueDate === 'Tomorrow') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          setDueDate(tomorrow.toISOString().split('T')[0]);
        } else if (task.dueDate === 'Yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          setDueDate(yesterday.toISOString().split('T')[0]);
        } else {
          // Try to parse as date string
          const date = new Date(task.dueDate);
          if (!isNaN(date.getTime())) {
            setDueDate(date.toISOString().split('T')[0]);
          } else {
            setDueDate(defaultDate);
          }
        }
      } else {
        setDueDate(defaultDate);
      }
    }
  }, [task, open]);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleCreateTag = () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    
    if (selectedTags.includes(trimmedName)) {
      toast.error('Tag already selected');
      return;
    }

    // Add tag to managed tags in localStorage
    addTagToManaged(trimmedName);
    
    // Trigger event to update other components
    window.dispatchEvent(new Event('tagsUpdated'));

    setSelectedTags(prev => [...prev, trimmedName]);
    setNewTagName('');
    setShowNewTagInput(false);
  };

  // Use getTagColor from lib/tags (already imported)
  // Use getTagColor from lib/tags which checks managed tags first
  const getTagColorForTask = (tagName: string) => {
    return getTagColor(tagName);
  };

  const handleSave = () => {
    // Validate duration
    const durationValue = duration ? parseInt(duration) : undefined;
    if (durationValue !== undefined && (durationValue <= 0 || isNaN(durationValue))) {
      toast.error('Duration must be a positive number');
      return;
    }
    
    const updatedTask = {
      ...task,
      title,
      description,
      duration: durationValue,
      // Store date as ISO string for consistent parsing
      dueDate: dueDate || undefined,
      tags: selectedTags.map(name => ({
        name,
        color: getTagColorForTask(name)
      })),
      // Save chunking settings
      chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
      chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
    };

    // Update the task
    onUpdateTask(updatedTask);
    
    // Close dialog - it will reopen with updated task if needed
    onOpenChange(false);
    
    // Show success message
    toast.success('Task updated successfully');
  };

  const handleScheduleAndSave = async () => {
    const taskDuration = duration ? parseInt(duration) : task.duration;
    
    if (!taskDuration || taskDuration <= 0) {
      toast.error('Task must have a duration to schedule');
      return;
    }

    // Get access token and refresh token from localStorage
    const accessToken = localStorage.getItem('google_calendar_token');
    const refreshToken = localStorage.getItem('google_calendar_refresh_token');
    
    if (!accessToken) {
      toast.error('Google Calendar not connected. Please connect in Settings first.');
      return;
    }

    setIsScheduling(true);
    
    try {
      // Handle empty string vs undefined for dueDate
      const finalDueDate = dueDate && dueDate.trim() !== '' ? dueDate : (task.dueDate || undefined);
      
      // Calculate total duration if manual chunking is enabled
      const finalDuration = manualChunking && chunkCount > 1 
        ? chunkCount * chunkDuration 
        : taskDuration;

      // Get working hours from localStorage (check both possible key formats)
      const workingHoursStart = localStorage.getItem('workingHoursStart') || localStorage.getItem('working_hours_start') || '09:00';
      const workingHoursEnd = localStorage.getItem('workingHoursEnd') || localStorage.getItem('working_hours_end') || '18:00';

      console.log('[EDIT-DIALOG] Scheduling task:', {
        id: task.id,
        title,
        duration: finalDuration,
        dueDate: finalDueDate,
        chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
        chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
        workingHoursStart,
        workingHoursEnd
      });

      const result = await scheduleTask({
        id: task.id,
        title,
        duration: finalDuration,
        dueDate: finalDueDate,
        list_id: task.list_id || 'todo',
        chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
        chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
      }, accessToken, refreshToken || undefined, workingHoursStart, workingHoursEnd);
      
      console.log('[EDIT-DIALOG] Schedule result:', result);
      
      if (result.success) {
        // Validate duration
        const durationValue = duration ? parseInt(duration) : undefined;
        if (durationValue !== undefined && (durationValue <= 0 || isNaN(durationValue))) {
          toast.error('Duration must be a positive number');
          setIsScheduling(false);
          return;
        }
        
        // Save the task after successful scheduling
        const updatedTask = {
          ...task,
          title,
          description,
          duration: durationValue,
          // Store date as ISO string for consistent parsing
          dueDate: dueDate || undefined,
          tags: selectedTags.map(name => ({
            name,
            color: getTagColorForTask(name)
          })),
          googleEventIds: result.eventIds || [],
          // Save chunking settings
          chunkCount: manualChunking && chunkCount > 1 ? chunkCount : undefined,
          chunkDuration: manualChunking && chunkCount > 1 ? chunkDuration : undefined,
        };

        onUpdateTask(updatedTask);
        onOpenChange(false);
        toast.success('Task scheduled and saved successfully!');
      } else {
        const errorMessage = result.message || 'Failed to schedule task. Please check your calendar connection.';
        console.error('[EDIT-DIALOG] Schedule failed:', errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('[EDIT-DIALOG] Schedule error:', error);
      const errorMessage = error?.message || 'Failed to schedule task. Please check your calendar connection.';
      toast.error(errorMessage);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[520px] md:max-w-[550px] lg:max-w-[600px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Mission Brief</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-500">
            Update task details and schedule it in your calendar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Title */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="edit-title" className="text-xs sm:text-sm font-semibold text-gray-700">
              Title *
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="edit-description" className="text-xs sm:text-sm font-semibold text-gray-700">
              Description
            </Label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Define the output. No fluff."
              className="w-full min-h-[80px] sm:min-h-[100px] px-3 py-2 text-sm border-2 border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5 sm:gap-2">
              <TagIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      "text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border transition-all",
                      isSelected
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
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
              <Label htmlFor="edit-dueDate" className="text-xs sm:text-sm font-semibold text-gray-700">
                Deadline
              </Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 sm:h-11 border-2 border-slate-300 text-sm sm:text-base"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-duration" className="text-xs sm:text-sm font-semibold text-gray-700">
                Time Budget
              </Label>
              <Input
                id="edit-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
                min="1"
              />
            </div>
          </div>

          {/* Manual Chunking Option */}
          <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-gray-50 rounded-md border-2 border-slate-300">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-chunking" className="text-sm sm:text-base font-bold text-gray-900 cursor-pointer">
                Chunk it!
              </Label>
              <input
                id="manual-chunking"
                type="checkbox"
                checked={manualChunking}
                onChange={(e) => setManualChunking(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-blue-500"
              />
            </div>
            {manualChunking && (
              <>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">
                  Split task into manageable calendar blocks.
                </p>
                <div className="space-y-3 sm:space-y-4 pl-0 sm:pl-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="chunk-count" className="text-xs sm:text-sm text-gray-600">
                      Number of chunks
                    </Label>
                    <Input
                      id="chunk-count"
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
                      className="w-full sm:w-32 h-9 border-2 border-slate-300 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="chunk-duration" className="text-xs sm:text-sm text-gray-600">
                      Duration per chunk (minutes)
                    </Label>
                    <Input
                      id="chunk-duration"
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
                      className="w-full sm:w-32 h-9 border-2 border-slate-300 text-sm"
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

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2 md:gap-0 pt-3 sm:pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-3 sm:order-1 text-sm"
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button 
              type="button"
              onClick={handleSave}
              variant="outline"
              className="flex-1 sm:flex-initial text-sm px-3 sm:px-4"
            >
              Commit
            </Button>
            <Button 
              type="button" 
              onClick={handleScheduleAndSave}
              disabled={isScheduling || !duration}
              className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 sm:px-4"
            >
              <CalendarCheck className="w-4 h-4 mr-1.5 sm:mr-2" />
              <span className="hidden md:inline">{isScheduling ? 'Booking...' : 'Book The Time'}</span>
              <span className="hidden sm:inline md:hidden">{isScheduling ? 'Booking...' : 'Book Time'}</span>
              <span className="sm:hidden">{isScheduling ? 'Booking...' : 'Book'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
