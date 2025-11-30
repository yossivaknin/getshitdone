'use server'

import { smartSchedule, Task } from '@/lib/smart-schedule';
import { getBusySlots, CalendarConfig } from '@/lib/calendar';
import { refreshAccessToken } from '@/lib/token-refresh';

/**
 * Verify and refresh token if needed
 */
async function getValidAccessToken(accessToken: string, refreshToken?: string): Promise<string | null> {
  console.log('[TOKEN] Validating access token...');
  console.log('[TOKEN] Access token present:', !!accessToken);
  console.log('[TOKEN] Refresh token present:', !!refreshToken);
  
  // First, try to use the current token by making a test call
  try {
    const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
    console.log('[TOKEN] Token validation response status:', testResponse.status);
    
    if (testResponse.ok) {
      const tokenInfo = await testResponse.json();
      console.log('[TOKEN] Token is valid. Expires in:', tokenInfo.expires_in, 'seconds');
      return accessToken;
    } else {
      const errorText = await testResponse.text();
      console.log('[TOKEN] Token validation failed:', errorText);
    }
  } catch (error) {
    console.error('[TOKEN] Token validation error:', error);
  }
  
  // If token is invalid and we have a refresh token, refresh it
  if (refreshToken) {
    console.log('[TOKEN] Attempting to refresh access token...');
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      console.log('[TOKEN] Successfully refreshed access token');
      return newToken;
    } else {
      console.error('[TOKEN] Failed to refresh access token');
    }
  } else {
    console.warn('[TOKEN] No refresh token available');
  }
  
  return null;
}

export async function scheduleTask(
  task: Task, 
  accessToken: string, 
  refreshToken?: string,
  workingHoursStart: string = '09:00', 
  workingHoursEnd: string = '18:00'
) {
  if (!accessToken) {
    return {
      success: false,
      eventsCreated: 0,
      message: 'Google Calendar not connected. Please connect in Settings first.'
    };
  }

  console.log('========================================');
  console.log('[SCHEDULE] Starting task scheduling');
  console.log('[SCHEDULE] Task:', task.title);
  console.log('[SCHEDULE] Duration:', task.duration, 'minutes');
  console.log('[SCHEDULE] Due date:', task.dueDate);
  console.log('[SCHEDULE] Task ID:', task.id);
  console.log('========================================');

  // Verify and refresh token if needed
  const validToken = await getValidAccessToken(accessToken, refreshToken);
  if (!validToken) {
    console.error('[SCHEDULE] No valid token available');
    return {
      success: false,
      eventsCreated: 0,
      message: 'Google Calendar token expired. Please reconnect in Settings.'
    };
  }
  
  console.log('[SCHEDULE] Using valid access token');

  const config: CalendarConfig = {
    accessToken: validToken,
    workingHoursStart,
    workingHoursEnd
  };
  
  const now = new Date();
  
  // Parse due date (handles relative dates like "Today", "Tomorrow")
  let dueDate: Date;
  if (!task.dueDate) {
    dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
  } else if (typeof task.dueDate === 'string') {
    const lowerDate = task.dueDate.toLowerCase();
    if (lowerDate === 'today') {
      const today = new Date(now);
      today.setHours(18, 0, 0, 0); // End of working day
      dueDate = today;
    } else if (lowerDate === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      dueDate = tomorrow;
    } else {
      const parsed = new Date(task.dueDate);
      dueDate = isNaN(parsed.getTime()) ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : parsed;
    }
  } else {
    dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  }
  
  console.log('Time range:', now.toISOString(), 'to', dueDate.toISOString());
  
  try {
    // Get busy slots from calendar
    const busySlots = await getBusySlots(config, now, dueDate);
    
    // Run smart schedule
    const result = await smartSchedule(task, config, busySlots);
    
    console.log('========================================');
    console.log('[SCHEDULE] Final result:', result);
    console.log('[SCHEDULE] Success:', result.success);
    console.log('[SCHEDULE] Events created:', result.eventsCreated);
    console.log('[SCHEDULE] Message:', result.message);
    if (result.eventIds) {
      console.log('[SCHEDULE] Event IDs:', result.eventIds);
    }
    console.log('========================================');
    
    return result;
  } catch (error: any) {
    console.error('Schedule error:', error);
    return {
      success: false,
      eventsCreated: 0,
      message: error.message || 'Failed to schedule task. Please try again.'
    };
  }
}
