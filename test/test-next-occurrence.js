/**
 * Test script for getNextOccurrence logic
 * Run with: node test-next-occurrence.js
 */

// Replica of getNextOccurrence from app/index.tsx with optional now parameter
function getNextOccurrence(task, now = new Date()) {
    const dueDate = new Date(task.dueTime);
    const dueHours = dueDate.getHours();
    const dueMinutes = dueDate.getMinutes();
    const dueSeconds = dueDate.getSeconds();

    // Single tasks or no repeat frequency
    if (task.type === "single" || !task.repeatFrequency) {
        return dueDate;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (task.repeatFrequency === "daily") {
        // Create today's date with the task's time
        const candidate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            dueHours,
            dueMinutes,
            dueSeconds,
        );
        // If time already passed today, move to tomorrow
        if (candidate.getTime() < now.getTime()) {
            candidate.setDate(candidate.getDate() + 1);
        }
        return candidate;
    }

    // Weekly tasks
    if (task.repeatFrequency === "weekly") {
        // Determine which days to repeat on
        let repeatDays = task.repeatDays;
        if (!repeatDays || repeatDays.length === 0) {
            // Fallback for old tasks: use the day of the original due date
            repeatDays = [dueDate.getDay()];
        }

        // Remove duplicates and sort
        repeatDays = [...new Set(repeatDays)];
        repeatDays.sort((a, b) => a - b);

        const todayDay = now.getDay(); // 0-6, Sunday=0

        // Check next 7 days starting from today
        for (let d = 0; d <= 7; d++) {
            const day = (todayDay + d) % 7;
            if (repeatDays.includes(day)) {
                const candidate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() + d,
                    dueHours,
                    dueMinutes,
                    dueSeconds,
                );
                // If this is today and time has already passed, skip to next matching day
                if (d === 0 && candidate.getTime() < now.getTime()) {
                    continue;
                }
                return candidate;
            }
        }

        // Should never reach here if repeatDays is non-empty
        // Fallback to due date
        return dueDate;
    }

    // Unknown repeat frequency, return due date
    return dueDate;
}

// Helper to format date for readable output
function formatDate(d) {
    return d.toISOString().slice(0, 16).replace('T', ' ');
}

// Helper to create a task object
function createTask(overrides) {
    const defaults = {
        id: 'test',
        title: 'Test',
        dueTime: '2025-12-20T10:00:00Z', // Will be adjusted per test
        type: 'single',
        isCompleted: 0,
    };
    return { ...defaults, ...overrides };
}

