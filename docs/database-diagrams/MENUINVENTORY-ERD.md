erDiagram
    MenuInventory ||--|| Merchant : belongs_to
    MenuInventory }|--|{ Order : contains
    MenuInventory ||--o{ OrderItems : has

    MenuInventory {
        INTEGER id PK
        INTEGER merchantId FK "Reference to Merchants"
        STRING itemName "Product name"
        TEXT description "Optional product details"
        FLOAT price "Non-negative value"
        INTEGER stockLevel "Default: 0"
        STRING category "Optional grouping"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    Merchant {
        INTEGER id PK
        STRING businessName
        ENUM businessType
    }

    Order {
        INTEGER id PK
        STRING status
    }

    OrderItems {
        INTEGER orderId PK,FK
        INTEGER menuItemId PK,FK
        INTEGER quantity
    }

    stateDiagram-v2
    [*] --> Creation: Add New Item
    Creation --> InStock: Stock Added
    InStock --> LowStock: Stock Decreasing
    LowStock --> OutOfStock: No Stock
    InStock --> OutOfStock: Stock Depleted
    OutOfStock --> InStock: Restock
    
    note right of Creation
        Item details
        Initial pricing
        Category assignment
    end note
    
    note right of InStock
        Stock level > 0
        Available for orders
    end note
    
    note right of LowStock
        Stock monitoring
        Reorder triggers
    end note

    graph TD
    A[Validation Rules] --> B[Required Fields]
    A --> C[Numeric Constraints]
    A --> D[Stock Management]
    
    B --> B1[Merchant ID]
    B --> B2[Item Name]
    
    C --> C1[Non-negative Price]
    C --> C2[Valid Stock Level]
    
    D --> D1[Minimum Stock: 0]
    D --> D2[Stock Tracking]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Menu Item] --> B[Order Process]
    B --> C[Stock Update]
    C --> D[Inventory Status]
    
    B --> E[OrderItems Junction]
    E --> F[Quantity Tracking]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#f9f,stroke:#333,stroke-width:2px

    graph TB
    A[Category Structure] --> B[Product Grouping]
    A --> C[Menu Organization]
    A --> D[Inventory Classification]
    
    B --> E[Category Assignment]
    C --> F[Menu Display]
    D --> G[Stock Management]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    