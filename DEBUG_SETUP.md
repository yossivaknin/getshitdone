# Debugging Setup for Cursor/VS Code

## Quick Start

1. **Set breakpoints** in your code by clicking in the gutter (left of line numbers) in:
   - `src/lib/calendar.ts` - line 296, 410, 565
   - `src/lib/smart-schedule.ts` - line 243, 310
   - `src/app/actions.ts` - line 541

2. **Start debugging**:
   - Press `F5` or go to Run and Debug (Cmd+Shift+D / Ctrl+Shift+D)
   - Select "Next.js: debug server-side" from the dropdown
   - Click the green play button or press F5

3. **Trigger the code**:
   - Open your app in the browser (it will auto-open)
   - Schedule a task
   - The debugger will pause at your breakpoints

## Debug Configurations

### Option 1: "Next.js: debug server-side" (Recommended)
- Uses Node.js terminal debugging
- Automatically attaches to the Next.js dev server
- Best for debugging server actions and API routes

### Option 2: "Next.js: debug full stack"
- Launches Next.js with `--inspect` flag
- Good for debugging the entire Next.js process

### Option 3: "Next.js: debug server actions"
- Attach to an already running Next.js process
- Use this if you started the server manually with `npm run dev:debug`

## Key Breakpoints to Set

### In `src/lib/calendar.ts`:
1. **Line 296** - When working hours are parsed and timezone is determined
   - Check: `workingHoursStart`, `workingHoursEnd`, `timeZone`, `startHour`, `startMin`, `endHour`, `endMin`

2. **Line 410** - When initial search state is set up
   - Check: `currentDate`, `endDate`, `startLocal`, `endLocal`, `busySlots.length`

3. **Line 565** - When a valid slot is found
   - Check: `currentDate`, `slotEnd`, `finalStartLocal`, `finalEndLocal`, `isWithinWorkingHours`

4. **Line 600** - In `createCalendarEvent`, before validation
   - Check: `start`, `end`, `config.workingHoursStart`, `config.workingHoursEnd`, `timeZone`

5. **Line 620** - In `createCalendarEvent`, during validation
   - Check: `eventStartHour`, `eventStartMin`, `eventEndHour`, `eventEndMin`, `startHour`, `startMin`, `endHour`, `endMin`

### In `src/lib/smart-schedule.ts`:
1. **Line 243** - When a slot is selected (before validation)
   - Check: `selectedSlot`, `freeSlots`, `config.workingHoursStart`, `config.workingHoursEnd`

2. **Line 310** - During working hours validation (CRITICAL!)
   - Check: `slotStartHour`, `slotStartMin`, `slotEndHour`, `slotEndMin`, `startHour`, `startMin`, `endHour`, `endMin`, `timeZone`

### In `src/app/actions.ts`:
1. **Line 541** - When working hours are determined from parameters
   - Check: `workingHoursStart`, `workingHoursEnd`, `defaultStart`, `defaultEnd`

## Debugging Tips

1. **Use the Debug Console**: When paused, you can evaluate expressions:
   - Type: `timeZone` to see the timezone
   - Type: `selectedSlot.start.toLocaleString()` to see the date in your locale
   - Type: `new Date().getTimezoneOffset()` to see your timezone offset

2. **Watch Variables**: Add variables to the Watch panel to monitor their values

3. **Step Through Code**:
   - `F10` - Step Over (execute current line)
   - `F11` - Step Into (go into function calls)
   - `Shift+F11` - Step Out (exit current function)
   - `F5` - Continue (resume execution)

4. **Call Stack**: Use the Call Stack panel to see how you got to the current breakpoint

## Troubleshooting

### Debugger doesn't attach
- Make sure the Next.js dev server is running
- Check that port 3000 is not already in use
- Try restarting the debugger

### Breakpoints not hit
- Make sure you're setting breakpoints in the actual source files (not compiled output)
- Check that the file path matches (should be `src/lib/calendar.ts`, not `node_modules/...`)
- Try using "Next.js: debug full stack" configuration

### Can't see variables
- Make sure you're paused at a breakpoint
- Check the Variables panel (should show local variables)
- Use the Debug Console to evaluate expressions manually

## Alternative: Use Console Logs

If the debugger is still not working, you can use the enhanced console logs we added. They will show:
- All working hours values
- All available slots with UTC and local time
- Timezone information
- Validation results

Check your terminal/console output when scheduling a task.

