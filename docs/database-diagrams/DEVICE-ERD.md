erDiagram
    Device }|--|| User : belongs_to

    Device {
        INTEGER id PK
        INTEGER userId FK "Reference to Users"
        STRING deviceId "Device identifier"
        STRING deviceType "Device category"
        DATE lastUsedAt "Last activity timestamp"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    User {
        INTEGER id PK
        STRING email
        STRING status
    }

    stateDiagram-v2
    [*] --> Registration: Device Added
    Registration --> Active: Device In Use
    Active --> Inactive: No Recent Activity
    Inactive --> Active: Device Returns
    Active --> Deregistered: Device Removed
    
    note right of Registration
        User association
        Device identification
        Type classification
    end note
    
    note right of Active
        Usage tracking
        Timestamp updates
    end note
    
    note right of Inactive
        Last activity recorded
        Retention policy applied
    end note

    classDiagram
    class Device {
        +INTEGER id
        +INTEGER userId
        +STRING deviceId
        +STRING deviceType
        +DATE lastUsedAt
        +TIMESTAMP created_at
        +TIMESTAMP updated_at
        +TIMESTAMP deleted_at
        --
        Constraints
        +CASCADE onUpdate
        +CASCADE onDelete
        +Unique(userId, deviceId)
    }

    graph TD
    A[Device Activity] --> B[Initial Registration]
    A --> C[Usage Monitoring]
    A --> D[Status Updates]
    
    B --> E[Device Details]
    C --> F[Timestamp Updates]
    D --> G[Activity Records]
    
    E --> H[User Association]
    F --> I[Last Used Time]
    G --> J[Historical Data]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Device Management] --> B[Registration]
    A --> C[Monitoring]
    A --> D[Deregistration]
    
    B --> E[Device Identity]
    C --> F[Activity Tracking]
    D --> G[Soft Deletion]
    
    E --> H[User Binding]
    F --> I[Usage Patterns]
    G --> J[Data Retention]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    