# Template Model Documentation

## ER Diagram
```erDiagram
    templates ||--o{ notifications : "has (template_id)"
    templates ||--o| merchants : "belongs to (merchant_id)"

    templates {
        UUID id PK
        STRING name UK "Unique name"
        ENUM type "WHATSAPP/SMS/EMAIL"
        TEXT content "Template content"
        ENUM status "ACTIVE/INACTIVE/DEPRECATED"
        STRING language "Default: en"
        INTEGER merchant_id FK "Optional reference to merchants"
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
```

---

## State Diagram (Template Lifecycle)
```mermaid
stateDiagram-v2
    [*] --> draft: Template Created
    draft --> active: Approved
    active --> inactive: Disabled
    inactive --> active: Re-enabled
    active --> deprecated: Replaced
    deprecated --> [*]: Deleted

    note right of draft
        Initial creation with content
        Requires approval to activate
    end note

    note right of active
        Used for notifications
        Can be disabled or deprecated
    end note

    note right of deprecated
        No longer used
        Retained for historical purposes
    end note
```

---

## Relationships
```mermaid
graph TB
    A[Template] --> B[Notifications]
    A --> C[Merchant]

    B --> B1[Notification Content]
    B --> B2[Delivery Status]

    C --> C1[Merchant Profile]
    C --> C2[Business Operations]

    style A fill:#f9f,stroke:#333,stroke-width:2px
```

---

## Validation and Indexes
```mermaid
graph LR
    A[Validation] --> B[Name]
    A --> C[Type]
    A --> D[Content]
    A --> E[Status]
    A --> F[Language]

    B --> B1[Unique]
    B --> B2[Not Null]

    C --> C1[ENUM: WHATSAPP/SMS/EMAIL]
    C --> C2[Not Null]

    D --> D1[Not Null]
    D --> D2[Text Format]

    E --> E1[ENUM: ACTIVE/INACTIVE/DEPRECATED]
    E --> E2[Default: ACTIVE]

    F --> F1[Default: en]
    F --> F2[Not Null]

    style A fill:#ccf,stroke:#333,stroke-width:2px
```

---

## Indexes
```mermaid
graph TD
    A[Indexes] --> B[Name]
    A --> C[Type & Status]
    A --> D[Merchant ID]

    B --> B1[Unique Constraint]
    B --> B2[Fast Lookup]

    C --> C1[Composite Index]
    C --> C2[Optimized Queries]

    D --> D1[Foreign Key Lookup]
    D --> D2[Optional Reference]

    style A fill:#cfc,stroke:#333,stroke-width:2px
```

---

## Model Details

### Fields
| Field Name     | Type           | Constraints                          | Description                          |
|----------------|----------------|--------------------------------------|--------------------------------------|
| `id`           | UUID           | Primary Key, Default: UUIDV4        | Unique identifier for the template   |
| `name`         | STRING         | Unique, Not Null                    | Unique name for the template         |
| `type`         | ENUM           | WHATSAPP/SMS/EMAIL, Not Null        | Type of notification template        |
| `content`      | TEXT           | Not Null                            | Content of the template              |
| `status`       | ENUM           | ACTIVE/INACTIVE/DEPRECATED, Default: ACTIVE | Current status of the template       |
| `language`     | STRING         | Default: 'en', Not Null             | Language of the template             |
| `merchant_id`  | INTEGER        | Optional, Foreign Key to `merchants`| Associated merchant (if applicable)  |
| `created_at`   | TIMESTAMP      | Not Null, Default: CURRENT_TIMESTAMP| Timestamp of creation                |
| `updated_at`   | TIMESTAMP      | Not Null, Default: CURRENT_TIMESTAMP| Timestamp of last update             |

### Associations
- **Notifications:** A template can have many notifications (`hasMany`).  
- **Merchant:** A template can belong to a merchant (`belongsTo`).  

### Indexes
1. **Unique Name Index:** Ensures `name` is unique across all templates.  
2. **Composite Index on Type & Status:** Optimizes queries filtering by `type` and `status`.  
3. **Merchant ID Index:** Improves lookup performance for templates associated with a merchant.  

---

## Usage Examples

### Create a Template
```javascript
const template = await Template.create({
  name: 'welcome_email',
  type: 'EMAIL',
  content: 'Welcome to our service, {{name}}!',
  status: 'ACTIVE',
  language: 'en',
  merchant_id: 1
});
```

### Fetch Active Templates
```javascript
const activeTemplates = await Template.findAll({
  where: { status: 'ACTIVE' }
});
```

### Update Template Status
```javascript
await Template.update(
  { status: 'INACTIVE' },
  { where: { id: templateId } }
);
```

### Delete a Template
```javascript
await Template.destroy({
  where: { id: templateId }
});
```

---

## Notes
- **Soft Delete:** Not implemented. Use `status: 'DEPRECATED'` for archival purposes.  
- **Localization:** The `language` field supports localization for multi-language templates.  
- **Merchant Association:** Optional, allowing templates to be either global or merchant-specific.  

*This documentation ensures clarity and alignment with the `Template` model.*