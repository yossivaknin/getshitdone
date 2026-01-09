'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/app', 'layout')
  redirect('/login')
}

// Task Actions
/**
 * Get all unique tags for the current user from the database
 */
export async function getUserTags() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { tags: [], error: null }
    }

    const { data: tags, error } = await supabase
      .from('user_tags')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('name')

    if (error) {
      console.error('[GET USER TAGS] Error:', error)
      return { tags: [], error: error.message }
    }

    return { tags: tags || [], error: null }
  } catch (error: any) {
    console.error('[GET USER TAGS] Exception:', error)
    return { tags: [], error: error.message }
  }
}

/**
 * Create or update a tag for the current user
 */
export async function saveUserTag(tagName: string, color?: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Not authenticated' }
    }

    // Use default color if not provided
    const tagColor = color || 'bg-gray-50 text-gray-600 border-gray-200'

    // Try to insert, or update if exists (due to UNIQUE constraint)
    const { data, error } = await supabase
      .from('user_tags')
      .upsert({
        user_id: user.id,
        name: tagName.trim(),
        color: tagColor
      }, {
        onConflict: 'user_id,name'
      })
      .select()
      .single()

    if (error) {
      console.error('[SAVE USER TAG] Error:', error)
      return { error: error.message }
    }

    revalidatePath('/app')
    return { tag: data, error: null }
  } catch (error: any) {
    console.error('[SAVE USER TAG] Exception:', error)
    return { error: error.message }
  }
}

/**
 * Delete a tag for the current user
 */
export async function deleteUserTag(tagName: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('user_tags')
      .delete()
      .eq('user_id', user.id)
      .eq('name', tagName.trim())

    if (error) {
      console.error('[DELETE USER TAG] Error:', error)
      return { error: error.message }
    }

    revalidatePath('/app')
    return { error: null }
  } catch (error: any) {
    console.error('[DELETE USER TAG] Exception:', error)
    return { error: error.message }
  }
}

export async function getTasks() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', tasks: [] }
  }

  // Fetch tasks first
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    return { error: error.message, tasks: [] }
  }

  const taskIds = (tasks || []).map(t => t.id)
  
  // Fetch tags in parallel (only if we have tasks)
  let tagsMap: Record<string, any[]> = {};
  
  if (taskIds.length > 0) {
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('task_id, name, color')
      .in('task_id', taskIds);

    if (!tagsError && tags) {
      // Group tags by task_id (more efficient single pass)
      tags.forEach((tag: any) => {
        if (!tagsMap[tag.task_id]) {
          tagsMap[tag.task_id] = [];
        }
        tagsMap[tag.task_id].push({
          name: tag.name,
          color: tag.color || 'bg-gray-100 text-gray-700'
        });
      });
    }
  }

  // Transform tasks to match the app's expected format
  const transformedTasks = (tasks || []).map(task => {
    // Get tags from the tagsMap we built
    const taskTags = tagsMap[task.id] || []
    
    // Also check if tags is an array column (for backward compatibility)
    let arrayColumnTags: any[] = []
    if (task.tags && Array.isArray(task.tags)) {
      const validTags = task.tags.filter((tag: any) => tag !== null && tag !== undefined)
      if (validTags.length > 0 && typeof validTags[0] === 'string') {
        arrayColumnTags = validTags.map((tagName: string) => ({
          name: tagName,
          color: 'bg-gray-100 text-gray-700'
        }))
      }
    }
    
    // Use tags from separate table if available, otherwise use array column
    const finalTags = taskTags.length > 0 ? taskTags : arrayColumnTags
    
    // Map database status to UI list_id (convert 'in_progress' to 'in-progress')
    const mapStatusToListId = (status: string): string => {
      if (status === 'in_progress') return 'in-progress';
      return status || 'todo'; // 'todo' and 'done' are the same
    };
    
    return {
      id: task.id,
      list_id: mapStatusToListId(task.status || 'todo'), // Map status to list_id for kanban columns
      status: task.status || 'todo', // Also include status for reference
      title: task.title,
      description: task.description,
      tags: finalTags,
      dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : undefined,
      duration: task.duration_minutes,
      googleEventIds: task.google_event_ids || [],
      chunkCount: task.chunk_count || undefined,
      chunkDuration: task.chunk_duration || undefined
    }
  })

  return { tasks: transformedTasks, error: null }
}

