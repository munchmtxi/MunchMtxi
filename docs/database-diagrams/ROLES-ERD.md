erDiagram
    Role ||--o{ User : has
    Role ||--o{ Permission : contains

    Role {
        INTEGER id PK
        STRING name UK "Unique role identifier"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    User {
        INTEGER id PK
        INTEGER roleId FK
        STRING name
        STRING email
        STRING status
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    Permission {
        INTEGER id PK
        INTEGER roleId FK
        STRING name
        STRING description
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    graph TB
    A[Role] -->|1:N| B[Users]
    A -->|1:N| C[Permissions]
    
    subgraph "Role Management"
    A
    end
    
    subgraph "Associated Entities"
    B
    C
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px

    classDiagram
    class Role {
        +INTEGER id
        +STRING name
        +TIMESTAMP created_at
        +TIMESTAMP updated_at
        +TIMESTAMP deleted_at
        --
        Validations
        +notEmpty name
        +unique name
        --
        Features
        +timestamps enabled
        +soft deletes enabled
    }

    graph LR
    A[Role Creation] --> B[Name Validation]
    B --> C[Database Storage]
    C --> D[Association Management]
    
    D --> E[User Assignment]
    D --> F[Permission Assignment]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Core Features] --> B[Unique Identification]
    A --> C[Data Integrity]
    A --> D[Historical Tracking]
    A --> E[Relationship Management]
    
    B --> F[Unique role names]
    C --> G[Non-null constraints]
    D --> H[Timestamp tracking]
    D --> I[Soft deletion]
    E --> J[User associations]
    E --> K[Permission associations]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Role-Based Security] --> B[Access Control]
    A --> C[Permission Management]
    A --> D[User Classification]
    
    B --> E[Resource Protection]
    C --> F[Capability Definition]
    D --> G[User Grouping]

    style A fill:#f9f,stroke:#333,stroke-width:2px