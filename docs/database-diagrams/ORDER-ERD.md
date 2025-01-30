erDiagram
    Order ||--|| Customer : belongs_to
    Order ||--|| Merchant : belongs_to
    Order ||--o| Driver : belongs_to
    Order ||--o{ Payment : has
    Order ||--o{ Notification : has
    Order }|--|{ MenuInventory : contains

    Order {
        INTEGER id PK
        INTEGER customerId FK "Reference to Customers"
        INTEGER merchantId FK "Reference to Merchants"
        INTEGER driverId FK "Optional reference to Drivers"
        JSON items "Order items details"
        FLOAT totalAmount "Order total cost"
        STRING orderNumber UK "Unique order identifier"
        DATE estimatedArrival "Expected delivery time"
        ENUM status "Order processing status"
        ENUM paymentStatus "unpaid/paid/refunded"
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP deleted_at "Soft delete"
    }

    stateDiagram-v2
    [*] --> PENDING: Order Created
    PENDING --> CONFIRMED: Merchant Accepts
    CONFIRMED --> PREPARING: Kitchen Started
    PREPARING --> READY: Order Complete
    READY --> OUT_FOR_DELIVERY: Driver Pickup
    OUT_FOR_DELIVERY --> DELIVERED: Delivery Complete
    
    PENDING --> CANCELLED: Cancel Request
    CONFIRMED --> CANCELLED: Cancel Request
    PREPARING --> CANCELLED: Cancel Request
    
    note right of PENDING
        Payment verification
        Merchant availability
    end note
    
    note right of CONFIRMED
        WhatsApp notification
        Estimated time update
    end note
    
    note right of OUT_FOR_DELIVERY
        Driver tracking enabled
        Customer notifications
    end note

    stateDiagram-v2
    [*] --> unpaid: Order Created
    unpaid --> paid: Payment Successful
    paid --> refunded: Refund Processed
    
    note right of unpaid
        Order can't progress
        without payment
    end note

    graph TB
    A[Order] --> B[Customer Relationship]
    A --> C[Merchant Relationship]
    A --> D[Driver Relationship]
    A --> E[Payment Management]
    A --> F[Notification System]
    A --> G[Menu Items]
    
    B --> B1[Order History]
    C --> C1[Fulfillment]
    D --> D1[Delivery]
    E --> E1[Transaction Records]
    F --> F1[Status Updates]
    G --> G1[Item Details]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Order Status] --> B[Template Selection]
    B --> C[Notification Dispatch]
    
    B --> D[order_confirmed]
    B --> E[order_preparing]
    B --> F[order_ready]
    B --> G[order_out_for_delivery]
    B --> H[order_delivered]
    B --> I[order_cancelled]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Order Validation] --> B[Required Fields]
    A --> C[Data Types]
    A --> D[Business Rules]
    
    B --> B1[Customer ID]
    B --> B2[Merchant ID]
    B --> B3[Items]
    B --> B4[Total Amount]
    B --> B5[Order Number]
    
    C --> C1[ID Integers]
    C --> C2[JSON Items]
    C --> C3[Float Amount]
    
    D --> D1[Positive Amount]
    D --> D2[Valid Status]
    D --> D3[Payment Status]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    