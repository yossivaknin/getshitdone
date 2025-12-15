'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getLightTagColor, type TagData } from '@/lib/tags';
import { getUserTags, saveUserTag, deleteUserTag } from '@/app/actions';


export function TagManager() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  // Load tags from database on mount (with cache)
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        // Check cache first
        const { getCachedTags, setCachedTags } = await import('@/lib/tags-cache');
        const cachedTags = getCachedTags();
        
        if (cachedTags && cachedTags.length > 0) {
          console.log('[TagManager] Using cached tags:', cachedTags.length);
          const formattedTags: TagData[] = cachedTags.map((tag: any) => ({
            id: tag.id || Date.now().toString(),
            name: tag.name,
            color: tag.color || getLightTagColor(tag.name)
          }));
          setTags(formattedTags);
          setIsLoading(false);
          return;
        }
        
        // Cache miss - fetch from database
        const { tags: dbTags, error } = await getUserTags();
        
        if (error) {
          console.error('[TagManager] Error loading tags:', error);
          toast.error('Failed to load tags');
          setTags([]);
        } else {
          // Convert database tags to TagData format
          const formattedTags: TagData[] = (dbTags || []).map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || getLightTagColor(tag.name)
          }));
          setTags(formattedTags);
          
          // Update cache
          const cacheTags = formattedTags.map(t => ({ name: t.name, color: t.color }));
          setCachedTags(cacheTags);
          
          console.log('[TagManager] Loaded and cached', formattedTags.length, 'tags from database');
        }
      } catch (error) {
        console.error('[TagManager] Exception loading tags:', error);
        toast.error('Failed to load tags');
        setTags([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTags();
    
    // Listen for tag updates from other components
    const handleTagUpdate = async () => {
      // Clear cache and reload
      const { clearTagsCache } = await import('@/lib/tags-cache');
      clearTagsCache();
      loadTags();
    };
    
    window.addEventListener('tagsUpdated', handleTagUpdate);
    
    return () => {
      window.removeEventListener('tagsUpdated', handleTagUpdate);
    };
  }, []);

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) {
      toast.error('Tag name cannot be empty');
      return;
    }

    // Check for duplicates
    if (tags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Tag already exists');
      return;
    }

    const tagColor = getLightTagColor(trimmedName);
    const result = await saveUserTag(trimmedName, tagColor);
    
    if (result.error) {
      toast.error(`Failed to create tag: ${result.error}`);
      return;
    }

    // Reload tags from database and update cache
    const { tags: updatedTags } = await getUserTags();
    if (updatedTags) {
      const formattedTags: TagData[] = updatedTags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || getLightTagColor(tag.name)
      }));
      setTags(formattedTags);
      
      // Update cache
      const { setCachedTags } = await import('@/lib/tags-cache');
      const cacheTags = formattedTags.map(t => ({ name: t.name, color: t.color }));
      setCachedTags(cacheTags);
    }
    
    setNewTagName('');
    setShowNewTagInput(false);
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('tagsUpdated'));
    
    toast.success(`Tag "${trimmedName}" created`);
  };

  const handleStartEdit = (tag: TagData) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
  };

  const handleSaveEdit = async (tagId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error('Tag name cannot be empty');
      return;
    }

    // Check for duplicates (excluding current tag)
    if (tags.some(t => t.id !== tagId && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Tag name already exists');
      return;
    }

    const tag = tags.find(t => t.id === tagId);
    if (!tag) {
      toast.error('Tag not found');
      return;
    }

    // Update tag in database
    const tagColor = getLightTagColor(trimmedName);
    const result = await saveUserTag(trimmedName, tagColor);
    
    if (result.error) {
      toast.error(`Failed to update tag: ${result.error}`);
      return;
    }

    // If name changed, we need to delete the old tag and create a new one
    if (tag.name !== trimmedName) {
      // Delete old tag
      await deleteUserTag(tag.name);
      // The saveUserTag already created the new one
    }

    // Reload tags from database and update cache
    const { tags: updatedTags } = await getUserTags();
    if (updatedTags) {
      const formattedTags: TagData[] = updatedTags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || getLightTagColor(tag.name)
      }));
      setTags(formattedTags);
      
      // Update cache
      const { setCachedTags } = await import('@/lib/tags-cache');
      const cacheTags = formattedTags.map(t => ({ name: t.name, color: t.color }));
      setCachedTags(cacheTags);
    }
    
    setEditingTag(null);
    setEditName('');
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('tagsUpdated'));
    
    toast.success('Tag updated');
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditName('');
  };

  const handleDeleteTag = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;

    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all tasks.`)) {
      return;
    }

    const result = await deleteUserTag(tag.name);
    
    if (result.error) {
      toast.error(`Failed to delete tag: ${result.error}`);
      return;
    }

    // Reload tags from database and update cache
    const { tags: updatedTags } = await getUserTags();
    if (updatedTags) {
      const formattedTags: TagData[] = updatedTags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || getLightTagColor(tag.name)
      }));
      setTags(formattedTags);
      
      // Update cache
      const { setCachedTags } = await import('@/lib/tags-cache');
      const cacheTags = formattedTags.map(t => ({ name: t.name, color: t.color }));
      setCachedTags(cacheTags);
    }
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('tagsUpdated'));
    
    toast.success(`Tag "${tag.name}" deleted`);
  };

  return (
    <div className="bg-white rounded-md shadow-sm border-2 border-slate-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tag Management</h2>
            <p className="text-sm text-gray-500">Create, edit, and delete tags for your tasks</p>
          </div>
        </div>
      </div>

      {/* Tags List */}
      <div className="space-y-3 mb-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
            <p>Loading tags...</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tags yet. Create your first tag below.</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 p-3 border-2 border-slate-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Tag Preview */}
              <div className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-[4px] border bg-white text-gray-700 border-gray-400">
                {editingTag === tag.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(tag.id);
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className="w-32 h-7 text-xs border-2 border-slate-300"
                    autoFocus
                  />
                ) : (
                  tag.name
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                {editingTag === tag.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveEdit(tag.id)}
                      className="h-7 px-2 text-xs border-2 border-slate-300"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="h-7 px-2 text-xs border-2 border-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(tag)}
                      className="h-7 px-2 text-xs border-2 border-slate-300"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="h-7 px-2 text-xs border-2 border-slate-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create New Tag */}
      {!showNewTagInput ? (
        <Button
          variant="outline"
          onClick={() => setShowNewTagInput(true)}
          className="w-full border-2 border-slate-300 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Tag
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-3 border-2 border-slate-300 rounded-lg">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateTag();
              } else if (e.key === 'Escape') {
                setShowNewTagInput(false);
                setNewTagName('');
              }
            }}
            placeholder="Enter tag name"
            className="flex-1 border-2 border-slate-300"
            autoFocus
          />
          <Button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="border-2 border-slate-300"
          >
            Create
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowNewTagInput(false);
              setNewTagName('');
            }}
            className="border-2 border-slate-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Phase 2 Note */}
      <div className="mt-4 pt-4 border-t border-slate-300">
        <p className="text-xs text-gray-500">
          <strong>Coming in Phase 2:</strong> Configure tag-specific settings like chunking behavior, calendar preferences, and more.
        </p>
      </div>
    </div>
  );
}

