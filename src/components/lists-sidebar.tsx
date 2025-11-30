'use client'

import { useState } from 'react';
import { Plus, Folder, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface List {
  id: string;
  title: string;
  color?: string;
  taskCount?: number;
}

interface ListsSidebarProps {
  lists: List[];
  selectedListId?: string;
  onSelectList: (listId: string) => void;
  onCreateList: (title: string) => void;
}

export function ListsSidebar({ lists, selectedListId, onSelectList, onCreateList }: ListsSidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const handleCreate = () => {
    if (newListTitle.trim()) {
      onCreateList(newListTitle.trim());
      setNewListTitle('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Lists</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New List</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isCreating && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewListTitle('');
                }
              }}
              placeholder="List name..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewListTitle('');
                }}
                className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => onSelectList(list.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group",
                selectedListId === list.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Folder className={cn(
                "w-4 h-4 flex-shrink-0",
                selectedListId === list.id ? "text-blue-600" : "text-gray-400"
              )} />
              <span className="flex-1 text-sm font-medium truncate">{list.title}</span>
              {selectedListId === list.id && (
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
              {list.taskCount !== undefined && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  selectedListId === list.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {list.taskCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

