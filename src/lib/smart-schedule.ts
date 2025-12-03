// Smart Scheduling Logic
import { findFreeSlots, createCalendarEvent, TimeSlot, CalendarConfig } from './calendar';

export interface Task {
  id: string;
  title: string;
  duration?: number; // minutes
  dueDate?: string | Date;
  list_id: string;
  chunkCount?: number; // Manual chunk count override
  chunkDuration?: number; // Duration per chunk in minutes (if manual chunking)
}

export interface ScheduleResult {
  success: boolean;
  eventsCreated: number;
  message: string;
  eventIds?: string[];
}

/**
 * Parse relative date strings to actual Date objects
 */
function parseDueDate(dueDate: string | Date | undefined): Date {
  if (!dueDate) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
  }
  
  if (dueDate instanceof Date) {
    return dueDate;
  }
  
  const now = new Date();
  const lowerDate = dueDate.toLowerCase();
  
  if (lowerDate === 'today') {
    const today = new Date(now);
    today.setHours(18, 0, 0, 0); // End of working day
    return today;
  }
  
  if (lowerDate === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    return tomorrow;
  }
  
  if (lowerDate === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);
    return yesterday;
  }
  
  // Try to parse as date string (e.g., "Nov 25", "2024-11-25")
  const parsed = new Date(dueDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Default to 7 days from now
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Smart Schedule Logic
 * Splits tasks > 1 hour into 1-hour chunks and schedules them
 */
export async function smartSchedule(
  task: Task,
  config: CalendarConfig,
  busySlots: TimeSlot[]
): Promise<ScheduleResult> {
  const duration = task.duration || 60; // Default 1 hour
  const dueDate = parseDueDate(task.dueDate);
  const now = new Date();
  
  console.log('Smart scheduling:', {
    task: task.title,
    duration,
    dueDate: dueDate.toISOString(),
    now: now.toISOString(),
    busySlotsCount: busySlots.length
  });
  
  // Calculate chunks
  let chunks: number[] = [];
  
  // If manual chunk count is specified, use it
  if (task.chunkCount && task.chunkCount > 1) {
    // Use specified chunk duration if provided, otherwise calculate evenly
    const perChunkDuration = task.chunkDuration || Math.ceil(duration / task.chunkCount);
    chunks = Array(task.chunkCount).fill(perChunkDuration);
    // Adjust last chunk if needed to match total duration
    const total = chunks.reduce((a, b) => a + b, 0);
    if (total > duration) {
      chunks[chunks.length - 1] -= (total - duration);
    } else if (total < duration) {
      // If chunks don't add up to total, add remainder to last chunk
      chunks[chunks.length - 1] += (duration - total);
    }
    console.log(`Task will be manually split into ${chunks.length} chunk(s) of ${perChunkDuration} min each:`, chunks);
  } else {
    // Automatic chunking: split into 1-hour chunks
    let remaining = duration;
    while (remaining > 0) {
      if (remaining >= 60) {
        chunks.push(60);
        remaining -= 60;
      } else {
        chunks.push(remaining);
        remaining = 0;
      }
    }
    console.log(`Task will be automatically split into ${chunks.length} chunk(s):`, chunks);
  }
  
  // Find free slots for all chunks
  const allFreeSlots: TimeSlot[] = [];
  let currentTime = now;
  // Track scheduled slots so they don't overlap
  const scheduledSlots: TimeSlot[] = [...busySlots];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkDuration = chunks[i];
    console.log(`Finding slot for chunk ${i + 1}/${chunks.length} (${chunkDuration} minutes)`);
    console.log(`Current time: ${currentTime.toISOString()}`);
    console.log(`Already scheduled ${scheduledSlots.length - busySlots.length} chunk(s)`);
    
    // Find free slots, excluding already scheduled chunks
    const freeSlots = findFreeSlots(
      scheduledSlots, // Use scheduledSlots which includes previously scheduled chunks
      currentTime,
      dueDate,
      config.workingHoursStart,
      config.workingHoursEnd,
      chunkDuration
    );
    
    console.log(`Found ${freeSlots.length} free slot(s) for chunk ${i + 1}`);
    
    if (freeSlots.length === 0) {
      return {
        success: false,
        eventsCreated: 0,
        message: `Not enough time available before due date. Please adjust date or duration.`
      };
    }
    
    // Use the first available slot
    const selectedSlot = freeSlots[0];
    allFreeSlots.push(selectedSlot);
    console.log(`Selected slot: ${selectedSlot.start.toISOString()} to ${selectedSlot.end.toISOString()}`);
    
    // Add this slot to scheduledSlots so next chunk won't use it
    scheduledSlots.push(selectedSlot);
    // Sort scheduled slots for efficient conflict checking
    scheduledSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Next chunk starts after this one ends (with a buffer to allow for breaks)
    // Use a minimum gap of 1 hour between chunks, or start of next day if needed
    const minGap = 60 * 60 * 1000; // 1 hour minimum gap
    currentTime = new Date(selectedSlot.end.getTime() + minGap);
    
    // If we've moved past working hours, move to next day's start
    const [startHour, startMin] = config.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
    
    if (currentTime.getHours() >= endHour || 
        (currentTime.getHours() === endHour && currentTime.getMinutes() >= endMin)) {
      // Move to next day at working hours start
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startHour, startMin, 0, 0);
      console.log(`Moved to next day: ${currentTime.toISOString()}`);
    }
  }
  
  // Create calendar events
  const eventIds: string[] = [];
  const totalChunks = chunks.length;
  
  for (let i = 0; i < allFreeSlots.length; i++) {
    const slot = allFreeSlots[i];
    const chunkNum = i + 1;
    
    // Naming convention: [Focus] Task Name (Part X/Y)
    const summary = totalChunks > 1
      ? `[Focus] ${task.title} (Part ${chunkNum}/${totalChunks})`
      : `[Focus] ${task.title}`;
    
    console.log(`Creating event: ${summary} at ${slot.start.toISOString()}`);
    
    try {
      const eventId = await createCalendarEvent(
        config,
        summary,
        slot.start,
        slot.end
      );
      
      eventIds.push(eventId);
      console.log(`Event created successfully: ${eventId}`);
    } catch (error: any) {
      console.error(`Failed to create event ${i + 1}:`, error);
      // Continue with other events even if one fails
    }
  }
  
  if (eventIds.length === 0) {
    return {
      success: false,
      eventsCreated: 0,
      message: 'Failed to create any calendar events. Please check your connection and try again.'
    };
  }
  
  return {
    success: true,
    eventsCreated: eventIds.length,
    message: `Successfully scheduled ${eventIds.length} event(s) in your calendar.`,
    eventIds
  };
}
