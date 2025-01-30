erDiagram
    Customer ||--|| User : belongs_to
    Customer ||--o{ Order : places
    Customer ||--o{ Booking : makes
    Customer ||--o{ Payment : processes
    Customer ||--o{ Notification : receives

    Customer {
        INTEGER id PK
        INTEGER userId FK "Reference to Users (unique)"
        STRING phoneNumber UK "Unique contact number"
        STRING address "Delivery location"
        JSON preferences "Customer preferences"
        JSON paymentMethods "Stored payment options"
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

    Booking {
        INTEGER id PK
        STRING status
    }

    Payment {
        INTEGER id PK
        FLOAT amount
    }

    graph TB
    A[Customer Activity] --> B[Order Management]
    A --> C[Booking System]
    A --> D[Payment Processing]
    A --> E[Notification Handling]
    
    B --> F[Order History]
    C --> G[Reservation Tracking]
    D --> H[Transaction Records]
    E --> I[Communication Log]
    
    F --> J[Order Analytics]
    G --> K[Booking Patterns]
    H --> L[Payment History]
    I --> M[Engagement Metrics]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Customer Communication] --> B[Phone Validation]
    A --> C[WhatsApp Integration]
    A --> D[Notification Delivery]
    
    B --> E[libphonenumber]
    C --> F[Number Formatting]
    D --> G[Status Updates]
    
    E --> H[Validation Rules]
    F --> I[Message Delivery]
    G --> J[Customer Alerts]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    stateDiagram-v2
    [*] --> Initial: Profile Creation
    Initial --> Customized: Preferences Set
    Customized --> Updated: Preference Update
    Updated --> Customized: Continuous Updates
    
    note right of Initial
        Basic profile setup
        Default preferences
    end note
    
    note right of Customized
        Personal settings
        Payment methods
        Delivery preferences
    end note

    graph TD
    A[Data Validation] --> B[Required Fields]
    A --> C[Format Validation]
    A --> D[Unique Constraints]
    
    B --> E[User Association]
    B --> F[Contact Details]
    B --> G[Address Information]
    
    C --> H[Phone Format]
    C --> I[JSON Structure]
    
    D --> J[Unique Phone]
    D --> K[Unique User ID]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    