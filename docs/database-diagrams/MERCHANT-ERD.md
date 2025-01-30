erDiagram
    Merchant ||--|| User : belongs_to
    Merchant ||--o{ Staff : has
    Merchant ||--o{ Order : has
    Merchant ||--o{ MenuInventory : has
    Merchant ||--o{ Booking : has
    Merchant ||--o{ Payment : processes
    Merchant ||--o{ Notification : receives

    Merchant {
        INTEGER id PK
        INTEGER userId FK "Reference to Users (unique)"
        STRING businessName "Company name"
        ENUM businessType "grocery/restaurant"
        STRING address "Physical location"
        STRING phoneNumber UK "Unique contact"
        STRING currency "Default: USD"
        STRING timeZone "Default: UTC"
        JSON businessHours "Operating hours"
        JSON notificationPreferences "Communication settings"
        BOOLEAN whatsappEnabled "Default: true"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    graph TB
    A[Merchant Type] --> B[Restaurant]
    A --> C[Grocery]
    
    B --> D[Menu Management]
    B --> E[Table Bookings]
    B --> F[Order Processing]
    
    C --> G[Inventory Management]
    C --> H[Product Catalog]
    C --> I[Order Processing]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Communication Channels] --> B[WhatsApp Integration]
    A --> C[Notification System]
    
    B --> D[Phone Formatting]
    B --> E[Message Delivery]
    
    C --> F[Order Updates]
    C --> G[Booking Notifications]
    C --> H[Customer Feedback]
    C --> I[Marketing Messages]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Time Management] --> B[Business Hours]
    A --> C[Timezone Handling]
    
    B --> D[Opening Time]
    B --> E[Closing Time]
    
    C --> F[Local Time Display]
    C --> G[Operation Schedule]
    
    D --> H[Format Validation]
    E --> H
    F --> I[Time Conversion]
    G --> I

    style A fill:#f9f,stroke:#333,stroke-width:2px

    stateDiagram-v2
    [*] --> PhoneValidation
    PhoneValidation --> BusinessHoursValidation
    BusinessHoursValidation --> NotificationSetup
    
    state PhoneValidation {
        [*] --> Format
        Format --> LibPhoneNumber
        LibPhoneNumber --> Valid
        LibPhoneNumber --> Invalid
    }
    
    state BusinessHoursValidation {
        [*] --> CheckOpen
        CheckOpen --> CheckClose
        CheckClose --> ValidHours
    }

    graph TB
    A[Merchant Management] --> B[Staff Management]
    A --> C[Order Processing]
    A --> D[Menu/Inventory]
    A --> E[Booking System]
    A --> F[Payment Processing]
    
    B --> B1[Staff Hierarchy]
    C --> C1[Order Tracking]
    D --> D1[Item Management]
    E --> E1[Reservation System]
    F --> F1[Transaction Records]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    