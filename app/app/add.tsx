import { Alert } from "react-native"
import { router } from "expo-router"
import uuid from "react-native-uuid"
import { addTask, Task } from "../src/services/db"
import { scheduleTaskNotification } from "../src/services/notifications"
import { TaskForm } from "../src/components/TaskForm"
import * as Haptics from "expo-haptics"

export default function AddTask() {
    const handleSave = async (
        title: string,
        date: Date,
        repeatMode: "none" | "daily" | "weekly",
        repeatDays: number[],
        icon: string,
    ) => {
        if (!title.trim()) {
            Alert.alert("Validation", "Please enter a task title")
            return
        }

        try {
            const frequency = repeatMode === "none" ? undefined : repeatMode

            // Calculate start date based on first selected day if weekly
            // (Optional: You could logic this out, but 'date' preserves the TIME which is key)
            const notificationIds = await scheduleTaskNotification(
                title,
                date,
                frequency,
                repeatDays,
            )

            const newTask: Task = {
                id: uuid.v4() as string,
                title: title,
                dueTime: date.toISOString(),
                type: repeatMode === "none" ? "single" : "repeated",
                repeatFrequency: frequency,
                repeatDays: repeatMode === "weekly" ? repeatDays : undefined,
                isCompleted: 0,
                notificationId: notificationIds, // This is now a JSON string "['id1', 'id2']"
                icon,
            }

            await addTask(newTask)
            // 📳
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
        } catch (error) {
            Alert.alert("Error", "Failed to save task")
            console.error(error)
        }
    }

    return <TaskForm submitLabel="Create Task" onSubmit={handleSave} />
}
