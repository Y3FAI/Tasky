import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

// 1. Configure Handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
})

// 2. Register for Permissions & Channels (THIS WAS MISSING)
export async function registerForNotifications() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Tasky Alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            lockscreenVisibility:
                Notifications.AndroidNotificationVisibility.PUBLIC,
            bypassDnd: true,
        })
    }

    const { status } = await Notifications.requestPermissionsAsync()
    return status === "granted"
}

// 3. Schedule Notification (Supports Multi-Day)
export async function scheduleTaskNotification(
    title: string,
    dueTime: Date,
    frequency?: "daily" | "weekly",
    repeatDays?: number[], // Array of days (0=Sun, 1=Mon...)
): Promise<string> {
    // Base logic: Ring 10 minutes BEFORE the due time
    const triggerDate = new Date(dueTime.getTime() - 10 * 60000)

    // Store all created IDs here
    const scheduledIds: string[] = []

    try {
        const content = {
            title: "Tasky Reminder",
            body: `"${title}" is due in 10 minutes!`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            // @ts-ignore
            channelId: "default",
        }

        // --- CASE A: WEEKLY MULTI-DAY ---
        if (frequency === "weekly" && repeatDays && repeatDays.length > 0) {
            for (const dayIndex of repeatDays) {
                // Expo uses 1=Sun...7=Sat. JS uses 0=Sun...6=Sat.
                // So we simply add 1.
                const expoDay = dayIndex + 1

                const trigger: Notifications.NotificationTriggerInput = {
                    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                    weekday: expoDay,
                    hour: triggerDate.getHours(),
                    minute: triggerDate.getMinutes(),
                }

                const id = await Notifications.scheduleNotificationAsync({
                    content,
                    trigger,
                })
                scheduledIds.push(id)
            }
        }
        // --- CASE B: DAILY ---
        else if (frequency === "daily") {
            const trigger: Notifications.NotificationTriggerInput = {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: triggerDate.getHours(),
                minute: triggerDate.getMinutes(),
            }
            const id = await Notifications.scheduleNotificationAsync({
                content,
                trigger,
            })
            scheduledIds.push(id)
        }
        // --- CASE C: ONE-OFF (SINGLE) ---
        else {
            // Don't schedule past events for single tasks
            if (triggerDate.getTime() > Date.now()) {
                const trigger: Notifications.NotificationTriggerInput = {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                }
                const id = await Notifications.scheduleNotificationAsync({
                    content,
                    trigger,
                })
                scheduledIds.push(id)
            }
        }

        // Return the array of IDs as a JSON string so we can store it in one DB column
        return JSON.stringify(scheduledIds)
    } catch (error) {
        console.error("Notification scheduling failed:", error)
        return "[]"
    }
}

// 4. Cancel Notification (Handles single ID or JSON Array)
export async function cancelNotification(notificationIdString: string) {
    try {
        // Try to parse it as a JSON list of IDs
        const ids = JSON.parse(notificationIdString)

        if (Array.isArray(ids)) {
            // It's a list (Multi-day or new format)
            for (const id of ids) {
                await Notifications.cancelScheduledNotificationAsync(id)
            }
        } else {
            // It's a single ID (Old format or weird parsing result)
            await Notifications.cancelScheduledNotificationAsync(
                notificationIdString,
            )
        }
    } catch (e) {
        // Parsing failed, so it must be a plain string ID (Old single task)
        await Notifications.cancelScheduledNotificationAsync(
            notificationIdString,
        )
    }
}
