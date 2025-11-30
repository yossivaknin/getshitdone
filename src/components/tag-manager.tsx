'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getLightTagColor, type TagData, STORAGE_KEY } from '@/lib/tags';


export function TagManager() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  // Load tags from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTags(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    }
  }, []);

  // Save tags to localStorage whenever they change
  useEffect(() => {
    if (tags.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    }
  }, [tags]);

  const handleCreateTag = () => {
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

    const newTag: TagData = {
      id: Date.now().toString(),
      name: trimmedName,
      color: getLightTagColor(trimmedName),
    };

    setTags(prev => [...prev, newTag]);
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

  const handleSaveEdit = (tagId: string) => {
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

    setTags(prev =>
      prev.map(tag =>
        tag.id === tagId
          ? { ...tag, name: trimmedName, color: getLightTagColor(trimmedName) }
          : tag
      )
    );
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

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;

    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove it from all tasks.`)) {
      return;
    }

    setTags(prev => prev.filter(t => t.id !== tagId));
    
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
        {tags.length === 0 ? (
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

