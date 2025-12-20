import * as Notifications from "expo-notifications"
import { Platform, Linking, Alert } from "react-native"
import * as Application from "expo-application"

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
export async function registerForNotifications(): Promise<boolean> {
    // Always ensure Android channel is configured
    if (Platform.OS === "android") {
        try {
            await Notifications.setNotificationChannelAsync("default", {
                name: "Tasky Alerts",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
                lockscreenVisibility:
                    Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: true,
            })
        } catch (error) {
            console.error("Failed to configure notification channel:", error)
        }
    }

    // Check current permissions first
    const existingPermission = await Notifications.getPermissionsAsync()

    // If already granted or denied, return status
    if (existingPermission.status === "granted") {
        return true
    }

    if (existingPermission.status === "denied") {
        // Can't request again, user must enable in settings
        return false
    }

    // Permission not determined yet, request it
    try {
        const { status } = await Notifications.requestPermissionsAsync()
        return status === "granted"
    } catch (error) {
        console.error("Failed to request notification permissions:", error)
        return false
    }
}

// 3. Schedule Notification (Supports Multi-Day)
export async function scheduleTaskNotification(
    title: string,
    dueTime: Date,
    frequency?: "daily" | "weekly",
    repeatDays?: number[], // Array of days (0=Sun, 1=Mon...)
): Promise<string> {
    console.log(`[Notification] Scheduling: "${title}"`)
    console.log(`  Due time: ${dueTime.toISOString()}`)
    console.log(`  Frequency: ${frequency || "single"}`)
    console.log(`  Repeat days: ${repeatDays ? JSON.stringify(repeatDays) : "none"}`)

    // Base logic: Ring 10 minutes BEFORE the due time
    const triggerDate = new Date(dueTime.getTime() - 10 * 60000)
    console.log(`  Trigger (10 min before): ${triggerDate.toISOString()}`)
    console.log(`  Trigger time: ${triggerDate.getHours()}:${triggerDate.getMinutes().toString().padStart(2, "0")}`)

    // Store all created IDs here
    const scheduledIds: string[] = []

    try {
        // Ensure we have permission before scheduling
        const hasPermission = await registerForNotifications()
        if (!hasPermission) {
            console.error("[Notification] No permission to schedule notifications")
            // Return empty array - task will still be saved but no notification
            return "[]"
        }

        const content: Notifications.NotificationContentInput = {
            title: "Tasky Reminder",
            body: `"${title}" is due in 10 minutes!`,
            sound: true,
        }

        // Add Android-specific configuration
        if (Platform.OS === "android") {
            (content as any).android = {
                channelId: "default",
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 250, 250, 250],
            }
        }

        // --- CASE A: WEEKLY MULTI-DAY ---
        if (frequency === "weekly") {
            // Determine which days to repeat on
            let daysToRepeat = repeatDays
            if (!daysToRepeat || daysToRepeat.length === 0) {
                // Fallback for old tasks: use the day of the original due date
                daysToRepeat = [dueTime.getDay()]
                console.log(`  No repeat days provided, using due time day: ${daysToRepeat[0]}`)
            }

            // Filter out invalid day numbers (0-6)
            daysToRepeat = daysToRepeat.filter(day => day >= 0 && day <= 6)

            if (daysToRepeat.length === 0) {
                // If all days filtered out, use due time day
                daysToRepeat = [dueTime.getDay()]
                console.log(`  All days invalid, using due time day: ${daysToRepeat[0]}`)
            }

            // Remove duplicates and sort
            daysToRepeat = [...new Set(daysToRepeat)]
            daysToRepeat.sort((a, b) => a - b)

            console.log(`  Scheduling weekly on days: ${daysToRepeat.join(", ")}`)

            for (const dayIndex of daysToRepeat) {
                // Expo uses 1=Sun...7=Sat. JS uses 0=Sun...6=Sat.
                // So we simply add 1.
                const expoDay = dayIndex + 1

                const trigger: Notifications.NotificationTriggerInput = {
                    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                    weekday: expoDay,
                    hour: triggerDate.getHours(),
                    minute: triggerDate.getMinutes(),
                }

                console.log(`    Day ${dayIndex} (Expo: ${expoDay}) at ${trigger.hour}:${trigger.minute.toString().padStart(2, "0")}`)

                try {
                    const id = await Notifications.scheduleNotificationAsync({
                        content,
                        trigger,
                    })
                    console.log(`    Scheduled with ID: ${id}`)
                    scheduledIds.push(id)
                } catch (error) {
                    console.error(`    Failed to schedule day ${dayIndex}:`, error)
                    // Continue with other days
                }
            }
        }
        // --- CASE B: DAILY ---
        else if (frequency === "daily") {
            console.log(`  Scheduling daily at ${triggerDate.getHours()}:${triggerDate.getMinutes().toString().padStart(2, "0")}`)

            const trigger: Notifications.NotificationTriggerInput = {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: triggerDate.getHours(),
                minute: triggerDate.getMinutes(),
            }

            try {
                const id = await Notifications.scheduleNotificationAsync({
                    content,
                    trigger,
                })
                console.log(`  Scheduled with ID: ${id}`)
                scheduledIds.push(id)
            } catch (error) {
                console.error("  Failed to schedule daily:", error)
            }
        }
        // --- CASE C: ONE-OFF (SINGLE) ---
        else {
            console.log("  Scheduling single notification")
            // Don't schedule past events for single tasks
            if (triggerDate.getTime() > Date.now()) {
                const trigger: Notifications.NotificationTriggerInput = {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: triggerDate,
                }

                try {
                    const id = await Notifications.scheduleNotificationAsync({
                        content,
                        trigger,
                    })
                    console.log(`  Scheduled with ID: ${id}`)
                    scheduledIds.push(id)
                } catch (error) {
                    console.error("  Failed to schedule single:", error)
                }
            } else {
                console.log("  Skipping past notification")
            }
        }

        console.log(`[Notification] Scheduled ${scheduledIds.length} notification(s)`)
        // Return the array of IDs as a JSON string so we can store it in one DB column
        return JSON.stringify(scheduledIds)
    } catch (error) {
        console.error("[Notification] Scheduling failed:", error)
        return "[]"
    }
}

