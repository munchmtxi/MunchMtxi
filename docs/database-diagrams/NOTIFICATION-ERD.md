erDiagram
    Notification ||--|| User : belongs_to
    Notification ||--o| Order : belongs_to
    Notification ||--o| Booking : belongs_to

    Notification {
        INTEGER id PK
        INTEGER userId FK "Reference to Users"
        INTEGER orderId FK "Optional reference to Orders"
        INTEGER bookingId FK "Optional reference to Bookings"
        STRING type "Notification category"
        TEXT message "Notification content"
        BOOLEAN readStatus "Default: false"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    User {
        INTEGER id PK
        STRING name
        STRING email
    }

    Order {
        INTEGER id PK
        STRING status
    }

    Booking {
        INTEGER id PK
        STRING status
    }

    stateDiagram-v2
    [*] --> Created: Notification Generated
    Created --> Unread: Delivery Complete
    Unread --> Read: User Views
    
    note right of Created
        User validation
        Content preparation
        Reference checking
    end note
    
    note right of Unread
        Awaiting user action
        Notification visible
    end note
    
    note right of Read
        Timestamp updated
        Status marked true
    end note

    classDiagram
    class Notification {
        +INTEGER id
        +INTEGER userId
        +INTEGER orderId
        +INTEGER bookingId
        +STRING type
        +TEXT message
        +BOOLEAN readStatus
        +TIMESTAMP created_at
        +TIMESTAMP updated_at
        +TIMESTAMP deleted_at
        --
        Validations
        +notNull userId
        +isInt userId
        +isInt orderId
        +isInt bookingId
        +notEmpty type
        +notEmpty message
    }

    graph TB
    A[Event Trigger] --> B[Reference Association]
    B --> C[Content Generation]
    C --> D[User Assignment]
    D --> E[Notification Creation]
    E --> F[Status Management]
    
    subgraph "Notification Process"
    C
    D
    E
    end
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[User Events] --> B[Order Updates]
    A --> C[Booking Changes]
    A --> D[System Messages]
    
    B --> E[Notification Generation]
    C --> E
    D --> E
    
    E --> F[Delivery]
    F --> G[Status Tracking]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Core Features] --> B[User Association]
    A --> C[Event Tracking]
    A --> D[Status Management]
    A --> E[Content Handling]
    
    B --> B1[Required User Link]
    C --> C1[Order Events]
    C --> C2[Booking Events]
    D --> D1[Read Status]
    E --> E1[Type Classification]
    E --> E2[Message Content]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    