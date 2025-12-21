import * as SQLite from "expo-sqlite"

// 1. Define the Shape of a Task
export interface Task {
    id: string
    title: string
    dueTime: string // ISO Date String
    type: "single" | "repeated"
    repeatFrequency?: "daily" | "weekly"
    repeatDays?: number[] // Array of day indexes (0=Sun, 1=Mon, etc.)
    isCompleted: number // 0 for false, 1 for true
    notificationId?: string // Stores JSON string of IDs e.g. "['id1', 'id2']"
    icon?: string // E.g. "🏋️" or "📝"
}

// 2. Open Database
const dbPromise = SQLite.openDatabaseAsync("tasky.db")

const getDBConnection = async () => {
    return dbPromise
}

// 3. Initialize & Migrate Tables
export const initDB = async () => {
    const db = await getDBConnection()

    // Create Base Table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      dueTime TEXT NOT NULL,
      type TEXT NOT NULL,
      repeatFrequency TEXT,
      repeatDays TEXT,
      isCompleted INTEGER DEFAULT 0,
      notificationId TEXT,
      icon TEXT
    );
  `)

    // SAFETY MIGRATIONS:
    // If you ran the app before, these columns might be missing.
    // We try to add them. If they exist, it might throw an error, so we ignore it.

    try {
        await db.execAsync("ALTER TABLE tasks ADD COLUMN repeatDays TEXT;")
    } catch (e) {
        /* ignore */
    }
    try {
        await db.execAsync("ALTER TABLE tasks ADD COLUMN icon TEXT;")
    } catch (e) {
        /* ignore */
    }
    try {
        await db.execAsync("ALTER TABLE tasks ADD COLUMN notificationId TEXT;")
    } catch (e) {
        /* ignore */
    }
}

// 4. Get All Tasks
export const getTasks = async (): Promise<Task[]> => {
    const db = await getDBConnection()
    const result = await db.getAllAsync<any>("SELECT * FROM tasks")

    return result.map((task) => ({
        ...task,
        // Parse JSON strings back into Arrays/Objects
        repeatDays: task.repeatDays ? JSON.parse(task.repeatDays) : [],
        // Ensure icon has a default if missing
        icon: task.icon || "📝",
    }))
}

// 5. Get Single Task (For Edit Mode)
export const getTaskById = async (id: string): Promise<Task | null> => {
    const db = await getDBConnection()
    const results = await db.getAllAsync<any>(
        "SELECT * FROM tasks WHERE id = ?",
        [id],
    )

    if (results.length > 0) {
        const task = results[0]
        return {
            ...task,
            repeatDays: task.repeatDays ? JSON.parse(task.repeatDays) : [],
            icon: task.icon || "📝",
        }
    }
    return null
}

// 6. Add New Task
export const addTask = async (task: Task) => {
    const db = await getDBConnection()
    await db.runAsync(
        `INSERT INTO tasks (
      id, title, dueTime, type, repeatFrequency, 
      repeatDays, isCompleted, notificationId, icon
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            task.id,
            task.title,
            task.dueTime,
            task.type,
            task.repeatFrequency || null,
            JSON.stringify(task.repeatDays || []), // Store array as JSON string
            task.isCompleted,
            task.notificationId || null,
            task.icon || "📝",
        ],
    )
}

// 7. Update Existing Task
export const updateTask = async (task: Task) => {
    const db = await getDBConnection()
    await db.runAsync(
        `UPDATE tasks SET 
      title = ?, 
      dueTime = ?, 
      type = ?, 
      repeatFrequency = ?, 
      repeatDays = ?, 
      notificationId = ?, 
      icon = ? 
     WHERE id = ?`,
        [
            task.title,
            task.dueTime,
            task.type,
            task.repeatFrequency || null,
            JSON.stringify(task.repeatDays || []), // Store array as JSON string
            task.notificationId || null,
            task.icon || "📝",
            task.id,
        ],
    )
}

// 8. Delete Task
export const deleteTask = async (id: string) => {
    const db = await getDBConnection()
    await db.runAsync("DELETE FROM tasks WHERE id = ?", [id])
}

// 9. Toggle Status (Done/Not Done)
export const updateTaskStatus = async (id: string, isCompleted: boolean) => {
    const db = await getDBConnection()
    await db.runAsync("UPDATE tasks SET isCompleted = ? WHERE id = ?", [
        isCompleted ? 1 : 0,
        id,
    ])
}

// 10. Export all tasks as JSON
export const exportTasks = async (): Promise<string> => {
    const tasks = await getTasks()
    const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        count: tasks.length,
        tasks: tasks.map(task => ({
            ...task,
            // Ensure repeatDays is always an array
            repeatDays: task.repeatDays || [],
            // Ensure icon has a default
            icon: task.icon || "📝",
        }))
    }
    return JSON.stringify(exportData, null, 2)
}

// 11. Import tasks from JSON
export const importTasks = async (jsonData: string): Promise<{success: boolean, imported: number, errors: string[]}> => {
    const errors: string[] = []
    let imported = 0

    try {
        const data = JSON.parse(jsonData)

        // Validate basic structure
        if (!data.tasks || !Array.isArray(data.tasks)) {
            throw new Error("Invalid import format: missing tasks array")
        }

        const db = await getDBConnection()

        // Start a transaction for batch import
        await db.execAsync("BEGIN TRANSACTION")

        try {
            for (const task of data.tasks) {
                // Validate required fields
                if (!task.id || !task.title || !task.dueTime || !task.type) {
                    errors.push(`Skipping task: missing required fields (id: ${task.id || 'missing'})`)
                    continue
                }

                // Check if task already exists
                const existing = await db.getAllAsync<any>(
                    "SELECT id FROM tasks WHERE id = ?",
                    [task.id]
                )

                if (existing.length > 0) {
                    // Update existing task
                    await db.runAsync(
                        `UPDATE tasks SET
                         title = ?,
                         dueTime = ?,
                         type = ?,
                         repeatFrequency = ?,
                         repeatDays = ?,
                         isCompleted = ?,
                         notificationId = ?,
                         icon = ?
                         WHERE id = ?`,
                        [
                            task.title,
                            task.dueTime,
                            task.type,
                            task.repeatFrequency || null,
                            JSON.stringify(task.repeatDays || []),
                            task.isCompleted || 0,
                            task.notificationId || null,
                            task.icon || "📝",
                            task.id
                        ]
                    )
                } else {
                    // Insert new task
                    await db.runAsync(
                        `INSERT INTO tasks (
                         id, title, dueTime, type, repeatFrequency,
                         repeatDays, isCompleted, notificationId, icon
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            task.id,
                            task.title,
                            task.dueTime,
                            task.type,
                            task.repeatFrequency || null,
                            JSON.stringify(task.repeatDays || []),
                            task.isCompleted || 0,
                            task.notificationId || null,
                            task.icon || "📝"
                        ]
                    )
                }
                imported++
            }

            await db.execAsync("COMMIT")
            return { success: true, imported, errors }

        } catch (error) {
            await db.execAsync("ROLLBACK")
            throw error
        }

    } catch (error) {
        errors.push(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
        return { success: false, imported: 0, errors }
    }
}

// 12. Clear all tasks (optional, for testing)
export const clearAllTasks = async (): Promise<void> => {
    const db = await getDBConnection()
    await db.execAsync("DELETE FROM tasks")
}