// 4. Cancel Notification (Handles single ID or JSON Array)
export async function cancelNotification(notificationIdString: string) {
    console.log(`[Notification] Cancelling: ${notificationIdString.substring(0, 50)}...`)

    try {
        // Try to parse it as a JSON list of IDs
        const ids = JSON.parse(notificationIdString)

        if (Array.isArray(ids)) {
            console.log(`  Parsed as array of ${ids.length} IDs`)
            // It's a list (Multi-day or new format)
            for (const id of ids) {
                try {
                    await Notifications.cancelScheduledNotificationAsync(id)
                    console.log(`  Cancelled ID: ${id}`)
                } catch (error) {
                    console.error(`  Failed to cancel ID ${id}:`, error)
                }
            }
        } else {
            console.log(`  Parsed as single ID: ${ids}`)
            // It's a single ID (Old format or weird parsing result)
            await Notifications.cancelScheduledNotificationAsync(
                notificationIdString,
            )
        }
    } catch (e) {
        console.log(`  Parsing failed, treating as plain string ID`)
        // Parsing failed, so it must be a plain string ID (Old single task)
        try {
            await Notifications.cancelScheduledNotificationAsync(
                notificationIdString,
            )
            console.log(`  Cancelled ID: ${notificationIdString}`)
        } catch (error) {
            console.error(`  Failed to cancel ID ${notificationIdString}:`, error)
        }
    }
}

// 5. Diagnostic Functions
export interface NotificationDiagnostics {
    hasPermission: boolean
    permissionStatus: Notifications.NotificationPermissionsStatus
    scheduledCount: number
    channelConfigured: boolean
    platform: string
    batteryOptimizationEnabled?: boolean
    issues: string[]
    suggestedFixes: Array<{
        title: string
        description: string
        action?: () => void
        actionLabel?: string
    }>
}

/**
 * Comprehensive notification diagnostic check
 */
