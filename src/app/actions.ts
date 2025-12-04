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

  // Fetch tags for all tasks separately
  const taskIds = (tasks || []).map(t => t.id)
  let tagsMap: Record<string, any[]> = {}
  
  if (taskIds.length > 0) {
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('task_id, name, color')
      .in('task_id', taskIds)

    if (!tagsError && tags) {
      // Group tags by task_id
      tags.forEach((tag: any) => {
        if (!tagsMap[tag.task_id]) {
          tagsMap[tag.task_id] = []
        }
        tagsMap[tag.task_id].push({
          name: tag.name,
          color: tag.color || 'bg-gray-100 text-gray-700'
        })
      })
    }
  }

  if (error) {
    console.error('Error fetching tasks:', error)
    return { error: error.message, tasks: [] }
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
    
    return {
      id: task.id,
      list_id: task.status || 'todo', // Map status to list_id for kanban columns
      title: task.title,
      description: task.description,
      tags: taskTags,
      dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : undefined,
      duration: task.duration_minutes,
      googleEventIds: task.google_event_ids || []
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
    // First, delete existing tags for this task
    await supabase
      .from('tags')
      .delete()
      .eq('task_id', task.id)

    // Then insert new tags if provided
    if (taskData.tags && taskData.tags.length > 0) {
      const tagInserts = taskData.tags.map(tagName => ({
        task_id: task.id,
        name: tagName,
        color: null
      }))

      const { error: tagsError } = await supabase
        .from('tags')
        .insert(tagInserts)

      if (tagsError) {
        console.error('Error creating tags:', tagsError)
        // Don't fail the whole operation if tags fail
      }
    }
  }

  revalidatePath('/')
  return { task, error: null }
}

export async function updateTask(taskId: string, updates: {
  title?: string
  description?: string
  status?: string
  dueDate?: string
  duration?: number
  tags?: string[]
}) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify task belongs to user
  const { data: existingTask } = await supabase
    .from('tasks')
    .select('id')
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
  if (updates.status !== undefined) updateData.status = updates.status
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
    // Delete existing tags
    await supabase
      .from('tags')
      .delete()
      .eq('task_id', taskId)

    // Insert new tags
    if (updates.tags.length > 0) {
      const tagInserts = updates.tags.map(tagName => ({
        task_id: taskId,
        name: tagName,
        color: null
      }))

      await supabase
        .from('tags')
        .insert(tagInserts)
    }
  }

  revalidatePath('/')
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

  revalidatePath('/')
  return { error: null }
}

export async function updateTaskStatus(taskId: string, newStatus: string, newPosition?: number) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: any = { status: newStatus }
  if (newPosition !== undefined) {
    updateData.position = newPosition
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating task status:', error)
    return { error: error.message }
  }

  revalidatePath('/app')
  return { error: null }
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
  workingHoursEnd?: string
) {
  try {
    // Import scheduling functions
    const { smartSchedule, Task } = await import('@/lib/smart-schedule')
    const { getBusySlots, CalendarConfig } = await import('@/lib/calendar')
    const { refreshAccessToken } = await import('@/lib/token-refresh')

    // Validate access token
    let validToken = accessToken

    // Check if token is valid, refresh if needed
    if (refreshToken) {
      const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
      if (!tokenTest.ok) {
        console.log('[SCHEDULE] Token expired, refreshing...')
        const newToken = await refreshAccessToken(refreshToken)
        if (newToken) {
          validToken = newToken
          // Update localStorage on client side would be ideal, but we can't do that from server
          // The client should handle token refresh
        } else {
          return {
            success: false,
            message: 'Token expired and refresh failed. Please reconnect your Google Calendar in Settings.',
            eventsCreated: 0
          }
        }
      }
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

    // Get working hours from parameters or localStorage (client-side) or defaults
    const defaultStart = workingHoursStart || '09:00'
    const defaultEnd = workingHoursEnd || '18:00'
    
    // Set end date to end of working day
    const [endHour, endMin] = defaultEnd.split(':').map(Number)
    dueDate.setHours(endHour, endMin, 0, 0)

    // Create calendar config
    const config: CalendarConfig = {
      accessToken: validToken,
      refreshToken: refreshToken,
      workingHoursStart: defaultStart,
      workingHoursEnd: defaultEnd
    }

    // Get busy slots from now until due date
    const now = new Date()
    let busySlots = await getBusySlots(config, now, dueDate)
    
    // Also get all existing events created by this app (to avoid overlaps)
    // Fetch tasks with google_event_ids to get all scheduled events
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('google_event_ids')
        .eq('user_id', user.id)
        .not('google_event_ids', 'is', null)
      
      if (existingTasks) {
        // Fetch event details for all existing scheduled events
        const allEventIds: string[] = []
        existingTasks.forEach((task: any) => {
          if (task.google_event_ids && Array.isArray(task.google_event_ids)) {
            allEventIds.push(...task.google_event_ids)
          }
        })
        
        // Fetch event details from Google Calendar to get their time slots
        if (allEventIds.length > 0) {
          try {
            const { TimeSlot } = await import('@/lib/calendar')
            const eventPromises = allEventIds.map(async (eventId: string) => {
              try {
                const eventResponse = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${validToken}`,
                    },
                  }
                )
                
                if (eventResponse.ok) {
                  const event = await eventResponse.json()
                  if (event.start?.dateTime && event.end?.dateTime) {
                    return {
                      start: new Date(event.start.dateTime),
                      end: new Date(event.end.dateTime)
                    } as TimeSlot
                  }
                }
              } catch (error) {
                console.error(`Error fetching event ${eventId}:`, error)
              }
              return null
            })
            
            const eventSlots = (await Promise.all(eventPromises)).filter(slot => slot !== null) as TimeSlot[]
            // Add app-created events to busy slots
            busySlots = [...busySlots, ...eventSlots]
            // Sort by start time
            busySlots.sort((a, b) => a.start.getTime() - b.start.getTime())
            console.log(`[SCHEDULE] Added ${eventSlots.length} app-created events to busy slots`)
          } catch (error) {
            console.error('Error fetching existing events:', error)
          }
        }
      }
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
