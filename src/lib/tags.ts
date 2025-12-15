// Utility functions for tag management
// NOTE: Tags are now stored in the database (user_tags table) for cross-device sync
// localStorage is kept as a fallback/cache for backward compatibility

export const STORAGE_KEY = 'getshitdone_tags';

export interface TagData {
  id: string;
  name: string;
  color: string;
}

// Light tag color mapping - deterministic based on tag name
const LIGHT_TAG_COLORS = [
  'bg-yellow-50 text-yellow-600 border-yellow-200',
  'bg-red-50 text-red-600 border-red-200',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-green-50 text-green-600 border-green-200',
  'bg-purple-50 text-purple-600 border-purple-200',
  'bg-orange-50 text-orange-600 border-orange-200',
  'bg-pink-50 text-pink-600 border-pink-200',
  'bg-indigo-50 text-indigo-600 border-indigo-200',
  'bg-teal-50 text-teal-600 border-teal-200',
  'bg-gray-50 text-gray-600 border-gray-200',
];

export const getLightTagColor = (tagName: string): string => {
  const index = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % LIGHT_TAG_COLORS.length;
  return LIGHT_TAG_COLORS[index];
};

export const getManagedTags = (): TagData[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading tags:', error);
      return [];
    }
  }
  return [];
};

export const getTagNames = (): string[] => {
  return getManagedTags().map(tag => tag.name);
};

export const getTagColor = (tagName: string): string => {
  const managedTags = getManagedTags();
  const tag = managedTags.find(t => t.name === tagName);
  if (tag) {
    return tag.color;
  }
  // Fallback to deterministic color if tag not found in managed tags
  return getLightTagColor(tagName);
};

export const addTagToManaged = (tagName: string): void => {
  if (typeof window === 'undefined') return;
  
  const trimmedName = tagName.trim();
  if (!trimmedName) return;
  
  const managedTags = getManagedTags();
  
  // Check if tag already exists
  if (managedTags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
    return;
  }
  
  const newTag: TagData = {
    id: Date.now().toString(),
    name: trimmedName,
    color: getLightTagColor(trimmedName),
  };
  
  const updatedTags = [...managedTags, newTag];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTags));
};

export const getAllTagsWithColors = (): { name: string; color: string }[] => {
  const managedTags = getManagedTags();
  return managedTags.map(tag => ({
    name: tag.name,
    color: tag.color,
  }));
};

