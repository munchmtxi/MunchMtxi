erDiagram
    Payment ||--|| Order : belongs_to
    Payment ||--|| Customer : belongs_to
    Payment ||--|| Merchant : belongs_to
    Payment ||--o| Driver : belongs_to

    Payment {
        INTEGER id PK
        INTEGER orderId FK "Reference to Orders"
        INTEGER customerId FK "Reference to Customers"
        INTEGER merchantId FK "Reference to Merchants"
        INTEGER driverId FK "Optional reference to Drivers"
        FLOAT amount "Transaction amount"
        STRING paymentMethod "Payment method used"
        ENUM status "pending/completed/failed/refunded"
        STRING transactionId UK "Unique transaction identifier"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    Order {
        INTEGER id PK
        STRING status
    }

    Customer {
        INTEGER id PK
        STRING name
    }

    Merchant {
        INTEGER id PK
        STRING name
    }

    Driver {
        INTEGER id PK
        STRING name
    }

    stateDiagram-v2
    [*] --> Pending: Payment Initiated
    Pending --> Completed: Transaction Successful
    Pending --> Failed: Transaction Error
    Completed --> Refunded: Refund Processed
    Failed --> [*]: Transaction Closed
    Refunded --> [*]: Refund Completed
    
    note right of Pending
        Amount validation
        Method verification
        Party verification
    end note
    
    note right of Completed
        Transaction ID assigned
        All parties notified
    end note

    classDiagram
    class Payment {
        +INTEGER id
        +INTEGER orderId
        +INTEGER customerId
        +INTEGER merchantId
        +INTEGER driverId
        +FLOAT amount
        +STRING paymentMethod
        +ENUM status
        +STRING transactionId
        --
        Validations
        +notNull orderId
        +notNull customerId
        +notNull merchantId
        +min amount(0)
        +notEmpty paymentMethod
        +unique transactionId
        --
        Features
        +timestamps enabled
        +soft deletes enabled
    }

    graph TB
    A[Payment Transaction] --> B[Customer Payment]
    A --> C[Merchant Settlement]
    A --> D[Driver Commission]
    
    B --> E[Payment Validation]
    C --> F[Revenue Distribution]
    D --> G[Service Fee]
    
    E --> H[Status Tracking]
    F --> H
    G --> H
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Payment Security] --> B[Transaction Uniqueness]
    A --> C[Amount Validation]
    A --> D[Status Management]
    A --> E[Reference Integrity]
    
    B --> F[Unique Transaction ID]
    C --> G[Positive Amount Check]
    D --> H[Status Transitions]
    E --> I[Foreign Key Constraints]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Payment Integration] --> B[Order System]
    A --> C[Customer Management]
    A --> D[Merchant Platform]
    A --> E[Driver Services]
    
    B --> F[Order Fulfillment]
    C --> G[Customer Billing]
    D --> H[Revenue Processing]
    E --> I[Commission Management]

    style A fill:#f9f,stroke:#333,stroke-width:2px