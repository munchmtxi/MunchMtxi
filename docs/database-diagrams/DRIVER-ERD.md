erDiagram
    Driver ||--|| User : belongs_to
    Driver ||--o{ Order : fulfills
    Driver ||--o{ Payment : receives
    Driver ||--o{ Notification : receives

    Driver {
        INTEGER id PK
        INTEGER userId FK "Reference to Users (unique)"
        STRING name "Driver's full name"
        STRING phoneNumber UK "Unique contact number"
        JSON vehicleInfo "Vehicle details"
        STRING licenseNumber UK "Unique license ID"
        JSON routes "Optional route data"
        ENUM availabilityStatus "available/unavailable"
        GEOMETRY currentLocation "POINT type"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    User {
        INTEGER id PK
        STRING email
        STRING status
    }

    Order {
        INTEGER id PK
        STRING status
    }

    Payment {
        INTEGER id PK
        FLOAT amount
    }

    stateDiagram-v2
    [*] --> Available: Driver Online
    Available --> Unavailable: Status Change
    Available --> OnDelivery: Order Assigned
    OnDelivery --> Available: Delivery Complete
    Unavailable --> Available: Status Update
    
    note right of Available
        Location tracking active
        Ready for assignments
    end note
    
    note right of OnDelivery
        Route optimization
        Real-time updates
    end note
    
    note right of Unavailable
        Temporarily offline
        No new assignments
    end note

    graph TD
    A[Location Management] --> B[Current Position]
    A --> C[Route Tracking]
    A --> D[Delivery Optimization]
    
    B --> E[POINT Geometry]
    C --> F[JSON Routes]
    D --> G[Distance Calculation]
    
    E --> H[Real-time Updates]
    F --> I[Route History]
    G --> J[ETA Calculation]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Driver Communication] --> B[Phone Validation]
    A --> C[WhatsApp Integration]
    A --> D[Notification System]
    
    B --> E[libphonenumber]
    C --> F[Message Formatting]
    D --> G[Status Updates]
    
    E --> H[Validation Rules]
    F --> I[Delivery Updates]
    G --> J[Real-time Alerts]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TB
    A[Driver Credentials] --> B[Vehicle Information]
    A --> C[License Management]
    
    B --> D[Vehicle Details]
    B --> E[Maintenance Records]
    
    C --> F[License Validation]
    C --> G[Expiration Tracking]
    
    D --> H[JSON Storage]
    F --> I[Unique Constraint]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Delivery Management] --> B[Order Assignment]
    B --> C[Route Planning]
    C --> D[Delivery Execution]
    D --> E[Completion]
    
    B --> F[Status Update]
    C --> G[Location Tracking]
    D --> H[Customer Updates]
    E --> I[Payment Processing]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    