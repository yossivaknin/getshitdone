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

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    return { error: error.message, tasks: [] }
  }

  // Transform tasks to match the app's expected format
  const transformedTasks = (tasks || []).map(task => {
    // Handle tags - your schema has tags as an array column
    // Try to get tags from array column first, fallback to separate table
    let taskTags: any[] = []
    
    if (Array.isArray(task.tags)) {
      // Tags is an array column (your current schema)
      taskTags = task.tags.map((tagName: string) => ({
        name: tagName,
        color: 'bg-gray-100 text-gray-700' // Default color, will be managed client-side
      }))
    } else if (task.tags && typeof task.tags === 'object') {
      // Tags might be from a join (separate table)
      taskTags = Array.isArray(task.tags) ? task.tags.map((tag: any) => ({
        name: tag.name,
        color: tag.color || 'bg-gray-100 text-gray-700'
      })) : []
    }
    
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

  // Handle tags - your schema has tags as an array column
  // Update the task with tags array if provided
  if (taskData.tags && taskData.tags.length > 0 && task) {
    const { error: tagsError } = await supabase
      .from('tasks')
      .update({ tags: taskData.tags })
      .eq('id', task.id)

    if (tagsError) {
      console.error('Error updating tags array:', tagsError)
      // Fallback: try separate tags table if it exists
      const tagInserts = taskData.tags.map(tagName => ({
        task_id: task.id,
        name: tagName,
        color: null
      }))

      const { error: separateTagsError } = await supabase
        .from('tags')
        .insert(tagInserts)

      if (separateTagsError) {
        console.error('Error creating tags in separate table:', separateTagsError)
        // Don't fail the whole operation if tags fail
      }
    }
  } else if (task) {
    // Ensure tags is an empty array if no tags provided
    await supabase
      .from('tasks')
      .update({ tags: [] })
      .eq('id', task.id)
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
    updateData.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
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

  revalidatePath('/')
  return { error: null }
}
