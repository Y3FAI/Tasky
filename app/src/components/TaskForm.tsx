import React, { useState } from "react"
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ScrollView,
} from "react-native"
import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker"
import * as Haptics from "expo-haptics"
import { EmojiPicker } from "./EmojiPicker"
import { theme } from "../config/theme"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface TaskFormProps {
    initialTitle?: string
    initialDate?: Date
    initialRepeatMode?: "none" | "daily" | "weekly"
    initialRepeatDays?: number[]
    initialIcon?: string
    submitLabel: string
    onSubmit: (
        title: string,
        date: Date,
        repeatMode: "none" | "daily" | "weekly",
        repeatDays: number[],
        icon: string,
    ) => void
}

export const TaskForm: React.FC<TaskFormProps> = ({
    initialTitle = "",
    initialDate = new Date(),
    initialRepeatMode = "none",
    initialRepeatDays = [],
    initialIcon = "📝",
    submitLabel,
    onSubmit,
}) => {
    const [title, setTitle] = useState(initialTitle)
    const [date, setDate] = useState(initialDate)
    const [repeatMode, setRepeatMode] = useState(initialRepeatMode)
    const [icon, setIcon] = useState(initialIcon)

    // Default to today if no days provided
    const [selectedDays, setSelectedDays] = useState<number[]>(
        initialRepeatDays.length > 0
            ? initialRepeatDays
            : [new Date().getDay()],
    )

    const toggleDay = (dayIndex: number) => {
        // 📳 HAPTIC: Tap when clicking a day
        Haptics.selectionAsync()

        if (selectedDays.includes(dayIndex)) {
            if (selectedDays.length > 1) {
                setSelectedDays(selectedDays.filter((d) => d !== dayIndex))
            }
        } else {
            setSelectedDays([...selectedDays, dayIndex])
        }
    }

    const changeRepeatMode = (mode: "none" | "daily" | "weekly") => {
        // 📳 HAPTIC: Tap when changing mode
        Haptics.selectionAsync()
        setRepeatMode(mode)
    }

    const showAndroidPicker = (mode: "date" | "time") => {
        DateTimePickerAndroid.open({
            value: date,
            onChange: (event, selectedDate) => {
                if (selectedDate) setDate(selectedDate)
            },
            mode: mode,
            is24Hour: false,
        })
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 50 }}
        >
            {/* 1. Emoji Picker */}
            <EmojiPicker selected={icon} onSelect={setIcon} />

            {/* 2. Title Input */}
            <Text style={styles.label}>TASK TITLE</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Gym Workout"
                placeholderTextColor={theme.colors.textDim}
                value={title}
                onChangeText={setTitle}
                autoFocus={!initialTitle}
            />

            {/* 3. Repeat Mode Segment */}
            <Text style={styles.label}>REPEAT</Text>
            <View style={styles.repeatContainer}>
                {["none", "daily", "weekly"].map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[
                            styles.repeatOption,
                            repeatMode === mode && styles.repeatOptionSelected,
                        ]}
                        onPress={() => changeRepeatMode(mode as any)}
                    >
                        <Text
                            style={[
                                styles.repeatText,
                                repeatMode === mode &&
                                    styles.repeatTextSelected,
                            ]}
                        >
                            {mode.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 4. Weekly Day Bubbles (Only if Weekly) */}
            {repeatMode === "weekly" && (
                <>
                    <Text style={styles.label}>SELECT DAYS</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map((day, index) => {
                            const isSelected = selectedDays.includes(index)
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayCircle,
                                        isSelected && styles.dayCircleSelected,
                                    ]}
                                    onPress={() => toggleDay(index)}
                                >
                                    <Text
                                        style={[
                                            styles.dayText,
                                            isSelected &&
                                                styles.dayTextSelected,
                                        ]}
                                    >
                                        {day.charAt(0)}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </>
            )}

            {/* 5. Date Picker (Hidden if Weekly) */}
            {repeatMode !== "weekly" && (
                <>
                    <Text style={styles.label}>DATE</Text>
                    {Platform.OS === "android" ? (
                        <TouchableOpacity
                            style={styles.pickerButton}
                            onPress={() => showAndroidPicker("date")}
                        >
                            <Text style={styles.pickerText}>
                                📅 {date.toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="spinner"
                            onChange={(e, d) => d && setDate(d)}
                            style={{ height: 120 }}
                            textColor={theme.colors.text}
                        />
                    )}
                </>
            )}

            {/* 6. Time Picker (Always Visible) */}
            <Text style={styles.label}>TIME</Text>
            {Platform.OS === "android" ? (
                <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => showAndroidPicker("time")}
                >
                    <Text style={styles.pickerText}>
                        ⏰{" "}
                        {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </Text>
                </TouchableOpacity>
            ) : (
                <DateTimePicker
                    value={date}
                    mode="time"
                    display="spinner"
                    onChange={(e, d) => d && setDate(d)}
                    style={{ height: 120 }}
                    textColor={theme.colors.text}
                />
            )}

            {/* 7. Save Button */}
            <TouchableOpacity
                style={styles.saveButton}
                onPress={() =>
                    onSubmit(title, date, repeatMode, selectedDays, icon)
                }
            >
                <Text style={styles.saveButtonText}>{submitLabel}</Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.l,
        backgroundColor: theme.colors.background,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.secondary,
        marginBottom: theme.spacing.s,
        marginTop: theme.spacing.l,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius,
        fontSize: 18,
        color: theme.colors.text,
    },

    // Pickers
    pickerButton: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius,
        alignItems: "center",
        marginBottom: theme.spacing.m,
    },
    pickerText: { fontSize: 16, color: theme.colors.text },

    // Repeat Segment
    repeatContainer: {
        flexDirection: "row",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius,
        padding: 4,
    },
    repeatOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 12,
    },
    repeatOptionSelected: { backgroundColor: theme.colors.primary },
    repeatText: {
        color: theme.colors.textDim,
        fontWeight: "600",
        fontSize: 12,
    },
    repeatTextSelected: { color: theme.colors.background, fontWeight: "bold" },

    // Day Bubbles
    daysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: theme.spacing.s,
    },
    dayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.surface,
    },
    dayCircleSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    dayText: { color: theme.colors.textDim, fontWeight: "600" },
    dayTextSelected: { color: theme.colors.background, fontWeight: "bold" },

    // Save Button
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius,
        alignItems: "center",
        marginTop: 40,
        elevation: 6,
        marginBottom: 50,
    },
    saveButtonText: {
        color: theme.colors.background,
        fontSize: 18,
        fontWeight: "bold",
    },
})
