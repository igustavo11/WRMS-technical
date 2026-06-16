# Database Model — WRMS

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string passwordHash
        string role
        datetime createdAt
    }

    PRODUCT {
        string id PK
        string sku UK
        string name
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    WAREHOUSE {
        string id PK
        string name
        string location
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    INVENTORY {
        string id PK
        string productId FK
        string warehouseId FK
        int quantity
        datetime updatedAt
    }

    RESERVATION {
        string id PK
        string productId FK
        string warehouseId FK
        int quantity
        string status
        datetime createdAt
        datetime updatedAt
    }

    PRODUCT ||--o{ INVENTORY : "stock per warehouse"
    WAREHOUSE ||--o{ INVENTORY : "stock per product"
    PRODUCT ||--o{ RESERVATION : "reserved in"
    WAREHOUSE ||--o{ RESERVATION : "reserved in"
```

## Modeling notes

- `INVENTORY` has a composite unique key `(productId, warehouseId)` — one stock record per product × warehouse combination.
- `PRODUCT.sku` and `USER.email` are unique.
- `RESERVATION.status` and `USER.role` are `String`, not Prisma `enum` — the `sqlserver` connector doesn't support native Prisma enums. Valid values (`Pending/Confirmed/Cancelled`, `Admin/Operator`) are validated via Zod at the API layer.
- There's no relation between `USER` and `RESERVATION`/`INVENTORY` — the PRD doesn't associate the authenticated user with the reservation they create; the JWT is only used for authentication/authorization.
- Missing an `INVENTORY` row for a product × warehouse combination is treated as quantity `0` by the business rule (no pre-created "zero" row).
