import { Stack } from "expo-router"
import { NotificationDiagnosticsPanel } from "../src/components/NotificationDiagnostics"

export default function DiagnosticsScreen() {
    return (
        <>
            <Stack.Screen
                options={{
                    title: "Notification Diagnostics",
                    headerBackTitle: "Back",
                }}
            />
            <NotificationDiagnosticsPanel />
        </>
    )
}