export async function createTask(taskData: {
  title: string
  description?: string
  status?: string
  dueDate?: string
  duration?: number
  tags?: string[]
  chunkCount?: number
  chunkDuration?: number
}) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Ensure profile exists (workspaces.owner_id references profiles.id)
  let { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Create profile if it doesn't exist
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || null
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return { error: 'Failed to create profile: ' + profileError.message }
    }
    profile = newProfile
  }

  // Get or create workspace for the user
  let { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    // Create a default workspace for the user
    const { data: newWorkspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ 
        name: 'My Workspace', 
        owner_id: user.id 
      })
      .select('id')
      .single()

    if (wsError) {
      console.error('Error creating workspace:', wsError)
      return { error: 'Failed to create workspace: ' + wsError.message }
    }
    workspace = newWorkspace
  }

  // Get the highest position for this status
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('position')
    .eq('user_id', user.id)
    .eq('status', taskData.status || 'todo')
    .order('position', { ascending: false })
    .limit(1)

  const position = existingTasks && existingTasks.length > 0 
    ? (existingTasks[0].position || 0) + 1 
    : 0

  // Create the task
  const insertData: any = {
    title: taskData.title,
    description: taskData.description || null,
    status: taskData.status || 'todo',
    due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
    duration_minutes: taskData.duration || null,
    user_id: user.id,
    workspace_id: workspace.id, // Required field
    position,
    google_event_ids: []
  }
  
  // Only include chunking columns if they're provided (and columns exist in schema)
  // This prevents errors if columns haven't been added yet or schema cache hasn't refreshed
  if (taskData.chunkCount !== undefined && taskData.chunkCount !== null) {
    insertData.chunk_count = taskData.chunkCount
  }
  if (taskData.chunkDuration !== undefined && taskData.chunkDuration !== null) {
    insertData.chunk_duration = taskData.chunkDuration
  }
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single()

  if (taskError) {
    console.error('Error creating task:', taskError)
    return { error: taskError.message }
  }

  // Handle tags - use separate tags table
  if (task) {
    console.log('[CREATE TASK] Tags received:', taskData.tags)
    console.log('[CREATE TASK] Task ID:', task.id)
    
    // First, delete existing tags for this task (in case of re-creation)
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('task_id', task.id)

    if (deleteError) {
      console.warn('[CREATE TASK] Error deleting existing tags (may not exist):', deleteError)
    }

    // Then insert new tags if provided
    if (taskData.tags && taskData.tags.length > 0) {
      const tagInserts = taskData.tags.map(tagName => ({
        task_id: task.id,
        name: tagName,
        color: null
      }))

      console.log('[CREATE TASK] Inserting tags:', tagInserts)

      const { data: insertedTags, error: tagsError } = await supabase
        .from('tags')
        .insert(tagInserts)
        .select()

      if (tagsError) {
        console.error('[CREATE TASK] Error creating tags:', tagsError)
        console.error('[CREATE TASK] Tag inserts attempted:', tagInserts)
        console.error('[CREATE TASK] Task ID:', task.id)
        // Return error so user knows tags weren't saved
        return { error: `Task created but tags failed: ${tagsError.message}`, task }
      } else {
        console.log('[CREATE TASK] Tags created successfully:', insertedTags)
      }
    } else {
      console.log('[CREATE TASK] No tags to insert')
    }
  }

  // Only revalidate if task was actually created (not on error)
  if (task) {
    revalidatePath('/app')
  }
  return { task, error: null }
}

