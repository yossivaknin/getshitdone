'use client'

import { useState, useMemo } from 'react';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagFilter {
  name: string;
  color: string;
}

interface TagFilterSidebarProps {
  tags: TagFilter[];
  selectedTag?: string;
  onSelectTag: (tagName: string | undefined) => void;
}

export function TagFilterSidebar({ tags, selectedTag, onSelectTag }: TagFilterSidebarProps) {
  // Tags are already unique from the parent, but we'll keep this for safety
  const uniqueTags = useMemo(() => {
    const tagMap = new Map<string, TagFilter>();
    tags.forEach(tag => {
      if (!tagMap.has(tag.name)) {
        tagMap.set(tag.name, tag);
      }
    });
    return Array.from(tagMap.values());
  }, [tags]);

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Filter by Tag</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelectTag(undefined)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left mb-2",
            !selectedTag
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <span className="text-sm font-medium">All Tasks</span>
        </button>

        <div className="space-y-1">
          {uniqueTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => onSelectTag(tag.name)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left group",
                selectedTag === tag.name
                  ? "bg-black text-white"
                  : "hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-3 h-3 rounded-full flex-shrink-0",
                tag.color
              )} />
              <span className={cn(
                "flex-1 text-sm truncate",
                selectedTag === tag.name ? "font-medium text-white" : "text-gray-700"
              )}>
                {tag.name}
              </span>
              {selectedTag === tag.name && (
                <X 
                  className="w-4 h-4 text-white hover:text-gray-200 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTag(undefined);
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {uniqueTags.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No tags yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