// Test cases
function runTests() {
    console.log('=== Testing getNextOccurrence ===\n');

    // Set a fixed "now" for reproducible tests: Saturday, Dec 20, 2025 08:00:00 (8 AM)
    const now = new Date('2025-12-20T08:00:00Z'); // Saturday, 8 AM UTC
    console.log(`Test reference time (now): ${formatDate(now)} (day ${now.getDay()})\n`);

    // Test 1: Single task (no repeat)
    console.log('1. Single task:');
    const singleTask = createTask({
        type: 'single',
        dueTime: '2025-12-22T14:00:00Z', // Monday 2 PM
    });
    const next1 = getNextOccurrence(singleTask, now);
    console.log(`   Due: ${formatDate(new Date(singleTask.dueTime))}, Next: ${formatDate(next1)}`);
    console.log(`   Expected: Same as due time (Monday 2 PM)\n`);

    // Test 2: Daily task, time hasn't passed today (8 AM now, task at 10 AM)
    console.log('2. Daily task, time hasn\'t passed today:');
    const dailyTaskEarly = createTask({
        type: 'repeated',
        repeatFrequency: 'daily',
        dueTime: '2025-12-20T10:00:00Z', // Today 10 AM
    });
    const next2 = getNextOccurrence(dailyTaskEarly, now);
    console.log(`   Due: ${formatDate(new Date(dailyTaskEarly.dueTime))}, Next: ${formatDate(next2)}`);
    console.log(`   Expected: Today 10 AM\n`);

    // Test 3: Daily task, time already passed today (8 AM now, task at 7 AM)
    console.log('3. Daily task, time already passed today:');
    const dailyTaskLate = createTask({
        type: 'repeated',
        repeatFrequency: 'daily',
        dueTime: '2025-12-20T07:00:00Z', // Today 7 AM (passed)
    });
    const next3 = getNextOccurrence(dailyTaskLate, now);
    console.log(`   Due: ${formatDate(new Date(dailyTaskLate.dueTime))}, Next: ${formatDate(next3)}`);
    console.log(`   Expected: Tomorrow (Dec 21) 7 AM\n`);

    // Test 4: Weekly task single day (Monday), today is Saturday
    console.log('4. Weekly task on Monday only, today Saturday:');
    const weeklyMonday = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [1], // Monday
        dueTime: '2025-12-15T09:00:00Z', // Some Monday 9 AM
    });
    const next4 = getNextOccurrence(weeklyMonday, now);
    console.log(`   Due: ${formatDate(new Date(weeklyMonday.dueTime))}, Next: ${formatDate(next4)}`);
    console.log(`   Expected: Next Monday (Dec 22) 9 AM\n`);

    // Test 5: Weekly task single day (Saturday), time hasn't passed (8 AM now, task at 10 AM)
    console.log('5. Weekly task on Saturday, time hasn\'t passed:');
    const weeklySatEarly = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [6], // Saturday
        dueTime: '2025-12-20T10:00:00Z', // Today 10 AM
    });
    const next5 = getNextOccurrence(weeklySatEarly, now);
    console.log(`   Due: ${formatDate(new Date(weeklySatEarly.dueTime))}, Next: ${formatDate(next5)}`);
    console.log(`   Expected: Today 10 AM\n`);

    // Test 6: Weekly task single day (Saturday), time already passed (8 AM now, task at 7 AM)
    console.log('6. Weekly task on Saturday, time already passed:');
    const weeklySatLate = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [6], // Saturday
        dueTime: '2025-12-20T07:00:00Z', // Today 7 AM (passed)
    });
    const next6 = getNextOccurrence(weeklySatLate, now);
    console.log(`   Due: ${formatDate(new Date(weeklySatLate.dueTime))}, Next: ${formatDate(next6)}`);
    console.log(`   Expected: Next Saturday (Dec 27) 7 AM\n`);

    // Test 7: Weekly task multiple days (Mon, Wed, Fri), today Saturday
    console.log('7. Weekly task on Mon, Wed, Fri, today Saturday:');
    const weeklyMulti = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [1, 3, 5], // Mon, Wed, Fri
        dueTime: '2025-12-19T18:00:00Z', // Some Friday 6 PM
    });
    const next7 = getNextOccurrence(weeklyMulti, now);
    console.log(`   Due: ${formatDate(new Date(weeklyMulti.dueTime))}, Next: ${formatDate(next7)}`);
    console.log(`   Expected: Next Monday (Dec 22) 6 PM\n`);

    // Test 8: Weekly task multiple days (Mon, Wed, Fri), today Wednesday but time passed
    console.log('8. Weekly task on Mon, Wed, Fri, today Wednesday 8 AM, task at 7 AM (passed):');
    const nowWed = new Date('2025-12-17T08:00:00Z'); // Wednesday 8 AM
    const weeklyWedLate = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [1, 3, 5],
        dueTime: '2025-12-17T07:00:00Z', // Wednesday 7 AM (passed)
    });
    const next8 = getNextOccurrence(weeklyWedLate, nowWed);
    console.log(`   Due: ${formatDate(new Date(weeklyWedLate.dueTime))}, Next: ${formatDate(next8)}`);
    console.log(`   Expected: Next Friday (Dec 19) 7 AM\n`);

    // Test 9: Weekly task empty repeatDays (fallback to due date day)
    console.log('9. Weekly task with empty repeatDays (old task):');
    const weeklyEmpty = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [],
        dueTime: '2025-12-18T15:00:00Z', // Thursday 3 PM
    });
    const next9 = getNextOccurrence(weeklyEmpty, now);
    console.log(`   Due: ${formatDate(new Date(weeklyEmpty.dueTime))}, Next: ${formatDate(next9)}`);
    console.log(`   Expected: Next Thursday (Dec 25) 3 PM (since today is Saturday)\n`);

    // Test 10: Duplicate days in repeatDays
    console.log('10. Weekly task with duplicate days [1, 3, 1, 5]:');
    const weeklyDup = createTask({
        type: 'repeated',
        repeatFrequency: 'weekly',
        repeatDays: [1, 3, 1, 5], // Mon, Wed, Fri (duplicate Mon)
        dueTime: '2025-12-19T12:00:00Z', // Some Friday noon
    });
    const next10 = getNextOccurrence(weeklyDup, now);
    console.log(`   Due: ${formatDate(new Date(weeklyDup.dueTime))}, Next: ${formatDate(next10)}`);
    console.log(`   Expected: Next Monday (Dec 22) 12 PM (duplicates removed)\n`);

    // Test 11: Daily task with type "repeated" but no repeatFrequency (edge case)
    console.log('11. Task with type "repeated" but no repeatFrequency:');
    const repeatedNoFreq = createTask({
        type: 'repeated',
        repeatFrequency: undefined,
        dueTime: '2025-12-25T00:00:00Z',
    });
    const next11 = getNextOccurrence(repeatedNoFreq, now);
    console.log(`   Due: ${formatDate(new Date(repeatedNoFreq.dueTime))}, Next: ${formatDate(next11)}`);
    console.log(`   Expected: Same as due time (treated as single)\n`);

    console.log('=== All tests completed ===');
}

// Run tests
runTests();