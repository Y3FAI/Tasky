/**
 * Test grouping and sorting logic
 * Run with: node test-grouping.js
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

// Replica of groupTasksByDate from app/index.tsx
function groupTasksByDate(tasks, now) {
    const groups = {};
    tasks.forEach((task) => {
        const date = getNextOccurrence(task, now);
        const dateKey = date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(task);
    });
    return Object.keys(groups).map((key) => ({ title: key, data: groups[key] }));
}

// Helper to format date
function formatDate(d) {
    return d.toISOString().slice(0, 16).replace('T', ' ');
}

// Helper to create a task object
function createTask(overrides) {
    const defaults = {
        id: 'test',
        title: 'Test',
        dueTime: '2025-12-20T10:00:00Z',
        type: 'single',
        isCompleted: 0,
    };
    return { ...defaults, ...overrides };
}

// Main test
function runTest() {
    console.log('=== Testing Grouping and Sorting ===\n');

    // Fixed "now": Saturday, Dec 20, 2025 08:00:00 (8 AM)
    const now = new Date('2025-12-20T08:00:00Z');
    console.log(`Now: ${formatDate(now)} (day ${now.getDay()}, Saturday)\n`);

    // Create a mix of tasks
    const tasks = [
        // Single task on Monday Dec 22
        createTask({
            id: 'single1',
            title: 'Single on Monday',
            type: 'single',
            dueTime: '2025-12-22T14:00:00Z', // Monday 2 PM
        }),
        // Daily task at 10 AM (today hasn't passed)
        createTask({
            id: 'daily1',
            title: 'Daily at 10 AM',
            type: 'repeated',
            repeatFrequency: 'daily',
            dueTime: '2025-12-20T10:00:00Z', // Today 10 AM
        }),
        // Daily task at 7 AM (already passed today)
        createTask({
            id: 'daily2',
            title: 'Daily at 7 AM',
            type: 'repeated',
            repeatFrequency: 'daily',
            dueTime: '2025-12-20T07:00:00Z', // Today 7 AM (passed)
        }),
        // Weekly on Mondays only
        createTask({
            id: 'weekly1',
            title: 'Weekly Monday',
            type: 'repeated',
            repeatFrequency: 'weekly',
            repeatDays: [1], // Monday
            dueTime: '2025-12-15T09:00:00Z', // Some Monday 9 AM
        }),
        // Weekly on Sat (today) at 10 AM (hasn't passed)
        createTask({
            id: 'weekly2',
            title: 'Weekly Saturday 10 AM',
            type: 'repeated',
            repeatFrequency: 'weekly',
            repeatDays: [6],
            dueTime: '2025-12-20T10:00:00Z',
        }),
        // Weekly on Sat (today) at 7 AM (passed)
        createTask({
            id: 'weekly3',
            title: 'Weekly Saturday 7 AM',
            type: 'repeated',
            repeatFrequency: 'weekly',
            repeatDays: [6],
            dueTime: '2025-12-20T07:00:00Z',
        }),
        // Weekly on Mon, Wed, Fri at 6 PM
        createTask({
            id: 'weekly4',
            title: 'Weekly Mon/Wed/Fri 6 PM',
            type: 'repeated',
            repeatFrequency: 'weekly',
            repeatDays: [1, 3, 5],
            dueTime: '2025-12-19T18:00:00Z', // Friday 6 PM
        }),
        // Single task on Tuesday Dec 23
        createTask({
            id: 'single2',
            title: 'Single on Tuesday',
            type: 'single',
            dueTime: '2025-12-23T11:00:00Z', // Tuesday 11 AM
        }),
    ];

    console.log('Tasks before sorting:');
    tasks.forEach(task => {
        const next = getNextOccurrence(task, now);
        console.log(`  ${task.title.padEnd(25)} Due: ${formatDate(new Date(task.dueTime))} -> Next: ${formatDate(next)}`);
    });

    // Sort by next occurrence
    tasks.sort((a, b) => getNextOccurrence(a, now).getTime() - getNextOccurrence(b, now).getTime());

    console.log('\nTasks after sorting by next occurrence:');
    tasks.forEach(task => {
        const next = getNextOccurrence(task, now);
        console.log(`  ${task.title.padEnd(25)} Next: ${formatDate(next)}`);
    });

    // Group by date
    const sections = groupTasksByDate(tasks, now);

    console.log('\nGrouped sections:');
    sections.forEach(section => {
        console.log(`\n  ${section.title}:`);
        section.data.forEach(task => {
            const next = getNextOccurrence(task, now);
            console.log(`    - ${task.title} (next: ${formatDate(next)})`);
        });
    });

    // Verify expectations
    console.log('\n=== Verification ===');
    let allPassed = true;

    // Expect sections in order: Sat Dec 20, Sun Dec 21, Mon Dec 22, Tue Dec 23
    // Sat Dec 20 should contain: Daily at 10 AM, Weekly Saturday 10 AM
    // Sun Dec 21 should contain: Daily at 7 AM (tomorrow)
    // Mon Dec 22 should contain: Single on Monday, Weekly Monday, Weekly Mon/Wed/Fri 6 PM
    // Tue Dec 23 should contain: Single on Tuesday
    // Weekly Saturday 7 AM should be next week (Dec 27) - not grouped with today

    // Helper to find task in sections
    function findTask(taskId) {
        for (const section of sections) {
            for (const task of section.data) {
                if (task.id === taskId) return section.title;
            }
        }
        return null;
    }

    // Check Daily at 10 AM (today)
    const daily1Section = findTask('daily1');
    if (daily1Section && daily1Section.includes('Sat, Dec 20')) {
        console.log('✓ Daily at 10 AM correctly placed under Sat, Dec 20');
    } else {
        console.log(`✗ Daily at 10 AM incorrectly placed under ${daily1Section}`);
        allPassed = false;
    }

    // Check Daily at 7 AM (tomorrow)
    const daily2Section = findTask('daily2');
    if (daily2Section && daily2Section.includes('Sun, Dec 21')) {
        console.log('✓ Daily at 7 AM correctly placed under Sun, Dec 21');
    } else {
        console.log(`✗ Daily at 7 AM incorrectly placed under ${daily2Section}`);
        allPassed = false;
    }

    // Check Weekly Monday
    const weekly1Section = findTask('weekly1');
    if (weekly1Section && weekly1Section.includes('Mon, Dec 22')) {
        console.log('✓ Weekly Monday correctly placed under Mon, Dec 22');
    } else {
        console.log(`✗ Weekly Monday incorrectly placed under ${weekly1Section}`);
        allPassed = false;
    }

    // Check Weekly Saturday 10 AM (today)
    const weekly2Section = findTask('weekly2');
    if (weekly2Section && weekly2Section.includes('Sat, Dec 20')) {
        console.log('✓ Weekly Saturday 10 AM correctly placed under Sat, Dec 20');
    } else {
        console.log(`✗ Weekly Saturday 10 AM incorrectly placed under ${weekly2Section}`);
        allPassed = false;
    }

    // Check Weekly Saturday 7 AM (next week)
    const weekly3Section = findTask('weekly3');
    if (weekly3Section && weekly3Section.includes('Sat, Dec 27')) {
        console.log('✓ Weekly Saturday 7 AM correctly placed under Sat, Dec 27');
    } else {
        console.log(`✗ Weekly Saturday 7 AM incorrectly placed under ${weekly3Section}`);
        allPassed = false;
    }

    // Check Weekly Mon/Wed/Fri 6 PM (next Monday)
    const weekly4Section = findTask('weekly4');
    if (weekly4Section && weekly4Section.includes('Mon, Dec 22')) {
        console.log('✓ Weekly Mon/Wed/Fri 6 PM correctly placed under Mon, Dec 22');
    } else {
        console.log(`✗ Weekly Mon/Wed/Fri 6 PM incorrectly placed under ${weekly4Section}`);
        allPassed = false;
    }

    // Check Single on Monday
    const single1Section = findTask('single1');
    if (single1Section && single1Section.includes('Mon, Dec 22')) {
        console.log('✓ Single on Monday correctly placed under Mon, Dec 22');
    } else {
        console.log(`✗ Single on Monday incorrectly placed under ${single1Section}`);
        allPassed = false;
    }

    // Check Single on Tuesday
    const single2Section = findTask('single2');
    if (single2Section && single2Section.includes('Tue, Dec 23')) {
        console.log('✓ Single on Tuesday correctly placed under Tue, Dec 23');
    } else {
        console.log(`✗ Single on Tuesday incorrectly placed under ${single2Section}`);
        allPassed = false;
    }

    console.log(allPassed ? '\n✅ All tests passed!' : '\n❌ Some tests failed.');
}

// Run test
runTest();