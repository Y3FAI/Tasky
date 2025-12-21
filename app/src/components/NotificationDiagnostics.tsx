import React, { useState, useEffect } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TextInput,
} from "react-native"
import {
    checkNotificationStatus,
    NotificationDiagnostics,
    sendTestNotification,
    debugScheduledNotifications,
} from "../services/notifications"
import { exportTasks, importTasks } from "../services/db"
import { theme } from "../config/theme"
import * as Haptics from "expo-haptics"
import * as Clipboard from "expo-clipboard"

interface NotificationDiagnosticsProps {
    onClose?: () => void
}

export const NotificationDiagnosticsPanel: React.FC<NotificationDiagnosticsProps> = ({
    onClose,
}) => {
    const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(
        null,
    )
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [exportData, setExportData] = useState<string>("")
    const [importText, setImportText] = useState<string>("")
    const [importing, setImporting] = useState(false)
    const [exporting, setExporting] = useState(false)

    const loadDiagnostics = async () => {
        setRefreshing(true)
        try {
            const result = await checkNotificationStatus()
            setDiagnostics(result)
        } catch (error) {
            console.error("Failed to load diagnostics:", error)
            Alert.alert("Error", "Failed to check notification status")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        loadDiagnostics()
    }, [])

    const handleRunTest = async () => {
        Haptics.selectionAsync()
        await sendTestNotification()
        // Refresh diagnostics after test
        setTimeout(loadDiagnostics, 1000)
    }

    const handleDebug = async () => {
        Haptics.selectionAsync()
        await debugScheduledNotifications()
        Alert.alert(
            "Debug Complete",
            "Check console for scheduled notification details",
        )
    }

    const handleFix = async (fix: NotificationDiagnostics["suggestedFixes"][0]) => {
        Haptics.selectionAsync()
        if (fix.action) {
            await fix.action()
            // Refresh after action
            setTimeout(loadDiagnostics, 1000)
        }
    }

    const handleExport = async () => {
        Haptics.selectionAsync()
        setExporting(true)
        try {
            const data = await exportTasks()
            setExportData(data)

            // Copy to clipboard
            await Clipboard.setStringAsync(data)

            Alert.alert(
                "Export Successful",
                `Exported ${JSON.parse(data).count} tasks. The JSON has been copied to clipboard.\n\nYou can paste it anywhere for backup.`,
                [{ text: "OK" }]
            )
        } catch (error) {
            console.error("Export failed:", error)
            Alert.alert("Export Failed", "Failed to export tasks. Check console for details.")
        } finally {
            setExporting(false)
        }
    }

    const handleImport = async () => {
        Haptics.selectionAsync()
        if (!importText.trim()) {
            Alert.alert("Import Error", "Please paste JSON data first")
            return
        }

        setImporting(true)
        try {
            const result = await importTasks(importText)

            if (result.success) {
                Alert.alert(
                    "Import Successful",
                    `Imported ${result.imported} tasks successfully.${
                        result.errors.length > 0 ?
                        `\n\nNote: ${result.errors.length} error(s):\n${result.errors.slice(0, 3).join('\n')}` :
                        ''
                    }`,
                    [{ text: "OK", onPress: () => {
                        // Clear import text after successful import
                        setImportText("")
                        // Refresh tasks in parent component if needed
                    }}]
                )
            } else {
                Alert.alert(
                    "Import Failed",
                    `Failed to import tasks:\n${result.errors.join('\n')}`
                )
            }
        } catch (error) {
            console.error("Import failed:", error)
            Alert.alert("Import Failed", "Failed to import tasks. Check console for details.")
        } finally {
            setImporting(false)
        }
    }

    const handlePasteFromClipboard = async () => {
        Haptics.selectionAsync()
        try {
            const text = await Clipboard.getStringAsync()
            if (text) {
                setImportText(text)
                Alert.alert("Pasted", "JSON data pasted from clipboard")
            } else {
                Alert.alert("Clipboard Empty", "No text found in clipboard")
            }
        } catch (error) {
            console.error("Failed to read clipboard:", error)
            Alert.alert("Clipboard Error", "Failed to read from clipboard")
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Checking notification status...</Text>
            </View>
        )
    }

    if (!diagnostics) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load diagnostics</Text>
                <TouchableOpacity style={styles.button} onPress={loadDiagnostics}>
                    <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const hasIssues = diagnostics.issues.length > 0

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🔔 Notification Diagnostics</Text>
                <Text style={styles.subtitle}>
                    {hasIssues
                        ? `${diagnostics.issues.length} issue(s) found`
                        : "All systems operational"}
                </Text>
            </View>

            {/* Status Overview */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Overview</Text>
                <View style={styles.statusGrid}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Platform</Text>
                        <Text style={styles.statusValue}>
                            {diagnostics.platform.toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Permission</Text>
                        <View
                            style={[
                                styles.badge,
                                diagnostics.hasPermission
                                    ? styles.badgeSuccess
                                    : styles.badgeError,
                            ]}
                        >
                            <Text style={styles.badgeText}>
                                {diagnostics.hasPermission ? "Granted" : "Denied"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>Scheduled</Text>
                        <Text style={styles.statusValue}>
                            {diagnostics.scheduledCount}
                        </Text>
                    </View>
                    {diagnostics.batteryOptimizationEnabled !== undefined && (
                        <View style={styles.statusItem}>
                            <Text style={styles.statusLabel}>Battery Opt.</Text>
                            <View
                                style={[
                                    styles.badge,
                                    !diagnostics.batteryOptimizationEnabled
                                        ? styles.badgeSuccess
                                        : styles.badgeWarning,
                                ]}
                            >
                                <Text style={styles.badgeText}>
                                    {diagnostics.batteryOptimizationEnabled
                                        ? "Enabled"
                                        : "Disabled"}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Issues */}
            {hasIssues && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Issues Found</Text>
                    {diagnostics.issues.map((issue, index) => (
                        <View key={index} style={styles.issueItem}>
                            <Text style={styles.issueIcon}>⚠️</Text>
                            <Text style={styles.issueText}>{issue}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Suggested Fixes */}
            {diagnostics.suggestedFixes.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suggested Fixes</Text>
                    {diagnostics.suggestedFixes.map((fix, index) => (
                        <View key={index} style={styles.fixCard}>
                            <View style={styles.fixHeader}>
                                <Text style={styles.fixTitle}>{fix.title}</Text>
                            </View>
                            <Text style={styles.fixDescription}>
                                {fix.description}
                            </Text>
                            {fix.action && fix.actionLabel && (
                                <TouchableOpacity
                                    style={styles.fixButton}
                                    onPress={() => handleFix(fix)}
                                >
                                    <Text style={styles.fixButtonText}>
                                        {fix.actionLabel}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Data Backup */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Backup</Text>

                <View style={styles.backupCard}>
                    <Text style={styles.backupTitle}>Export Tasks</Text>
                    <Text style={styles.backupDescription}>
                        Export all tasks as JSON for backup. The data will be copied to clipboard.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backupButton, exporting && styles.disabledButton]}
                        onPress={handleExport}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                            <Text style={styles.backupButtonText}>
                                Export Tasks to Clipboard
                            </Text>
                        )}
                    </TouchableOpacity>
                    {exportData ? (
                        <Text style={styles.exportInfo}>
                            ✓ {JSON.parse(exportData).count} tasks exported
                        </Text>
                    ) : null}
                </View>

                <View style={styles.backupCard}>
                    <Text style={styles.backupTitle}>Import Tasks</Text>
                    <Text style={styles.backupDescription}>
                        Paste JSON data to import tasks. Existing tasks with same IDs will be updated.
                    </Text>

                    <TextInput
                        style={styles.textInput}
                        value={importText}
                        onChangeText={setImportText}
                        placeholder="Paste JSON data here..."
                        placeholderTextColor={theme.colors.textDim}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.backupButton, styles.secondaryButton]}
                            onPress={handlePasteFromClipboard}
                        >
                            <Text style={styles.secondaryButtonText}>Paste from Clipboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.backupButton, importing && styles.disabledButton]}
                            onPress={handleImport}
                            disabled={importing}
                        >
                            {importing ? (
                                <ActivityIndicator size="small" color={theme.colors.background} />
                            ) : (
                                <Text style={styles.backupButtonText}>Import Tasks</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.importNote}>
                        Note: Task IDs must be preserved for proper updates. Notifications will need to be recreated.
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tools</Text>
                <TouchableOpacity style={styles.actionButton} onPress={handleRunTest}>
                    <Text style={styles.actionButtonText}>Send Test Notification</Text>
                    <Text style={styles.actionButtonSubtext}>
                        Schedule a test notification in 1 minute
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleDebug}>
                    <Text style={styles.actionButtonText}>Debug Console</Text>
                    <Text style={styles.actionButtonSubtext}>
                        Log all scheduled notifications to console
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.refreshButton]}
                    onPress={loadDiagnostics}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Text style={styles.refreshButtonText}>Refresh Status</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {hasIssues
                        ? "Fix the issues above to ensure reliable notifications"
                        : "Your notification system is properly configured!"}
                </Text>
            </View>

            {/* Close button if provided */}
            {onClose && (
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.l,
        paddingBottom: 40,
    },
    header: {
        marginBottom: theme.spacing.l,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textDim,
    },
    loadingText: {
        marginTop: theme.spacing.m,
        color: theme.colors.textDim,
        textAlign: "center",
    },
    errorText: {
        color: theme.colors.danger,
        textAlign: "center",
        marginBottom: theme.spacing.m,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surface,
        paddingBottom: 8,
    },
    statusGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.m,
    },
    statusItem: {
        flex: 1,
        minWidth: 100,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        alignItems: "center",
    },
    statusLabel: {
        fontSize: 12,
        color: theme.colors.textDim,
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: theme.colors.primary + "20", // 20 = 12% opacity
    },
    badgeError: {
        backgroundColor: theme.colors.danger + "20",
    },
    badgeWarning: {
        backgroundColor: "#f59e0b20", // Amber
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    issueItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        marginBottom: theme.spacing.s,
    },
    issueIcon: {
        marginRight: theme.spacing.s,
    },
    issueText: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 14,
    },
    fixCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        marginBottom: theme.spacing.m,
    },
    fixHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    fixTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
    },
    fixDescription: {
        fontSize: 14,
        color: theme.colors.textDim,
        marginBottom: theme.spacing.m,
        lineHeight: 20,
    },
    fixButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 10,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    fixButtonText: {
        color: theme.colors.background,
        fontWeight: "bold",
        fontSize: 14,
    },
    actionButton: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        marginBottom: theme.spacing.s,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 4,
    },
    actionButtonSubtext: {
        fontSize: 14,
        color: theme.colors.textDim,
    },
    refreshButton: {
        alignItems: "center",
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: theme.colors.surface,
    },
    refreshButtonText: {
        color: theme.colors.primary,
        fontWeight: "bold",
    },
    footer: {
        marginTop: theme.spacing.l,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius,
    },
    footerText: {
        textAlign: "center",
        color: theme.colors.textDim,
        fontSize: 14,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        alignItems: "center",
    },
    buttonText: {
        color: theme.colors.background,
        fontWeight: "bold",
        fontSize: 16,
    },
    closeButton: {
        marginTop: theme.spacing.l,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius,
        alignItems: "center",
    },
    closeButtonText: {
        color: theme.colors.text,
        fontWeight: "bold",
    },
    // Data Backup styles
    backupCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius,
        marginBottom: theme.spacing.l,
    },
    backupTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 8,
    },
    backupDescription: {
        fontSize: 14,
        color: theme.colors.textDim,
        marginBottom: theme.spacing.m,
        lineHeight: 20,
    },
    backupButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: theme.spacing.s,
    },
    backupButtonText: {
        color: theme.colors.background,
        fontWeight: "bold",
        fontSize: 14,
    },
    secondaryButton: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    secondaryButtonText: {
        color: theme.colors.primary,
        fontWeight: "bold",
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.6,
    },
    exportInfo: {
        fontSize: 14,
        color: theme.colors.primary,
        textAlign: "center",
        marginTop: 4,
    },
    textInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.surface,
        borderRadius: 8,
        padding: theme.spacing.m,
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
        minHeight: 120,
    },
    buttonRow: {
        flexDirection: "row",
        gap: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    importNote: {
        fontSize: 12,
        color: theme.colors.textDim,
        fontStyle: "italic",
        textAlign: "center",
        marginTop: theme.spacing.s,
    },
})