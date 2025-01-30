erDiagram
    Staff ||--o{ StaffPermissions : has
    StaffPermissions }o--|| Permissions : references
    
    Staff {
        INTEGER id PK
        STRING name
        STRING email
        STRING status
    }

    StaffPermissions {
        INTEGER staffId PK,FK "Reference to Staff"
        INTEGER permissionId PK,FK "Reference to Permissions"
    }

    Permissions {
        INTEGER id PK
        STRING name
        STRING description
        STRING category
    }

    classDiagram
    class StaffPermissions {
        +INTEGER staffId
        +INTEGER permissionId
        --
        Composite Primary Key
        No timestamps
        No soft deletes
    }

    graph LR
    A[Staff] -->|1:N| B[StaffPermissions]
    C[Permissions] -->|1:N| B
    
    subgraph Junction Table
    B
    end

    graph TD
    A[StaffPermissions Features] --> B[Composite Primary Key]
    A --> C[No Timestamps]
    A --> D[No Soft Deletes]
    A --> E[Strict Referential Integrity]
    
    B --> F[staffId + permissionId]
    C --> G[timestamps: false]
    D --> H[paranoid: false]
    E --> I[Foreign Key Constraints]

    graph TB
    A[Model Configuration] --> B[Table Name: StaffPermissions]
    A --> C[No Timestamp Columns]
    A --> D[No Soft Delete Column]
    
    B --> E[Composite Primary Key<br>staffId + permissionId]
    C --> F[created_at: disabled<br>updated_at: disabled]
    D --> G[deleted_at: disabled]

    