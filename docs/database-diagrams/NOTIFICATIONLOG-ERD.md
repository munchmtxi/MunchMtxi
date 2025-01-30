erDiagram
    NotificationLog ||--o| Notification : belongs_to
    NotificationLog ||--o| Template : references

    NotificationLog {
        UUID id PK "UUIDV4 default"
        ENUM type "WHATSAPP/WHATSAPP_CUSTOM"
        STRING recipient "Target contact"
        UUID templateId FK "Reference to templates"
        JSON parameters "Template parameters"
        TEXT content "Message content"
        ENUM status "SENT/FAILED"
        STRING messageId "External reference"
        TEXT error "Error details"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    Template {
        UUID id PK
        STRING name
        TEXT content
    }

    Notification {
        UUID id PK
        STRING type
        STRING status
    }

    stateDiagram-v2
    [*] --> Processing: Notification Triggered
    Processing --> Sent: Successful Delivery
    Processing --> Failed: Delivery Error
    
    note right of Processing
        Template validation
        Parameter checking
        Recipient verification
    end note
    
    note right of Sent
        MessageId recorded
        Timestamp logged
    end note
    
    note right of Failed
        Error details captured
        Retry policy applied
    end note

    classDiagram
    class NotificationLog {
        +UUID id
        +ENUM type
        +STRING recipient
        +UUID templateId
        +JSON parameters
        +TEXT content
        +ENUM status
        +STRING messageId
        +TEXT error
        --
        Indexes
        +messageId
        +recipient
        +status
        +createdAt
    }

    graph TB
    A[Notification Trigger] --> B[Template Selection]
    B --> C[Parameter Processing]
    C --> D[Message Composition]
    D --> E[Delivery Attempt]
    E --> F[Status Recording]
    F --> G[Error Handling]
    
    subgraph "Logging Process"
    F
    G
    end
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Index Structure] --> B[Message Tracking]
    A --> C[Recipient Lookup]
    A --> D[Status Filtering]
    A --> E[Temporal Queries]
    
    B --> B1[messageId Index]
    C --> C1[recipient Index]
    D --> D1[status Index]
    E --> E1[createdAt Index]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Core Features] --> B[Message Tracking]
    A --> C[Status Management]
    A --> D[Error Capture]
    A --> E[Template Integration]
    
    B --> B1[Unique Message IDs]
    C --> C1[Delivery Status]
    D --> D1[Error Recording]
    E --> E1[Parameter Handling]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    