export async function updateTask(taskId: string, updates: {
  title?: string
  description?: string
  status?: string
  dueDate?: string
  duration?: number
  tags?: string[]
  chunkCount?: number
  chunkDuration?: number
}) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get current task to check for calendar events
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id, google_event_ids, status')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!existingTask) {
    return { error: 'Task not found or access denied' }
  }

  // Update task
  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.status !== undefined) {
    updateData.status = updates.status
    // If moving to 'done', clear calendar event IDs
    // The actual calendar events will be deleted client-side (since we need access token)
    if (updates.status === 'done' && existingTask.google_event_ids && Array.isArray(existingTask.google_event_ids) && existingTask.google_event_ids.length > 0) {
      updateData.google_event_ids = []
      console.log('[updateTask] Moving to done - clearing calendar event IDs:', existingTask.google_event_ids)
    }
  }
  if (updates.dueDate !== undefined) {
    // Handle empty string as null (clearing the date)
    if (updates.dueDate === '' || updates.dueDate === null) {
      updateData.due_date = null
    } else {
      // Parse and set the date
      const dateValue = new Date(updates.dueDate)
      if (!isNaN(dateValue.getTime())) {
        updateData.due_date = dateValue.toISOString()
      } else {
        updateData.due_date = null
      }
    }
  }
  if (updates.duration !== undefined) updateData.duration_minutes = updates.duration
  // Only include chunking columns if they're provided (and columns exist in schema)
  if (updates.chunkCount !== undefined && updates.chunkCount !== null) {
    updateData.chunk_count = updates.chunkCount
  }
  if (updates.chunkDuration !== undefined && updates.chunkDuration !== null) {
    updateData.chunk_duration = updates.chunkDuration
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (taskError) {
    console.error('Error updating task:', taskError)
    return { error: taskError.message }
  }

  // Update tags if provided
  if (updates.tags !== undefined && task) {
    console.log('[UPDATE TASK] Tags received:', updates.tags)
    console.log('[UPDATE TASK] Task ID:', taskId)
    
    // Delete existing tags
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('task_id', taskId)

    if (deleteError) {
      console.error('[UPDATE TASK] Error deleting existing tags:', deleteError)
      console.error('[UPDATE TASK] Task ID:', taskId)
    } else {
      console.log('[UPDATE TASK] Existing tags deleted')
    }

    // Insert new tags
    if (updates.tags.length > 0) {
      const tagInserts = updates.tags.map(tagName => ({
        task_id: taskId,
        name: tagName,
        color: null
      }))

      console.log('[UPDATE TASK] Inserting tags:', tagInserts)

      const { data: insertedTags, error: tagsError } = await supabase
        .from('tags')
        .insert(tagInserts)
        .select()

      if (tagsError) {
        console.error('[UPDATE TASK] Error updating tags:', tagsError)
        console.error('[UPDATE TASK] Tag inserts attempted:', tagInserts)
        console.error('[UPDATE TASK] Task ID:', taskId)
        return { error: `Task updated but tags failed: ${tagsError.message}`, task }
      } else {
        console.log('[UPDATE TASK] Tags updated successfully:', insertedTags)
      }
    } else {
      console.log('[UPDATE TASK] No tags to insert (all tags removed)')
    }
  }

  // Only revalidate if task was actually updated (not on error)
  if (task) {
    revalidatePath('/app')
  }
  return { task, error: null }
}

export async function deleteTask(taskId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting task:', error)
    return { error: error.message }
  }

  // Only revalidate on successful delete
  revalidatePath('/app')
  return { error: null }
}

export async function updateTaskStatus(taskId: string, newStatus: string, newPosition?: number) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  console.log('[updateTaskStatus] Updating task:', {
    taskId,
    newStatus,
    newPosition,
    userId: user.id
  });

  // Get the task first to check for calendar events
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('google_event_ids, status')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single()

  const updateData: any = { status: newStatus }
  if (newPosition !== undefined) {
    updateData.position = newPosition
  }

  // If moving to 'done', clear calendar event IDs
  // The actual calendar events will be deleted client-side (since we need access token)
  if (newStatus === 'done' && currentTask?.google_event_ids && Array.isArray(currentTask.google_event_ids) && currentTask.google_event_ids.length > 0) {
    updateData.google_event_ids = []
    console.log('[updateTaskStatus] Moving to done - clearing calendar event IDs:', currentTask.google_event_ids)
  }

  const { data: updatedTask, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[updateTaskStatus] Error updating task status:', error)
    return { error: error.message }
  }

  console.log('[updateTaskStatus] Task updated successfully:', {
    taskId: updatedTask?.id,
    newStatus: updatedTask?.status,
    oldStatus: currentTask?.status,
    hadCalendarEvents: currentTask?.google_event_ids?.length > 0
  })

  revalidatePath('/app')
  return { 
    error: null, 
    task: updatedTask,
    hadCalendarEvents: currentTask?.google_event_ids?.length > 0,
    calendarEventIds: currentTask?.google_event_ids || []
  }
}

