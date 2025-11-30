'use client'

import { useState } from 'react';
import { Folder, Plus } from 'lucide-react';
import Link from 'next/link';

interface List {
  id: string;
  title: string;
  color?: string;
  taskCount?: number;
}

interface ListsGridViewProps {
  lists: List[];
  onCreateList: (title: string) => void;
}

export function ListsGridView({ lists, onCreateList }: ListsGridViewProps) {
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Lists</h1>
        <p className="text-gray-500">Select a list to view its kanban board</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/list/${list.id}`}
            className="bg-white rounded-md p-6 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <Folder className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
              {list.taskCount !== undefined && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {list.taskCount} tasks
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{list.title}</h3>
            <p className="text-sm text-gray-500">View kanban board</p>
          </Link>
        ))}

        {/* Create New List Card */}
        <button
          onClick={() => setIsCreating(true)}
          className="bg-white rounded-md p-6 border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex flex-col items-center justify-center min-h-[140px] group"
        >
          {isCreating ? (
            <div className="w-full">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewListTitle('');
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
              <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                New List
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

