erDiagram
    Staff ||--|| User : belongs_to
    Staff ||--|| Merchant : belongs_to
    Staff ||--o| User : managed_by
    Staff ||--o{ StaffPermissions : has
    StaffPermissions }o--|| Permission : references

    Staff {
        INTEGER id PK
        INTEGER userId FK "Reference to Users (unique)"
        INTEGER merchantId FK "Reference to Merchants"
        STRING position "Staff position"
        INTEGER managerId FK "Reference to Users (manager)"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    User {
        INTEGER id PK
        STRING name
        STRING email
        STRING status
    }

    Merchant {
        INTEGER id PK
        STRING name
        STRING type
        STRING status
    }

    Permission {
        INTEGER id PK
        STRING name
        STRING description
    }

    StaffPermissions {
        INTEGER staffId PK,FK
        INTEGER permissionId PK,FK
    }

    graph TD
    A[Staff Model] --> B[User Association]
    A --> C[Merchant Association]
    A --> D[Manager Association]
    A --> E[Permissions Association]

    B --> F[One-to-One<br>userId]
    C --> G[Many-to-One<br>merchantId]
    D --> H[Many-to-One<br>managerId]
    E --> I[Many-to-Many<br>through StaffPermissions]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Field Validations] --> B[userId]
    A --> C[merchantId]
    A --> D[position]
    
    B --> E[Required<br>Integer<br>Unique]
    C --> F[Required<br>Integer]
    D --> G[Required<br>Non-empty string]

    graph TB
    A[Model Settings] --> B[Timestamps Enabled]
    A --> C[Soft Deletes Enabled]
    A --> D[Table Name: Staff]
    
    B --> E[created_at<br>updated_at]
    C --> F[deleted_at<br>paranoid: true]
    D --> G[modelName: 'Staff']

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Staff Features] --> B[User Authentication]
    A --> C[Merchant Association]
    A --> D[Hierarchy Management]
    A --> E[Permission Control]
    
    B --> F[Linked to User Account]
    C --> G[Belongs to Merchant]
    D --> H[Manager Relationship]
    E --> I[Role-based Permissions]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    