/**
 * Delete calendar events from Google Calendar
 * This is a server action that can be called from the client
 */
export async function deleteCalendarEvents(eventIds: string[], accessToken: string) {
  if (!eventIds || eventIds.length === 0) {
    return { success: true, deleted: 0, message: 'No events to delete' }
  }

  if (!accessToken) {
    return { success: false, deleted: 0, message: 'No access token provided' }
  }

  console.log('[deleteCalendarEvents] Deleting', eventIds.length, 'calendar events')

  let successCount = 0
  const errors: string[] = []

  for (const eventId of eventIds) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (response.ok) {
        console.log('[deleteCalendarEvents] ✅ Deleted event:', eventId)
        successCount++
      } else {
        const errorText = await response.text()
        console.error('[deleteCalendarEvents] Failed to delete event:', eventId, errorText)
        errors.push(`Event ${eventId}: ${errorText.substring(0, 100)}`)
      }
    } catch (error: any) {
      console.error('[deleteCalendarEvents] Error deleting event:', eventId, error)
      errors.push(`Event ${eventId}: ${error.message || String(error)}`)
    }
  }

  if (successCount === eventIds.length) {
    return { success: true, deleted: successCount, message: `Successfully deleted ${successCount} calendar event(s)` }
  } else if (successCount > 0) {
    return { success: true, deleted: successCount, message: `Deleted ${successCount} of ${eventIds.length} events`, errors }
  } else {
    return { success: false, deleted: 0, message: `Failed to delete calendar events`, errors }
  }
}

