erDiagram
    User ||--o| Role : has
    User ||--o| Customer : has_profile
    User ||--o| Merchant : has_profile
    User ||--o| Staff : has_profile
    User ||--o| Driver : has_profile
    User ||--o| User : managed_by
    User ||--o{ Notification : receives
    User ||--o{ Payment : processes_as_customer
    User ||--o{ Payment : processes_as_driver
    User ||--o{ Report : generates
    User ||--o{ Device : owns

    User {
        INTEGER id PK
        STRING firstName "2-50 characters"
        STRING lastName "2-50 characters"
        STRING email UK "Valid email format"
        STRING password "Hashed, min 6 chars"
        INTEGER roleId FK "Reference to Roles"
        JSON googleLocation "Optional location data"
        STRING phone UK "Validated format"
        ENUM country "malawi/zambia/mozambique/tanzania"
        ENUM merchantType "grocery/restaurant (optional)"
        BOOLEAN isVerified "Default: false"
        INTEGER managerId FK "Optional self-reference"
        STRING twoFactorSecret "2FA implementation"
        STRING passwordResetToken "Password recovery"
        DATE passwordResetExpires "Token expiration"
        TIMESTAMP deleted_at "Soft delete"
    }

    stateDiagram-v2
    [*] --> Registration: User Creation
    Registration --> Unverified: Account Created
    Unverified --> Verified: Email Verification
    Verified --> TwoFactor: 2FA Setup
    Verified --> PasswordReset: Reset Request
    
    note right of Registration
        Password hashing
        Role assignment
        Profile creation
    end note
    
    note right of Verified
        Full access granted
        Profile management
        Device association
    end note
    
    note right of PasswordReset
        Token generation
        Expiration tracking
        Secure update
    end note

    graph TB
    A[User Profile] --> B[Customer Profile]
    A --> C[Merchant Profile]
    A --> D[Staff Profile]
    A --> E[Driver Profile]
    
    B --> B1[Order Management]
    C --> C1[Business Operations]
    D --> D1[Staff Functions]
    E --> E1[Delivery Services]
    
    A --> F[Base Information]
    F --> F1[Personal Details]
    F --> F2[Contact Information]
    F --> F3[Location Data]
    F --> F4[Security Settings]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph LR
    A[Validation System] --> B[Personal Information]
    A --> C[Contact Details]
    A --> D[Security Elements]
    A --> E[Geographic Data]
    
    B --> B1[Name Length]
    B --> B2[Format Rules]
    
    C --> C1[Email Format]
    C --> C2[Phone Format]
    
    D --> D1[Password Length]
    D --> D2[Token Validation]
    
    E --> E1[Country Validation]
    E --> E2[Location Format]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    graph TD
    A[Security Features] --> B[Password Management]
    A --> C[Two-Factor Authentication]
    A --> D[Reset Mechanism]
    
    B --> B1[Bcrypt Hashing]
    B --> B2[Salt Generation]
    
    C --> C1[Secret Management]
    C --> C2[Verification Flow]
    
    D --> D1[Token Generation]
    D --> D2[Expiration Control]

    style A fill:#f9f,stroke:#333,stroke-width:2px

    