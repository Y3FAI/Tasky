import React from "react"
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from "react-native"
import { theme } from "../config/theme"

const EMOJIS = ["📝", "💼", "🏠", "🛒", "🏋️", "💊", "🎓", "✈️", "🎉", "💰"]

interface EmojiPickerProps {
    selected: string
    onSelect: (emoji: string) => void
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
    selected,
    onSelect,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
            >
                {EMOJIS.map((emoji) => (
                    <TouchableOpacity
                        key={emoji}
                        style={[
                            styles.circle,
                            selected === emoji && styles.selected,
                        ]}
                        onPress={() => onSelect(emoji)}
                    >
                        <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { marginTop: theme.spacing.m },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.secondary,
        marginBottom: theme.spacing.s,
        letterSpacing: 1,
    },
    scroll: { flexDirection: "row", gap: 10, paddingBottom: 10 },
    circle: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: theme.colors.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    selected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    emoji: { fontSize: 24 },
})
