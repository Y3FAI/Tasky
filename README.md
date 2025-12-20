# Tasky

Minimalist task manager.

### Stack

React Native, Expo, TypeScript, SQLite

### Key Features

-   **Granular Scheduling:** Support for specific weekday recurrence (e.g., Mon/Wed/Fri) with timezone-aware local triggers.
-   **Notification Diagnostics:** Built-in troubleshooting module for detecting Android battery optimization and iOS permission states.
-   **Recurrence Engine:** Custom `getNextOccurrence` algorithm for accurate temporal sorting and edge-case handling.
-   **Hybrid Storage:** SQLite architecture utilizing JSON serialization for complex schema migrations.

### Quick Start

```bash
cd app
npm install
npm run android
```
