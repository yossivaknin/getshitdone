# Deep QA - Bug Report

## Critical Bugs

### 1. **Delete Functionality Broken - Missing Prop**
**Location**: `src/components/kanban/Column.tsx:84-89`
**Issue**: `onDeleteTask` prop is not passed to `TaskCard` component
**Impact**: Delete button in TaskCard won't work because `onDelete` is undefined
**Code**:
```tsx
<TaskCard 
    key={task.id} 
    task={{ ...task, list_id: id }} 
    onEdit={onUpdateTask}
    allTags={allTags}
    // MISSING: onDelete={onDeleteTask}
/>
```

### 2. **HTML Structure Error - Unclosed/Misplaced Div**
**Location**: `src/components/kanban/TaskCard.tsx:201`
**Issue**: Missing closing `</div>` tag after action buttons section, causing HTML structure issues
**Impact**: Layout may break, styles may not apply correctly
**Code**: Line 201 has `</div>` but the structure is malformed

### 3. **Duplicate Delete Buttons**
**Location**: `src/components/kanban/TaskCard.tsx:191-199 and 237-246`
**Issue**: Two delete buttons - one in top-right action area, one in footer
**Impact**: Confusing UX, duplicate functionality
**Note**: User requested footer delete button, so top-right one should be removed

## High Priority Bugs

### 4. **Date Format Inconsistency - Parsing Issues**
**Location**: `src/components/create-task-dialog.tsx:131` and `src/components/edit-task-dialog.tsx:162`
**Issue**: Dates are converted to locale string format (e.g., "Dec 1") but then parsed back as Date objects
**Impact**: Date parsing may fail, especially with relative dates like "Today", "Tomorrow"
**Code**:
```tsx
dueDate: dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined
```
Then later trying to parse: `new Date(task.dueDate)` - this will fail for "Dec 1" format

### 5. **Stale Closure in Reschedule Function**
**Location**: `src/components/kanban/Board.tsx:281`
**Issue**: `handleRescheduleTask` uses `tasks` state directly instead of current state
**Impact**: May use outdated task data when rescheduling
**Code**:
```tsx
const newTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
```
Should use functional update to get latest state

### 6. **Empty String vs Undefined for Due Date**
**Location**: `src/components/edit-task-dialog.tsx:198`
**Issue**: `dueDate || task.dueDate` will use empty string if dueDate is ""
**Impact**: Empty string passed to scheduleTask instead of undefined, may cause parsing issues
**Code**:
```tsx
dueDate: dueDate || task.dueDate
```
Should be: `dueDate || (dueDate === '' ? undefined : task.dueDate)`

### 7. **Chunk Count Input Validation**
**Location**: `src/components/edit-task-dialog.tsx:406`
**Issue**: `parseInt(e.target.value) || 1` - if value is empty, parseInt returns NaN, defaults to 1
**Impact**: User can't clear the field, always defaults to 1
**Code**:
```tsx
onChange={(e) => setChunkCount(Math.max(1, parseInt(e.target.value) || 1))}
```

## Medium Priority Bugs

### 8. **Mock Data Tag Colors Don't Match Managed Tags**
**Location**: `src/app/page.tsx:19-82`
**Issue**: Initial mock tasks have hardcoded tag colors that don't use managed tags system
**Impact**: Tags may show wrong colors until user creates/edits tasks
**Example**: `tags: [{ name: 'Dev', color: 'bg-yellow-100 text-yellow-700' }]`

### 9. **No Data Persistence**
**Location**: `src/app/page.tsx:93`
**Issue**: Tasks are stored in component state, lost on page refresh
**Impact**: All tasks disappear when page is refreshed
**Note**: Expected for MVP, but should be documented

### 10. **Missing Duration Validation**
**Location**: `src/components/create-task-dialog.tsx:298`
**Issue**: Duration input accepts any number, including 0 or negative
**Impact**: Can create tasks with invalid durations
**Code**: `min="1"` is set but no validation on submit

### 11. **Tag Color Mismatch on Initial Load**
**Location**: `src/app/page.tsx` and tag system
**Issue**: When page loads, managed tags may be empty, so task tags won't have correct colors
**Impact**: Tags may show fallback colors instead of managed tag colors

### 12. **Date Input Border Styling Inconsistency**
**Location**: `src/components/edit-task-dialog.tsx:360`
**Issue**: Date input doesn't have `border-2 border-slate-300` like other inputs
**Impact**: Visual inconsistency

## Low Priority / UX Issues

### 13. **No Loading State for Delete**
**Location**: `src/components/kanban/Board.tsx:109-139`
**Issue**: Delete operation is async but no loading indicator
**Impact**: User doesn't know if delete is in progress

### 14. **No Error Handling for Calendar Delete**
**Location**: `src/components/kanban/Board.tsx:216-250`
**Issue**: If calendar event deletion fails, task is still deleted
**Impact**: Orphaned calendar events

### 15. **Confirm Dialog is Browser Native**
**Location**: `src/components/kanban/TaskCard.tsx:80`
**Issue**: Uses browser `confirm()` instead of styled dialog
**Impact**: Inconsistent UX

### 16. **No Toast Notification on Task Delete**
**Location**: `src/components/kanban/Board.tsx:136`
**Issue**: Task is deleted silently
**Impact**: User may not notice task was deleted

### 17. **Formatting Issue - className Indentation**
**Location**: `src/components/kanban/TaskCard.tsx:168`
**Issue**: className has incorrect indentation
**Impact**: Code readability

### 18. **Missing Error Boundary**
**Location**: App-wide
**Issue**: No error boundary to catch React errors
**Impact**: App crashes on error instead of showing error message

### 19. **No Validation for Tag Name Length**
**Location**: `src/lib/tags.ts:59-80`
**Issue**: Tag names can be any length, including empty after trim
**Impact**: Could create tags with very long names or just spaces

### 20. **Mission Status Date Parsing**
**Location**: `src/components/mission-status.tsx:32`
**Issue**: Tries to parse dates like "Dec 1" which may fail
**Impact**: Tasks with formatted dates may not show in "Today" or "This Week"

## Summary
- **Critical**: 3 bugs (delete functionality, HTML structure, duplicate buttons)
- **High Priority**: 4 bugs (date parsing, stale closures, validation)
- **Medium Priority**: 5 bugs (data persistence, styling, validation)
- **Low Priority**: 8 bugs (UX improvements, error handling)

**Total: 20 bugs identified**

