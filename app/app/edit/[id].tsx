import { useState, useEffect } from "react"
import { View, ActivityIndicator, Alert } from "react-native"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { getTaskById, updateTask, Task } from "../../src/services/db"
import {
    scheduleTaskNotification,
    cancelNotification,
} from "../../src/services/notifications"
import { TaskForm } from "../../src/components/TaskForm"
import { theme } from "../../src/config/theme"
import * as Haptics from "expo-haptics"

export default function EditTask() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [task, setTask] = useState<Task | null>(null)

    useEffect(() => {
        const loadData = async () => {
            if (!id) return
            const data = await getTaskById(id)
            if (data) setTask(data)
            else router.back()
        }
        loadData()
    }, [id])

    const handleUpdate = async (
        title: string,
        date: Date,
        repeatMode: "none" | "daily" | "weekly",
        repeatDays: number[],
        icon?: string,
    ) => {
        if (!task) return

        try {
            // 1. Cancel OLD
            if (task.notificationId) {
                await cancelNotification(task.notificationId)
            }

            // 2. Schedule NEW
            const frequency = repeatMode === "none" ? undefined : repeatMode
            const newNotificationIds = await scheduleTaskNotification(
                title,
                date,
                frequency,
                repeatDays,
            )

            // 3. Update DB
            const updatedTask: Task = {
                ...task,
                title,
                dueTime: date.toISOString(),
                type: repeatMode === "none" ? "single" : "repeated",
                repeatFrequency: frequency,
                repeatDays: repeatMode === "weekly" ? repeatDays : undefined,
                notificationId: newNotificationIds,
            }

            await updateTask(updatedTask)
            // 📳
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            router.back()
        } catch (error) {
            Alert.alert("Error", "Failed to update task")
        }
    }

    if (!task) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    backgroundColor: theme.colors.background,
                }}
            >
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        )
    }

    return (
        <>
            <Stack.Screen options={{ title: "Edit Task" }} />
            <TaskForm
                submitLabel="Update Task"
                initialTitle={task.title}
                initialDate={new Date(task.dueTime)}
                initialRepeatMode={task.repeatFrequency || "none"}
                initialRepeatDays={task.repeatDays}
                onSubmit={handleUpdate}
            />
        </>
    )
}