export async function scheduleTask(
  taskData: {
    id: string
    title: string
    duration: number
    dueDate?: string
    list_id: string
    chunkCount?: number
    chunkDuration?: number
  },
  accessToken: string,
  refreshToken?: string,
  workingHoursStart?: string,
  workingHoursEnd?: string,
  timezone?: string
) {
  try {
    // Import scheduling functions
    const { smartSchedule, Task } = await import('@/lib/smart-schedule')
    const { getBusySlots, CalendarConfig, TimeSlot } = await import('@/lib/calendar')
    const { refreshAccessToken } = await import('@/lib/token-refresh')

    // Validate access token
    let validToken = accessToken

    // Check if token is valid, refresh if needed
    if (refreshToken) {
      try {
        const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
        if (!tokenTest.ok) {
          const errorText = await tokenTest.text()
          console.log('[SCHEDULE] Token validation failed, attempting refresh...', {
            status: tokenTest.status,
            error: errorText
          })
          
          const newToken = await refreshAccessToken(refreshToken)
          if (newToken) {
            validToken = newToken
            console.log('[SCHEDULE] ✅ Token refreshed successfully')
            // Update localStorage on client side would be ideal, but we can't do that from server
            // The client should handle token refresh
          } else {
            return {
              success: false,
              message: 'Token expired and refresh failed. Please reconnect your Google Calendar in Settings.',
              eventsCreated: 0
            }
          }
        } else {
          console.log('[SCHEDULE] ✅ Token is valid')
        }
      } catch (error: any) {
        console.error('[SCHEDULE] Error validating token:', error)
        // Try to proceed anyway - the API call will fail with a better error message
      }
    } else {
      console.warn('[SCHEDULE] ⚠️ No refresh token available - cannot refresh if token expires')
    }

    // Parse due date
    let dueDate: Date
    if (taskData.dueDate) {
      const parsed = new Date(taskData.dueDate)
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed
      } else {
        // Default to 7 days from now
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    } else {
      // Default to 7 days from now
      dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }

    // Get working hours and timezone from parameters or defaults
    const defaultStart = workingHoursStart || '09:00'
    const defaultEnd = workingHoursEnd || '18:00'
    const userTimezone = timezone || 'America/New_York' // Default to NY timezone
    
    const now = new Date();
    console.log('[SCHEDULE] ========== SCHEDULING TASK ==========');
    console.log('[SCHEDULE] Task:', taskData.title);
    console.log('[SCHEDULE] Duration:', taskData.duration, 'minutes');
    console.log('[SCHEDULE] Current time (UTC):', now.toISOString());
    console.log('[SCHEDULE] Current time (local):', now.toLocaleString());
    console.log('[SCHEDULE] Working hours (from parameters/localStorage):', `${defaultStart} - ${defaultEnd}`);
    console.log('[SCHEDULE] User timezone:', userTimezone);
    console.log('[SCHEDULE] Working hours source:', workingHoursStart ? 'parameters' : (workingHoursEnd ? 'parameters (end only)' : 'defaults (09:00-18:00)'));
    
    // Check localStorage to see what's actually stored
    if (typeof window !== 'undefined') {
      const storedStart = localStorage.getItem('working_hours_start');
      const storedEnd = localStorage.getItem('working_hours_end');
      const storedTimezone = localStorage.getItem('user_timezone');
      console.log('[SCHEDULE] localStorage working_hours_start:', storedStart);
      console.log('[SCHEDULE] localStorage working_hours_end:', storedEnd);
      console.log('[SCHEDULE] localStorage user_timezone:', storedTimezone);
    }
    
    // DEBUGGER: Pause here to inspect working hours source
    debugger; // Check: workingHoursStart, workingHoursEnd, defaultStart, defaultEnd, userTimezone
    
    // Set end date to end of working day
    const [endHour, endMin] = defaultEnd.split(':').map(Number)
    dueDate.setHours(endHour, endMin, 0, 0)

    // Create calendar config
    const config: CalendarConfig = {
      accessToken: validToken,
      refreshToken: refreshToken,
      workingHoursStart: defaultStart,
      workingHoursEnd: defaultEnd,
      timezone: userTimezone // CRITICAL: Pass user's timezone!
    }
    
    console.log('[SCHEDULE] Calendar config working hours:', `${config.workingHoursStart} - ${config.workingHoursEnd}`);
    console.log('[SCHEDULE] Calendar config timezone:', config.timezone);
    console.log('[SCHEDULE] Calendar config object:', JSON.stringify(config, null, 2));

    // Get busy slots from now until due date
    // IMPORTANT: FreeBusy API returns ALL busy periods, including external meetings
    // Note: 'now' is already defined above, reuse it
    let busySlots: TimeSlot[] = []
    
    try {
      busySlots = await getBusySlots(config, now, dueDate)
      
      console.log(`[SCHEDULE] ===== BUSY SLOTS FROM FREEBUSY API =====`)
      console.log(`[SCHEDULE] Initial busy slots from FreeBusy API: ${busySlots.length}`)
      console.log(`[SCHEDULE] These busy slots include ALL calendar events (external meetings, app-created events, etc.)`)
      
      if (busySlots.length === 0) {
        console.warn(`[SCHEDULE] ⚠️ FreeBusy API returned ZERO busy slots. This might mean:`)
        console.warn(`[SCHEDULE]   1. Calendar is completely free (unlikely if you have meetings)`)
        console.warn(`[SCHEDULE]   2. No events in the requested time range`)
        console.warn(`[SCHEDULE] Proceeding with scheduling (will still check for conflicts with app-created events)`)
      } else {
        console.log(`[SCHEDULE] ✅ FreeBusy API returned ${busySlots.length} busy slot(s)`)
        console.log(`[SCHEDULE] Sample busy slots:`)
        busySlots.slice(0, 5).forEach((slot, idx) => {
          console.log(`  [${idx + 1}] ${new Date(slot.start).toLocaleString()} - ${new Date(slot.end).toLocaleString()}`)
        })
      }
    } catch (error: any) {
      console.error(`[SCHEDULE] ❌ Failed to fetch busy slots from Google Calendar:`, error)
      
      // Check if it's an authentication error
      if (error.message?.includes('401') || error.message?.includes('unauthorized') || error.message?.includes('invalid_token')) {
        return {
          success: false,
          eventsCreated: 0,
          message: 'Google Calendar authentication failed. Your access token may have expired. Please reconnect your Google Calendar in Settings.'
        }
      }
      
      // Check if it's a permissions error
      if (error.message?.includes('403') || error.message?.includes('permission') || error.message?.includes('forbidden')) {
        return {
          success: false,
          eventsCreated: 0,
          message: 'Google Calendar permissions denied. Please check your Google Calendar permissions and reconnect in Settings.'
        }
      }
      
      // Generic error
      return {
        success: false,
        eventsCreated: 0,
        message: `Failed to fetch busy slots from calendar: ${error.message || 'Unknown error'}. Please check your Google Calendar connection and try again.`
      }
    }
    
    // Also get all existing "[Focus]" events directly from Google Calendar
    // This ensures we have the most up-to-date list of app-created events
    // Note: FreeBusy should already include these, but fetching separately ensures we have them
    try {
      const { TimeSlot } = await import('@/lib/calendar')
      const timeMin = now.toISOString()
      const timeMax = dueDate.toISOString()
      
      // Get Google Cloud project ID and API key from environment (optional)
      const { getGoogleProjectId } = await import('@/lib/calendar')
      const googleProjectId = getGoogleProjectId()
      const googleApiKey = process.env.GOOGLE_API_KEY
      
      // Build URL with API key if available (helps with project identification)
      let eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `maxResults=2500&` +
        `orderBy=startTime&` +
        `singleEvents=true&` +
        `q=[Focus]`
      if (googleApiKey) {
        eventsUrl += `&key=${encodeURIComponent(googleApiKey)}`
      }
      
      // Build headers - include X-Goog-User-Project only if we can determine it
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${validToken}`,
      };
      
      // Only add X-Goog-User-Project if we have it (optional - Google can infer from token)
      if (googleProjectId) {
        headers['X-Goog-User-Project'] = googleProjectId;
      }
      
      // Fetch all events with "[Focus]" in the title from Google Calendar
      const eventsResponse = await fetch(
        eventsUrl,
        {
          headers,
        }
      )
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const focusEvents = eventsData.items || []
        
        console.log(`[SCHEDULE] Found ${focusEvents.length} existing [Focus] events in calendar`)
        
        // Convert to TimeSlot format
        const focusEventSlots: TimeSlot[] = focusEvents
          .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
          .map((event: any) => ({
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime)
          }))
        
        // Merge with busy slots from FreeBusy API
        // Use a Set to track unique time ranges (avoid duplicates)
        const existingSlots = new Set<string>()
        const mergedSlots: TimeSlot[] = []
        
        // Add FreeBusy slots first (these include ALL meetings)
        busySlots.forEach(slot => {
          const key = `${slot.start.getTime()}-${slot.end.getTime()}`
          if (!existingSlots.has(key)) {
            existingSlots.add(key)
            mergedSlots.push(slot)
          }
        })
        
        // Add Focus event slots (avoid duplicates)
        focusEventSlots.forEach(slot => {
          const key = `${slot.start.getTime()}-${slot.end.getTime()}`
          if (!existingSlots.has(key)) {
            existingSlots.add(key)
            mergedSlots.push(slot)
          }
        })
        
        // Sort by start time
        mergedSlots.sort((a, b) => a.start.getTime() - b.start.getTime())
        busySlots = mergedSlots
        
        console.log(`[SCHEDULE] Total busy slots after merging: ${busySlots.length}`)
        console.log(`[SCHEDULE]   - From FreeBusy API (includes ALL meetings): ${busySlots.length - focusEventSlots.length}`)
        console.log(`[SCHEDULE]   - From [Focus] events query: ${focusEventSlots.length}`)
        
        // Log first few busy slots for debugging
        if (busySlots.length > 0) {
          console.log(`[SCHEDULE] Sample busy slots (first 5):`)
          busySlots.slice(0, 5).forEach((slot, idx) => {
            console.log(`  [${idx + 1}] ${new Date(slot.start).toISOString()} - ${new Date(slot.end).toISOString()}`)
          })
        }
      } else {
        console.warn(`[SCHEDULE] Failed to fetch [Focus] events: ${eventsResponse.status}`)
        console.warn(`[SCHEDULE] Continuing with FreeBusy slots only (should still include all meetings)`)
        // Continue with FreeBusy slots only - these should still include all meetings
      }
    } catch (error) {
      console.error('[SCHEDULE] Error fetching [Focus] events:', error)
      console.warn('[SCHEDULE] Continuing with FreeBusy slots only (should still include all meetings)')
      // Continue with FreeBusy slots only - these should still include all meetings
    }
    
    // Final validation: ensure we have busy slots
    if (busySlots.length === 0) {
      console.warn('[SCHEDULE] ⚠️ WARNING: No busy slots found! This means:')
      console.warn('[SCHEDULE]   1. Either your calendar is completely free')
      console.warn('[SCHEDULE]   2. Or the FreeBusy API is not working correctly')
      console.warn('[SCHEDULE]   3. Conflict detection will NOT work!')
    } else {
      console.log(`[SCHEDULE] ✅ Ready to schedule with ${busySlots.length} busy slots to avoid`)
    }

    // Create task object for smartSchedule
    const task: Task = {
      id: taskData.id,
      title: taskData.title,
      duration: taskData.duration,
      dueDate: dueDate,
      list_id: taskData.list_id,
      chunkCount: taskData.chunkCount,
      chunkDuration: taskData.chunkDuration
    }

    // Schedule the task
    const result = await smartSchedule(task, config, busySlots)

    if (result.success && result.eventIds) {
      // Update task in database with event IDs
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('tasks')
          .update({ google_event_ids: result.eventIds })
          .eq('id', taskData.id)
          .eq('user_id', user.id)
      }

      revalidatePath('/app')
    }

    return result
  } catch (error: any) {
    console.error('[SCHEDULE] Error scheduling task:', error)
    return {
      success: false,
      message: error?.message || 'Failed to schedule task. Please check your calendar connection.',
      eventsCreated: 0
    }
  }
}


/**
 * Save Google Calendar tokens to database
 * This allows tokens to be shared between web and mobile
 */
export async function saveGoogleCalendarTokens(accessToken: string, refreshToken?: string, expiresIn?: number) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[SAVE TOKENS] No user found')
      return { success: false, error: 'Not authenticated' }
    }

    // Calculate expiration time if expiresIn is provided (in seconds)
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    const { data, error } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: user.id,
        google_access_token: accessToken,
        google_refresh_token: refreshToken || null,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()

    if (error) {
      console.error('[SAVE TOKENS] Error:', error)
      return { success: false, error: error.message }
    }

    console.log('[SAVE TOKENS] ✅ Tokens saved to database for user:', user.id)
    return { success: true, data }
  } catch (error: any) {
    console.error('[SAVE TOKENS] Exception:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Google Calendar tokens from database
 * Falls back to localStorage if not found in database
 */
export async function getGoogleCalendarTokens() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('[GET TOKENS] ⚠️ No user found (not authenticated), checking localStorage')
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('google_calendar_token')
        const refreshToken = localStorage.getItem('google_calendar_refresh_token')
        console.log('[GET TOKENS] localStorage check:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken })
        return {
          accessToken,
          refreshToken,
          source: 'localStorage'
        }
      }
      console.log('[GET TOKENS] ⚠️ No user and no window, returning null')
      return { accessToken: null, refreshToken: null, source: null }
    }

    const { data, error } = await supabase
      .from('user_tokens')
      .select('google_access_token, google_refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.log('[GET TOKENS] Database query error:', error.message, error.code)
    }
    
    if (error || !data) {
      console.log('[GET TOKENS] Not found in database (error or no data), checking localStorage')
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('google_calendar_token')
        const refreshToken = localStorage.getItem('google_calendar_refresh_token')
        return {
          accessToken,
          refreshToken,
          source: 'localStorage'
        }
      }
      return { accessToken: null, refreshToken: null, source: null }
    }

    console.log('[GET TOKENS] ✅ Tokens found in database')
    return {
      accessToken: data.google_access_token,
      refreshToken: data.google_refresh_token,
      expiresAt: data.token_expires_at,
      source: 'database'
    }
  } catch (error: any) {
    console.error('[GET TOKENS] Exception:', error)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('google_calendar_token')
      const refreshToken = localStorage.getItem('google_calendar_refresh_token')
      return {
        accessToken,
        refreshToken,
        source: 'localStorage'
      }
    }
    return { accessToken: null, refreshToken: null, source: null }
  }
}
