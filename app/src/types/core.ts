export interface ITask {
    id: string
    title: string
    dueTime: string // Stored as ISO string
    type: "single" | "repeated"
    repeatFrequency?: "daily"
    isCompleted: number // SQLite uses 0/1 for booleans
    notificationId?: string
}
