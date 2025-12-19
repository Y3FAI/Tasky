// app/_layout.tsx
import { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { initDB } from "../src/services/db"
import { registerForNotifications } from "../src/services/notifications"
import { theme } from "../src/config/theme"

export default function Layout() {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        const setup = async () => {
            try {
                await initDB()
                await registerForNotifications()
            } catch (e) {
                console.error(e)
            } finally {
                setIsReady(true)
            }
        }
        setup()
    }, [])

    if (!isReady) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.colors.background,
                }}
            >
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        )
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {/* Light content = White text on status bar */}
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: theme.colors.background }, // Dark Header
                    headerTintColor: theme.colors.text, // White Header Text
                    headerTitleStyle: { fontWeight: "bold" },
                    contentStyle: { backgroundColor: theme.colors.background }, // Dark Background
                    headerShadowVisible: false, // No ugly line under header
                }}
            >
                <Stack.Screen name="index" options={{ title: "My Tasks" }} />
                <Stack.Screen
                    name="add"
                    options={{ title: "New Task", presentation: "modal" }}
                />
            </Stack>
        </GestureHandlerRootView>
    )
}
