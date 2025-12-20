/**
 * Test notification scheduling logic
 * This simulates the logic without Expo dependencies
 */

// Simulated scheduleTaskNotification logic
function simulateScheduleTaskNotification(title, dueTime, frequency, repeatDays) {
    console.log(`\n=== Testing: ${title} ===`);
    console.log(`Due time: ${dueTime.toISOString()}`);
    console.log(`Frequency: ${frequency || 'single'}`);
    console.log(`Repeat days: ${repeatDays ? JSON.stringify(repeatDays) : 'none'}`);

    // Base logic: Ring 10 minutes BEFORE the due time
    const triggerDate = new Date(dueTime.getTime() - 10 * 60000);
    console.log(`Trigger (10 min before): ${triggerDate.toISOString()}`);

    const scheduledIds = [];
    const now = new Date();
    console.log(`Now: ${now.toISOString()}`);

    if (frequency === "weekly" && repeatDays && repeatDays.length > 0) {
        console.log(`Weekly multi-day scheduling:`);

        // Remove duplicates and sort
        const uniqueDays = [...new Set(repeatDays)].sort((a, b) => a - b);
        console.log(`Unique days: ${JSON.stringify(uniqueDays)}`);

        for (const dayIndex of uniqueDays) {
            // Expo uses 1=Sun...7=Sat. JS uses 0=Sun...6=Sat.
            const expoDay = dayIndex + 1;
            console.log(`  Day ${dayIndex} (Expo: ${expoDay}):`);
            console.log(`    Time: ${triggerDate.getHours()}:${triggerDate.getMinutes().toString().padStart(2, '0')}`);

            // Check if this would schedule in the past
            // Need to calculate next occurrence of this day
            const todayDay = now.getDay(); // 0-6
            let daysToAdd = (dayIndex - todayDay + 7) % 7;
            if (daysToAdd === 0) {
                // Same day, check if time has passed
                const candidate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    triggerDate.getHours(),
                    triggerDate.getMinutes(),
                    triggerDate.getSeconds()
                );
                if (candidate.getTime() < now.getTime()) {
                    daysToAdd = 7; // Move to next week
                }
            }

            const nextDate = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + daysToAdd,
                triggerDate.getHours(),
                triggerDate.getMinutes(),
                triggerDate.getSeconds()
            );
            console.log(`    Next occurrence: ${nextDate.toISOString()}`);
            scheduledIds.push(`weekly-${dayIndex}`);
        }
    }
    else if (frequency === "daily") {
        console.log(`Daily scheduling:`);
        console.log(`  Time: ${triggerDate.getHours()}:${triggerDate.getMinutes().toString().padStart(2, '0')}`);

        // Create today's date with the task's time
        const candidate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            triggerDate.getHours(),
            triggerDate.getMinutes(),
            triggerDate.getSeconds()
        );

        // If time already passed today, move to tomorrow
        if (candidate.getTime() < now.getTime()) {
            candidate.setDate(candidate.getDate() + 1);
        }

        console.log(`  Next occurrence: ${candidate.toISOString()}`);
        scheduledIds.push('daily');
    }
    else {
        console.log(`Single scheduling:`);
        // Don't schedule past events
        if (triggerDate.getTime() > now.getTime()) {
            console.log(`  Will schedule for: ${triggerDate.toISOString()}`);
            scheduledIds.push('single');
        } else {
            console.log(`  WON'T schedule (past time)`);
        }
    }

    console.log(`Scheduled IDs: ${JSON.stringify(scheduledIds)}`);
    return scheduledIds;
}

// Run tests
console.log('=== Notification Scheduling Logic Test ===\n');

// Test 1: Single task in future
const futureDate = new Date();
futureDate.setHours(futureDate.getHours() + 2); // 2 hours from now
simulateScheduleTaskNotification(
    "Single future task",
    futureDate,
    undefined,
    undefined
);

// Test 2: Single task in past (should not schedule)
const pastDate = new Date();
pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago
simulateScheduleTaskNotification(
    "Single past task",
    pastDate,
    undefined,
    undefined
);

// Test 3: Daily task
const dailyTime = new Date();
dailyTime.setHours(14, 30, 0, 0); // 2:30 PM today
simulateScheduleTaskNotification(
    "Daily task",
    dailyTime,
    "daily",
    undefined
);

// Test 4: Daily task with passed time
const dailyPassed = new Date();
dailyPassed.setHours(dailyPassed.getHours() - 1); // 1 hour ago
simulateScheduleTaskNotification(
    "Daily passed task",
    dailyPassed,
    "daily",
    undefined
);

// Test 5: Weekly single day
const weeklyTime = new Date();
weeklyTime.setHours(9, 0, 0, 0); // 9 AM
weeklyTime.setDate(weeklyTime.getDate() + 2); // 2 days from now
simulateScheduleTaskNotification(
    "Weekly Monday only",
    weeklyTime,
    "weekly",
    [1] // Monday
);

// Test 6: Weekly multi-day
const weeklyMultiTime = new Date();
weeklyMultiTime.setHours(18, 0, 0, 0); // 6 PM
simulateScheduleTaskNotification(
    "Weekly Mon/Wed/Fri",
    weeklyMultiTime,
    "weekly",
    [1, 3, 5] // Mon, Wed, Fri
);

// Test 7: Weekly with duplicate days
simulateScheduleTaskNotification(
    "Weekly with duplicates",
    weeklyMultiTime,
    "weekly",
    [1, 3, 1, 5, 3] // Mon, Wed, Fri (duplicates)
);

// Test 8: Weekly empty days (should fallback to due date day)
const thursdayTime = new Date();
thursdayTime.setHours(15, 0, 0, 0); // 3 PM
thursdayTime.setDate(thursdayTime.getDate() + 4); // Make it Thursday
simulateScheduleTaskNotification(
    "Weekly empty days",
    thursdayTime,
    "weekly",
    [] // Empty
);

console.log('\n=== Testing Edge Cases ===\n');

// Test timezone handling
const utcTime = new Date('2025-12-20T14:30:00Z');
console.log(`UTC time: ${utcTime.toISOString()}`);
console.log(`Local time: ${utcTime.toString()}`);
console.log(`Local hours: ${utcTime.getHours()}, minutes: ${utcTime.getMinutes()}`);

// Test notification trigger calculation
const dueTime = new Date('2025-12-20T14:30:00Z');
const triggerDate = new Date(dueTime.getTime() - 10 * 60000);
console.log(`\nDue: ${dueTime.toISOString()}`);
console.log(`Trigger (10 min before): ${triggerDate.toISOString()}`);
console.log(`Trigger time: ${triggerDate.getHours()}:${triggerDate.getMinutes().toString().padStart(2, '0')}`);

console.log('\n=== Test Complete ===');