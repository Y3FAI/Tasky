import { useState, useCallback } from "react"
import {
    View,
    Text,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
} from "react-native"
import { Link, useFocusEffect, router } from "expo-router"
import Swipeable from "react-native-gesture-handler/Swipeable"
import * as Haptics from "expo-haptics"
import {
    getTasks,
    Task,
    deleteTask,
    updateTaskStatus,
} from "../src/services/db"
import { cancelNotification } from "../src/services/notifications"
import { theme } from "../src/config/theme"

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Calculate the next occurrence date for a task based on current time and repeat rules.
 * For single tasks, returns the dueTime date.
 * For daily tasks, returns today (or tomorrow if time already passed).
 * For weekly tasks, returns the next matching day (including today if time hasn't passed).
 */
const getNextOccurrence = (task: Task): Date => {
  const dueDate = new Date(task.dueTime)
  const dueHours = dueDate.getHours()
  const dueMinutes = dueDate.getMinutes()
  const dueSeconds = dueDate.getSeconds()

  // Single tasks or no repeat frequency
  if (task.type === "single" || !task.repeatFrequency) {
    return dueDate
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (task.repeatFrequency === "daily") {
    // Create today's date with the task's time
    const candidate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      dueHours,
      dueMinutes,
      dueSeconds,
    )
    // If time already passed today, move to tomorrow
    if (candidate.getTime() < now.getTime()) {
      candidate.setDate(candidate.getDate() + 1)
    }
    return candidate
  }

  // Weekly tasks
  if (task.repeatFrequency === "weekly") {
    // Determine which days to repeat on
    let repeatDays = task.repeatDays
    if (!repeatDays || repeatDays.length === 0) {
      // Fallback for old tasks: use the day of the original due date
      repeatDays = [dueDate.getDay()]
    }

    // Remove duplicates and sort
    repeatDays = [...new Set(repeatDays)]
    repeatDays.sort((a, b) => a - b)

    const todayDay = now.getDay() // 0-6, Sunday=0

    // Check next 7 days starting from today
    for (let d = 0; d <= 7; d++) {
      const day = (todayDay + d) % 7
      if (repeatDays.includes(day)) {
        const candidate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + d,
          dueHours,
          dueMinutes,
          dueSeconds,
        )
        // If this is today and time has already passed, skip to next matching day
        if (d === 0 && candidate.getTime() < now.getTime()) {
          continue
        }
        return candidate
      }
    }

    // Should never reach here if repeatDays is non-empty
    // Fallback to due date
    return dueDate
  }

  // Unknown repeat frequency, return due date
  return dueDate
}

// Helper to Group Tasks by Date (for the list headers)
const groupTasksByDate = (tasks: Task[]) => {
    const groups: { [key: string]: Task[] } = {}
    tasks.forEach((task) => {
        const date = getNextOccurrence(task)
        const dateKey = date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
        })
        if (!groups[dateKey]) groups[dateKey] = []
        groups[dateKey].push(task)
    })
    return Object.keys(groups).map((key) => ({ title: key, data: groups[key] }))
}

