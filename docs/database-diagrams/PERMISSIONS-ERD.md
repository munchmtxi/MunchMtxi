erDiagram
    Permission }|--|| Role : belongs_to
    Permission ||--o{ StaffPermissions : has
    StaffPermissions }o--|| Staff : references

    Permission {
        INTEGER id PK
        INTEGER roleId FK "Reference to Roles"
        STRING action "Required action"
        STRING resource "Target resource"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    Role {
        INTEGER id PK
        STRING name UK
    }

    Staff {
        INTEGER id PK
        INTEGER userId FK
        INTEGER merchantId FK
    }

    StaffPermissions {
        INTEGER staffId PK,FK
        INTEGER permissionId PK,FK
    }

    graph TB
    A[Permission System] --> B[Role Association]
    A --> C[Staff Association]
    A --> D[Resource Control]
    
    B --> E[Role-based Access]
    C --> F[Staff-specific Rights]
    D --> G[Action Control]
    D --> H[Resource Protection]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    classDiagram
    class Permission {
        +INTEGER id
        +INTEGER roleId
        +STRING action
        +STRING resource
        +TIMESTAMP created_at
        +TIMESTAMP updated_at
        +TIMESTAMP deleted_at
        --
        Validations
        +notEmpty action
        +notEmpty resource
        +CASCADE onUpdate
        +CASCADE onDelete
        --
        Indexes
        +Unique(roleId, action, resource)
    }

    graph LR
    A[Permission] --> B[Role Binding]
    A --> C[Staff Access]
    
    B --> D[Role Management]
    C --> E[StaffPermissions]
    E --> F[Staff Assignment]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Data Validation] --> B[Required Fields]
    A --> C[Unique Constraints]
    A --> D[Referential Integrity]
    
    B --> E[Action<br>Resource]
    C --> F[Composite Index<br>roleId+action+resource]
    D --> G[Role CASCADE]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Core Features] --> B[Access Control]
    A --> C[Data Tracking]
    A --> D[Relationship Management]
    
    B --> E[Action Definition]
    B --> F[Resource Mapping]
    C --> G[Timestamps]
    C --> H[Soft Deletion]
    D --> I[Role Association]
    D --> J[Staff Assignment]

    style A fill:#f9f,stroke:#333,stroke-width:2px