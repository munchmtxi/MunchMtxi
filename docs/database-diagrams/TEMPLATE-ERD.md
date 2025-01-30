erDiagram
    Template ||--o{ Notification : generates
    Template }|--|| Merchant : belongs_to

    Template {
        UUID id PK
        STRING name UK "Unique template identifier"
        ENUM type "WHATSAPP, SMS, EMAIL"
        TEXT content "Template body"
        ENUM status "ACTIVE, INACTIVE, DEPRECATED"
        STRING language "Default: en"
        INTEGER merchantId FK "Reference to Merchant"
    }

    Notification {
        UUID id PK
        UUID templateId FK
        TEXT content
        ENUM status
        TIMESTAMP createdAt
    }

    Merchant {
        INTEGER id PK
        STRING name
        STRING type "GROCERY, RESTAURANT"
        STRING status
    }

    graph TD
    A[Template Indexes] --> B[Name Index]
    A --> C[Type-Status Index]
    A --> D[Merchant Index]
    
    B --> E[Unique: true<br>Fields: name]
    C --> F[Composite Index<br>Fields: type, status]
    D --> G[Foreign Key Index<br>Fields: merchantId]

    graph LR
    A[Template] --> B[Unique Identification]
    A --> C[Channel Support]
    A --> D[Status Management]
    A --> E[Merchant Association]
    
    B --> F[UUID-based]
    C --> G[WhatsApp]
    C --> H[SMS]
    C --> I[Email]
    D --> J[Active]
    D --> K[Inactive]
    D --> L[Deprecated]
    E --> M[One-to-One]

    