export async function checkNotificationStatus(): Promise<NotificationDiagnostics> {
    const issues: string[] = []
    const suggestedFixes: NotificationDiagnostics["suggestedFixes"] = []

    // Check permissions
    const permissionStatus = await Notifications.getPermissionsAsync()
    const hasPermission = permissionStatus.status === "granted"

    if (!hasPermission) {
        issues.push("Notification permissions not granted")
        suggestedFixes.push({
            title: "Enable notifications",
            description: "Tasky needs notification permissions to remind you of tasks",
            action: async () => {
                const { status } = await Notifications.requestPermissionsAsync()
                if (status === "granted") {
                    Alert.alert("Success", "Notification permissions enabled!")
                } else {
                    Alert.alert(
                        "Permissions Required",
                        "Please enable notifications in your device settings",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Open Settings",
                                onPress: () => Linking.openSettings()
                            }
                        ]
                    )
                }
            },
            actionLabel: "Enable"
        })
    }

    // Check scheduled notifications
    let scheduledCount = 0
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync()
        scheduledCount = scheduled.length
    } catch (error) {
        issues.push("Failed to check scheduled notifications")
        console.error("Error checking scheduled notifications:", error)
    }

    // Android-specific checks
    let channelConfigured = true
    let batteryOptimizationEnabled: boolean | undefined = undefined

    if (Platform.OS === "android") {
        // Check notification channel
        try {
            const channels = await Notifications.getNotificationChannelsAsync()
            channelConfigured = channels.some(ch => ch.id === "default")
            if (!channelConfigured) {
                issues.push("Notification channel not configured")
                suggestedFixes.push({
                    title: "Configure notification channel",
                    description: "Android requires a notification channel for alerts",
                    action: async () => {
                        await registerForNotifications()
                        Alert.alert("Success", "Notification channel configured!")
                    },
                    actionLabel: "Configure"
                })
            }
        } catch (error) {
            console.error("Error checking notification channels:", error)
        }

        // Check battery optimization (Android 6.0+)
        try {
            // Note: expo-application may not have battery optimization APIs in this version
            // We'll still provide a suggested fix for Android users
            if (Platform.OS === "android") {
                issues.push("Battery optimization may block notifications")
                suggestedFixes.push({
                    title: "Disable battery optimization",
                    description: "Battery optimization can prevent Tasky from showing notifications on time",
                    action: () => {
                        Alert.alert(
                            "Battery Optimization",
                            "To ensure reliable notifications:\n\n1. Open Device Settings\n2. Go to Battery > Battery Optimization\n3. Find 'Tasky' and select 'Don't optimize'",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Open Battery Settings",
                                    onPress: () => {
                                        Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS")
                                    }
                                }
                            ]
                        )
                    },
                    actionLabel: "Fix"
                })
            }
        } catch (error) {
            console.error("Error checking battery optimization:", error)
        }

        // Check for exact alarm permission (Android 12+)
        if (Platform.Version && Number(Platform.Version) >= 31) {
            try {
                // Note: expo-notifications doesn't expose exact alarm permission check
                // We'll rely on the app.json permission declaration
            } catch (error) {
                console.error("Error checking exact alarm permission:", error)
            }
        }
    }

    // iOS-specific checks
    if (Platform.OS === "ios") {
        // Check notification settings
        const settings = await Notifications.getPermissionsAsync()
        if (settings.ios?.status === Notifications.IosAuthorizationStatus.DENIED) {
            issues.push("Notifications disabled in iOS Settings")
            suggestedFixes.push({
                title: "Enable in iOS Settings",
                description: "Notifications are disabled. Enable them in Settings > Notifications > Tasky",
                action: () => Linking.openSettings(),
                actionLabel: "Open Settings"
            })
        }
    }

    return {
        hasPermission,
        permissionStatus,
        scheduledCount,
        channelConfigured,
        platform: Platform.OS,
        batteryOptimizationEnabled,
        issues,
        suggestedFixes
    }
}

/**
 * Test notification - schedules a test notification 1 minute from now
 */
export async function sendTestNotification(): Promise<boolean> {
    try {
        const hasPermission = await registerForNotifications()
        if (!hasPermission) {
            Alert.alert(
                "Permission Required",
                "Please enable notifications to test",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Enable",
                        onPress: async () => {
                            const { status } = await Notifications.requestPermissionsAsync()
                            if (status === "granted") {
                                await sendTestNotification()
                            }
                        }
                    }
                ]
            )
            return false
        }

        const triggerDate = new Date(Date.now() + 60 * 1000) // 1 minute from now

        const content: Notifications.NotificationContentInput = {
            title: "Tasky Test",
            body: "This is a test notification from Tasky",
            sound: true,
        }

        if (Platform.OS === "android") {
            (content as any).android = {
                channelId: "default",
                priority: Notifications.AndroidNotificationPriority.MAX,
            }
        }

        await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            },
        })

        Alert.alert(
            "Test Scheduled",
            "A test notification will appear in 1 minute. If you don't see it, check:\n\n1. Notification permissions\n2. Battery optimization (Android)\n3. Do Not Disturb settings",
            [{ text: "OK" }]
        )
        return true
    } catch (error) {
        console.error("Test notification failed:", error)
        Alert.alert("Test Failed", "Failed to schedule test notification. Check console for details.")
        return false
    }
}

/**
 * Debug: Log all scheduled notifications
 */
export async function debugScheduledNotifications() {
    try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync()
        console.log("=== SCHEDULED NOTIFICATIONS ===")
        console.log(`Count: ${scheduled.length}`)
        scheduled.forEach((notif, index) => {
            console.log(`\n[${index}] ${notif.content.title}`)
            console.log(`  Body: ${notif.content.body}`)
            console.log(`  Trigger: ${JSON.stringify(notif.trigger)}`)
            console.log(`  Identifier: ${notif.identifier}`)
        })
        console.log("=============================")
        return scheduled
    } catch (error) {
        console.error("Error debugging notifications:", error)
        return []
    }
}