export default function Home() {
    const [sections, setSections] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadTasks = async () => {
        setLoading(true)
        const data = await getTasks()
        data.sort(
            (a, b) =>
                getNextOccurrence(a).getTime() - getNextOccurrence(b).getTime(),
        )
        setSections(groupTasksByDate(data))
        setLoading(false)
    }

    useFocusEffect(
        useCallback(() => {
            loadTasks()
        }, []),
    )

    const handleDelete = async (task: Task) => {
        // 📳 HAPTIC: Medium thud for delete
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        if (task.notificationId) await cancelNotification(task.notificationId)
        await deleteTask(task.id)
        loadTasks()
    }

    const handleToggleDone = async (task: Task) => {
        // 📳 HAPTIC: Success "Click" when checking off!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

        const newStatus = !Boolean(task.isCompleted)
        await updateTaskStatus(task.id, newStatus)

        // Optional: Cancel notification if marked done
        if (newStatus && task.notificationId) {
            await cancelNotification(task.notificationId)
        }

        loadTasks()
    }

    const handleEdit = (task: Task) => {
        // 📳 HAPTIC: Light tap when opening edit
        Haptics.selectionAsync()
        router.push(`/edit/${task.id}`)
    }

    const renderRightActions = (progress: any, dragX: any, task: Task) => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDelete(task)}
        >
            <Text style={styles.deleteActionText}>✕</Text>
        </TouchableOpacity>
    )

    // Helper function to create the "Weekly on Mon, Wed" text
    const getRepeatText = (task: Task) => {
        if (task.repeatFrequency === "daily") return "Daily"

        if (task.repeatFrequency === "weekly") {
            // If we have the specific days array, show them all
            if (task.repeatDays && task.repeatDays.length > 0) {
                const dayNames = [...task.repeatDays]
                    .sort((a, b) => a - b)
                    .map((d) => DAYS_SHORT[d])
                    .join(", ")
                return `Weekly on ${dayNames}`
            }
            // Fallback for old tasks
            return `Weekly on ${new Date(task.dueTime).toLocaleDateString([], {
                weekday: "short",
            })}`
        }
        return null
    }

    const renderItem = ({ item }: { item: Task }) => {
        const isDone = Boolean(item.isCompleted)
        const repeatLabel = getRepeatText(item)

        return (
            <Swipeable
                renderRightActions={(p, d) => renderRightActions(p, d, item)}
            >
                <TouchableOpacity
                    style={[styles.card, isDone ? styles.cardCompleted : null]}
                    onPress={() => handleEdit(item)}
                    activeOpacity={0.8}
                >
                    {/* 1. EMOJI ICON */}
                    <View
                        style={[
                            styles.iconContainer,
                            isDone ? { opacity: 0.5 } : null,
                        ]}
                    >
                        <Text style={styles.icon}>{item.icon || "📝"}</Text>
                    </View>

                    {/* 2. TEXT CONTENT */}
                    <View style={styles.textContainer}>
                        <Text
                            style={[
                                styles.taskTitle,
                                isDone ? styles.textCompleted : null,
                            ]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>

                        <View style={styles.metaRow}>
                            <Text
                                style={[
                                    styles.taskTime,
                                    isDone ? styles.textCompleted : null,
                                ]}
                            >
                                {new Date(item.dueTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </Text>

                            {repeatLabel && (
                                <Text style={styles.tag}> • {repeatLabel}</Text>
                            )}
                        </View>
                    </View>

                    {/* 3. CHECKBOX (Right Side) */}
                    <TouchableOpacity
                        onPress={() => handleToggleDone(item)}
                        style={styles.checkboxTouchArea}
                    >
                        <View
                            style={[
                                styles.checkbox,
                                isDone ? styles.checkboxChecked : null,
                            ]}
                        >
                            {isDone && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Swipeable>
        )
    }

    return (
        <View style={styles.container}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.header}>{title.toUpperCase()}</Text>
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={loadTasks}
                        tintColor={theme.colors.primary}
                    />
                }
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Relax. No tasks ahead.</Text>
                }
            />

            <Link href="/add" asChild>
                <TouchableOpacity
                    style={styles.fab}
                    onPressIn={() =>
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    }
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </Link>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },

    header: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.secondary,
        marginTop: theme.spacing.l,
        marginBottom: theme.spacing.s,
        letterSpacing: 1.2,
    },

    // CARD
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius,
        marginBottom: theme.spacing.s,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    cardCompleted: {
        backgroundColor: theme.colors.surface, // Keep same background color
        opacity: 0.8, // Just fade it slightly
    },

    // EMOJI ICON
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background, // Dark circle behind emoji
        justifyContent: "center",
        alignItems: "center",
        marginRight: theme.spacing.m,
    },
    icon: { fontSize: 28 },

    // TEXT
    textContainer: { flex: 1, marginRight: 10 },
    taskTitle: { fontSize: 18, fontWeight: "500", color: theme.colors.text },

    // STRIKETHROUGH STYLE
    textCompleted: {
        textDecorationLine: "line-through",
        color: theme.colors.textDim,
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        flexWrap: "wrap",
    },
    taskTime: { fontSize: 14, color: theme.colors.textDim },
    tag: { fontSize: 13, color: theme.colors.primary, fontWeight: "600" },

    // CHECKBOX
    checkboxTouchArea: { padding: 5 },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxChecked: { backgroundColor: theme.colors.primary },
    checkmark: {
        color: theme.colors.background,
        fontWeight: "bold",
        fontSize: 14,
    },

    // DELETE
    deleteAction: {
        backgroundColor: theme.colors.danger,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: theme.spacing.s,
        borderRadius: theme.borderRadius,
        width: 80,
    },
    deleteActionText: { color: "white", fontWeight: "bold", fontSize: 24 },

    // FAB
    fab: {
        position: "absolute",
        bottom: 30,
        right: 30,
        backgroundColor: theme.colors.primary,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        elevation: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    fabText: {
        color: theme.colors.background,
        fontSize: 32,
        fontWeight: "bold",
        marginTop: -4,
    },

    emptyText: {
        textAlign: "center",
        marginTop: 80,
        color: theme.colors.textDim,
        fontSize: 16,
    },
})
