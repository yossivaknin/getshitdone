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
    chunkCount: task.chunkCount,
    chunkDuration: task.chunkDuration,
    dueDate: dueDate.toISOString(),
    now: now.toISOString(),
    busySlotsCount: busySlots.length
  });
  
  // Calculate chunks
  let chunks: number[] = [];
  
  // If manual chunk count is specified, use it
  if (task.chunkCount && task.chunkCount > 1 && task.chunkDuration) {
    // Use specified chunk duration directly - don't adjust to match total duration
    // The total duration is chunkCount * chunkDuration, so we create exactly that many chunks
    const perChunkDuration = task.chunkDuration;
    chunks = Array(task.chunkCount).fill(perChunkDuration);
    console.log(`Task will be manually split into ${chunks.length} chunk(s) of ${perChunkDuration} min each:`, chunks);
    console.log(`Total duration: ${chunks.length * perChunkDuration} minutes`);
  } else if (task.chunkCount && task.chunkCount > 1) {
    // Manual chunking without specified duration - calculate evenly
    const perChunkDuration = Math.ceil(duration / task.chunkCount);
    chunks = Array(task.chunkCount).fill(perChunkDuration);
    // Adjust last chunk if needed to match total duration
    const total = chunks.reduce((a, b) => a + b, 0);
    if (total > duration) {
      chunks[chunks.length - 1] -= (total - duration);
    } else if (total < duration) {
      chunks[chunks.length - 1] += (duration - total);
    }
    console.log(`Task will be manually split into ${chunks.length} chunk(s) of ~${perChunkDuration} min each:`, chunks);
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
  
  // Note: Empty busySlots is OK - it just means the calendar is free
  // The error handling is done in scheduleTask before calling smartSchedule
  if (busySlots.length === 0) {
    console.log(`[SMART-SCHEDULE] ℹ️ No busy slots found - calendar appears to be free`);
    console.log(`[SMART-SCHEDULE] Will still check for conflicts with app-created events`);
  }
  
  // Track scheduled slots so they don't overlap - make a deep copy to avoid reference issues
  const scheduledSlots: TimeSlot[] = busySlots.map(slot => ({
    start: new Date(slot.start),
    end: new Date(slot.end)
  }));
  
  // Sort busy slots by start time for efficient conflict checking
  scheduledSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
  
  console.log(`[SMART-SCHEDULE] ========== SMART SCHEDULING ==========`);
  console.log(`[SMART-SCHEDULE] Task: ${task.title}`);
  console.log(`[SMART-SCHEDULE] Duration: ${duration} minutes`);
  console.log(`[SMART-SCHEDULE] Working hours (from config): ${config.workingHoursStart} - ${config.workingHoursEnd}`);
  console.log(`[SMART-SCHEDULE] ✅ Starting with ${scheduledSlots.length} busy slots from calendar`);
  
  // Log ALL busy slots for verification (not just first 3)
  if (scheduledSlots.length > 0) {
    console.log(`[SMART-SCHEDULE] All busy slots that will be avoided:`);
    scheduledSlots.forEach((slot, idx) => {
      const startStr = new Date(slot.start).toLocaleString();
      const endStr = new Date(slot.end).toLocaleString();
      console.log(`  [${idx + 1}] ${startStr} - ${endStr} (${new Date(slot.start).toISOString()} - ${new Date(slot.end).toISOString()})`);
    });
  } else {
    console.error(`[SMART-SCHEDULE] ❌ NO BUSY SLOTS - CONFLICT DETECTION WILL FAIL!`);
  }
  
  // Track which days already have chunks scheduled for this task
  // Format: "YYYY-MM-DD" -> boolean
  const daysWithChunks = new Set<string>();
  
  // Helper function to get date string (YYYY-MM-DD) from a Date
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  // Helper function to check if a slot is on a day that already has a chunk
  const isSlotOnUsedDay = (slot: TimeSlot): boolean => {
    const slotDate = getDateString(slot.start);
    return daysWithChunks.has(slotDate);
  };
  
  // Calculate available days before due date
  const [startHour, startMin] = config.workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDateDay = new Date(dueDate);
  dueDateDay.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.ceil((dueDateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log(`[SMART-SCHEDULE] Days until due date: ${daysUntilDue}`);
  console.log(`[SMART-SCHEDULE] Number of chunks: ${chunks.length}`);
  console.log(`[SMART-SCHEDULE] Will distribute chunks across different days when possible`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkDuration = chunks[i];
    console.log(`[SMART-SCHEDULE] ===== Finding slot for chunk ${i + 1}/${chunks.length} (${chunkDuration} minutes) =====`);
    console.log(`[SMART-SCHEDULE] Current search time: ${currentTime.toISOString()}`);
    console.log(`[SMART-SCHEDULE] Already scheduled ${scheduledSlots.length - busySlots.length} chunk(s) in this task`);
    console.log(`[SMART-SCHEDULE] Days with chunks so far: ${Array.from(daysWithChunks).join(', ') || 'none'}`);
    console.log(`[SMART-SCHEDULE] Total busy slots: ${scheduledSlots.length}`);
    
    // Log all busy slots for debugging
    if (scheduledSlots.length > 0) {
      console.log(`[SMART-SCHEDULE] Busy slots:`, scheduledSlots.map(s => 
        `${new Date(s.start).toISOString()} - ${new Date(s.end).toISOString()}`
      ));
    }
    
    // Find free slots, excluding already scheduled chunks
    let freeSlots = findFreeSlots(
      scheduledSlots, // Use scheduledSlots which includes previously scheduled chunks
      currentTime,
      dueDate,
      config.workingHoursStart,
      config.workingHoursEnd,
      chunkDuration
    );
    
    console.log(`[SMART-SCHEDULE] Found ${freeSlots.length} free slot(s) for chunk ${i + 1}`);
    
    // If we have multiple chunks and there's time before due date, prefer slots on new days
    if (chunks.length > 1 && daysUntilDue >= chunks.length) {
      // Filter to prefer slots on days that don't have chunks yet
      const slotsOnNewDays = freeSlots.filter(slot => !isSlotOnUsedDay(slot));
      
      if (slotsOnNewDays.length > 0) {
        console.log(`[SMART-SCHEDULE] Preferring slots on new days. Found ${slotsOnNewDays.length} slot(s) on unused days`);
        freeSlots = slotsOnNewDays;
      } else {
        console.log(`[SMART-SCHEDULE] No slots available on new days, will use any available slot`);
      }
    }
    
    if (freeSlots.length === 0) {
      console.error(`[SMART-SCHEDULE] No free slots found for chunk ${i + 1}`);
      return {
        success: false,
        eventsCreated: 0,
        message: `Not enough time available before due date (${dueDate.toLocaleDateString()}) for chunk ${i + 1}/${chunks.length}. Please adjust date or duration.`
      };
    }
    
    // Use the first available slot
    const selectedSlot = freeSlots[0];
    
    // CRITICAL: Double-check that the selected slot doesn't conflict with ANY busy slot
    // This is a safety check to ensure findFreeSlots didn't miss anything
    const slotStart = selectedSlot.start.getTime();
    const slotEnd = selectedSlot.end.getTime();
    
    const conflictsWithBusy = scheduledSlots.some(busy => {
      const busyStart = busy.start.getTime();
      const busyEnd = busy.end.getTime();
      return (slotStart < busyEnd && slotEnd > busyStart);
    });
    
    if (conflictsWithBusy) {
      console.error(`[SMART-SCHEDULE] ❌ CRITICAL ERROR: Selected slot conflicts with existing busy slot!`);
      console.error(`[SMART-SCHEDULE] Selected slot: ${selectedSlot.start.toISOString()} - ${selectedSlot.end.toISOString()}`);
      const conflictingSlot = scheduledSlots.find(busy => {
        const busyStart = busy.start.getTime();
        const busyEnd = busy.end.getTime();
        return (slotStart < busyEnd && slotEnd > busyStart);
      });
      if (conflictingSlot) {
        console.error(`[SMART-SCHEDULE] Conflicting busy slot: ${conflictingSlot.start.toISOString()} - ${conflictingSlot.end.toISOString()}`);
      }
      return {
        success: false,
        eventsCreated: 0,
        message: `Selected time slot conflicts with an existing meeting. Please try again or adjust your task duration/due date.`
      };
    }
    
    allFreeSlots.push(selectedSlot);
    
    // Validate selected slot is within working hours
    // CRITICAL FIX: Use timezone-aware time checking, not getHours() which returns UTC!
    const [startHour, startMin] = config.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
    
    // Get user's timezone for validation
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    
    // Get local time components in user's timezone (NOT UTC!)
    const getLocalTime = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      return {
        hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
        minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
      };
    };
    
    const slotStartLocal = getLocalTime(selectedSlot.start);
    const slotEndLocal = getLocalTime(selectedSlot.end);
    const slotStartHour = slotStartLocal.hour;
    const slotStartMin = slotStartLocal.minute;
    const slotEndHour = slotEndLocal.hour;
    const slotEndMin = slotEndLocal.minute;
    
    console.log(`[SMART-SCHEDULE] ✅ Selected slot: ${selectedSlot.start.toISOString()} to ${selectedSlot.end.toISOString()}`);
    console.log(`[SMART-SCHEDULE] Slot time (${timeZone}): ${slotStartHour}:${slotStartMin.toString().padStart(2, '0')} - ${slotEndHour}:${slotEndMin.toString().padStart(2, '0')}`);
    console.log(`[SMART-SCHEDULE] Working hours: ${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}`);
    console.log(`[SMART-SCHEDULE] ✅ Verified: No conflicts with ${scheduledSlots.length} busy slots`);
    
    // DEBUGGER: Pause here to inspect validation - NOW USING TIMEZONE-AWARE TIME!
    debugger; // Check: slotStartHour, slotStartMin, slotEndHour, slotEndMin, startHour, startMin, endHour, endMin, timeZone
    
    // Validate slot is within working hours (using timezone-aware times)
    if (slotStartHour < startHour || (slotStartHour === startHour && slotStartMin < startMin)) {
      const error = `Selected slot starts before working hours: ${slotStartHour}:${slotStartMin.toString().padStart(2, '0')} (${timeZone}) (working hours: ${startHour}:${startMin.toString().padStart(2, '0')})`;
      console.error(`[SMART-SCHEDULE] ERROR: ${error}`);
      debugger; // DEBUGGER: Pause here if validation fails
      throw new Error(error);
    }
    
    if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
      const error = `Selected slot ends after working hours: ${slotEndHour}:${slotEndMin.toString().padStart(2, '0')} (${timeZone}) (working hours: ${endHour}:${endMin.toString().padStart(2, '0')})`;
      console.error(`[SMART-SCHEDULE] ERROR: ${error}`);
      debugger; // DEBUGGER: Pause here if validation fails
      throw new Error(error);
    }
    
    // Mark this day as having a chunk
    const selectedDay = getDateString(selectedSlot.start);
    daysWithChunks.add(selectedDay);
    console.log(`[SMART-SCHEDULE] Marked day ${selectedDay} as having a chunk`);
    
    // Add this slot to scheduledSlots so next chunk won't use it (deep copy)
    scheduledSlots.push({
      start: new Date(selectedSlot.start),
      end: new Date(selectedSlot.end)
    });
    // Sort scheduled slots for efficient conflict checking
    scheduledSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    console.log(`[SMART-SCHEDULE] Added slot to busy list. Total busy slots now: ${scheduledSlots.length}`);
    
    // For next chunk, if we have multiple chunks and there's time, move to next day
    if (chunks.length > 1 && i < chunks.length - 1 && daysUntilDue >= chunks.length) {
      // Move to next day at working hours start to avoid scheduling on same day
      currentTime = new Date(selectedSlot.start);
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(startHour, startMin, 0, 0);
      console.log(`[SMART-SCHEDULE] Moving to next day for next chunk: ${currentTime.toISOString()}`);
    } else {
      // Next chunk starts after this one ends (with a small buffer)
      // Use a minimum gap of 15 minutes between chunks
      const minGap = 15 * 60 * 1000; // 15 minutes minimum gap
      currentTime = new Date(selectedSlot.end.getTime() + minGap);
      
      // If we've moved past working hours, move to next day's start
      if (currentTime.getHours() >= endHour || 
          (currentTime.getHours() === endHour && currentTime.getMinutes() >= endMin)) {
        // Move to next day at working hours start
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(startHour, startMin, 0, 0);
        console.log(`[SMART-SCHEDULE] Moved to next day: ${currentTime.toISOString()}`);
      }
    }
  }
  
  // Create calendar events
  const eventIds: string[] = [];
  const totalChunks = chunks.length;
  // Track newly created events to add to busy slots for subsequent chunks
  const newlyCreatedSlots: TimeSlot[] = [];
  
  for (let i = 0; i < allFreeSlots.length; i++) {
    const slot = allFreeSlots[i];
    const chunkNum = i + 1;
    
    // Naming convention: [Focus] Task Name (Part X/Y)
    const summary = totalChunks > 1
      ? `[Focus] ${task.title} (Part ${chunkNum}/${totalChunks})`
      : `[Focus] ${task.title}`;
    
    console.log(`[SMART-SCHEDULE] Creating event ${i + 1}/${allFreeSlots.length}: ${summary} at ${slot.start.toISOString()}`);
    
    try {
      const eventId = await createCalendarEvent(
        config,
        summary,
        slot.start,
        slot.end
      );
      
      eventIds.push(eventId);
      
      // Immediately add this event to newly created slots so subsequent chunks in this task don't overlap
      newlyCreatedSlots.push({
        start: new Date(slot.start),
        end: new Date(slot.end)
      });
      
      // Also add to scheduledSlots for any remaining chunks
      scheduledSlots.push({
        start: new Date(slot.start),
        end: new Date(slot.end)
      });
      scheduledSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      console.log(`[SMART-SCHEDULE] Event created successfully: ${eventId}`);
      console.log(`[SMART-SCHEDULE] Added to busy slots. Total busy slots now: ${scheduledSlots.length}`);
    } catch (error: any) {
      console.error(`[SMART-SCHEDULE] Failed to create event ${i + 1}:`, error);
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
