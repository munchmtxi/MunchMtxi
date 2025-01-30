erDiagram
    Booking ||--|| Customer : belongs_to
    Booking ||--|| Merchant : belongs_to
    Booking ||--o{ Notification : generates

    Booking {
        INTEGER id PK
        INTEGER customerId FK "Reference to Customers"
        INTEGER merchantId FK "Reference to Merchants"
        STRING reference UK "Unique booking reference"
        DATEONLY bookingDate "Reservation date"
        TIME bookingTime "Reservation time"
        ENUM bookingType "table/taxi"
        JSON details "Additional information"
        ENUM status "pending/approved/denied/seated/cancelled"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    Customer {
        INTEGER id PK
        STRING name
    }

    Merchant {
        INTEGER id PK
        STRING businessName
    }

    Notification {
        INTEGER id PK
        INTEGER bookingId FK
    }

    stateDiagram-v2
    [*] --> Pending: Booking Created
    Pending --> Approved: Merchant Accepts
    Pending --> Denied: Merchant Denies
    Approved --> Seated: Customer Arrives
    Approved --> Cancelled: Cancellation Request
    
    note right of Pending
        Reference generated
        Details validated
        Notifications sent
    end note
    
    note right of Approved
        Confirmation sent
        Resources allocated
    end note
    
    note right of Seated
        Table occupied
        Service begins
    end note

    graph TB
    A[Booking Time Management] --> B[Date Handling]
    A --> C[Time Formatting]
    A --> D[Timezone Consideration]
    
    B --> E[Date Validation]
    C --> F[Time Slots]
    D --> G[Local Time Display]
    
    E --> H[Format Methods]
    F --> I[Availability Check]
    G --> J[User Interface]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Booking Categories] --> B[Table Reservation]
    A --> C[Taxi Service]
    
    B --> D[Party Size]
    B --> E[Table Preferences]
    B --> F[Special Requests]
    
    C --> G[Pickup Location]
    C --> H[Destination]
    C --> I[Vehicle Type]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Booking Events] --> B[Status Changes]
    A --> C[Reminders]
    A --> D[Updates]
    
    B --> E[Customer Notification]
    B --> F[Merchant Alert]
    
    C --> G[Upcoming Booking]
    C --> H[Check-in Time]
    
    D --> I[Modification Notice]
    D --> J[Cancellation Alert]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    