# WRMS API — Frontend Contract

> **System:** Warehouse Reservation Management System  
> **API Version:** 1.0.0  
> **Base URL:** `http://localhost:3333/api`  
> **Swagger UI:** `http://localhost:3333/documentation`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Domain Entities](#2-domain-entities)
3. [Business Rules](#3-business-rules)
4. [Products](#4-products)
5. [Warehouses](#5-warehouses)
6. [Inventory](#6-inventory)
7. [Reservations](#7-reservations)
8. [Dashboard](#8-dashboard)
9. [Error Handling](#9-error-handling)
10. [Seed Data](#10-seed-data)
11. [Swagger Reference](#11-swagger-reference)

---

## 1. Authentication

All protected routes require the `Authorization: Bearer <token>` header.

The JWT token is obtained via `POST /auth/login` and contains:

```json
{
  "sub": "user-uuid",
  "email": "user@wtec.com",
  "role": "Admin"
}
```

### Roles

| Role       | Access                                                                 |
|------------|------------------------------------------------------------------------|
| `Admin`    | All routes. Can create/edit products, warehouses, inventory.           |
| `Operator` | Read routes + create/cancel reservations. **Cannot** create/edit products, warehouses, or inventory. |

---

## 2. Domain Entities

### Product

```json
{
  "id": "uuid",
  "sku": "string (unique)",
  "name": "string",
  "description": "string | null",
  "isActive": true,
  "createdAt": "2026-06-16T10:00:00.000Z",
  "updatedAt": "2026-06-16T10:00:00.000Z"
}
```

### Warehouse

```json
{
  "id": "uuid",
  "name": "string",
  "location": "string",
  "isActive": true,
  "createdAt": "2026-06-16T10:00:00.000Z",
  "updatedAt": "2026-06-16T10:00:00.000Z"
}
```

### Inventory

```json
{
  "id": "uuid",
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 100,
  "updatedAt": "2026-06-16T10:00:00.000Z"
}
```

- Composite unique key: `(productId, warehouseId)` — one record per product × warehouse pair.
- Missing record = quantity `0` (unregistered stock).

### Reservation

```json
{
  "id": "uuid",
  "productId": "uuid",
  "warehouseId": "uuid",
  "quantity": 5,
  "status": "Pending",
  "createdAt": "2026-06-16T10:00:00.000Z",
  "updatedAt": "2026-06-16T10:00:00.000Z"
}
```

- `status` values: `"Pending"`, `"Confirmed"`, `"Cancelled"`
- On create: initial status is `"Pending"`
- On cancel: status changes to `"Cancelled"` and stock is restored

---

## 3. Business Rules

### Products
- SKU must be unique. Duplicate SKU → `409 Conflict`.
- Inactive products cannot receive new reservations → `422 Unprocessable Entity`.
- `isActive` defaults to `true`.

### Warehouses
- Inactive warehouses cannot receive new reservations → `422 Unprocessable Entity`.
- `isActive` defaults to `true`.

### Inventory
- Quantity can never be negative → `422 Unprocessable Entity`.
- To adjust stock, the inventory record **must already exist** (productId + warehouseId). If not → `404 Not Found`.
- The value sent in `PUT /api/inventory` is the **absolute quantity** (not an increment/decrement).

### Reservations
- Minimum quantity: 1.
- Insufficient stock → `422 Unprocessable Entity`.
- Cancelling an already cancelled reservation → `422 Unprocessable Entity`.
- On cancel, stock is automatically restored (quantity added back).
- Reservations are **not** tied to a specific user (any authenticated user can create/cancel).

---

## 4. Products

### `GET /api/products` — List all products

**Auth:** `Admin`  
**Response:** `200 OK`

```json
[
  {
    "id": "0195b0d7-...",
    "sku": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Parafuso Sextavado M8",
    "description": "Parafuso de aço inox M8 x 30mm",
    "isActive": true,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/products
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Product list            |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

---

### `GET /api/products/:id` — Get product by ID

**Auth:** `Admin`  
**Params:** `id` (uuid — path param)  
**Response:** `200 OK`

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/products/0195b0d7-...
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Product found           |
| 400    | Invalid ID (not uuid)   |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |
| 404    | Product not found       |

---

### `POST /api/products` — Create product

**Auth:** `Admin`  
**Body:**

```json
{
  "sku": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "name": "Porca Sextavada M8",
  "description": "Porca de aço inox M8",
  "isActive": true
}
```

**Response:** `201 Created`

```json
{
  "id": "generated-uuid",
  "sku": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "name": "Porca Sextavada M8",
  "description": "Porca de aço inox M8",
  "isActive": true,
  "createdAt": "2026-06-16T10:00:00.000Z",
  "updatedAt": "2026-06-16T10:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3333/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sku":"b2c3d4e5-...","name":"Porca Sextavada M8"}'
```

| Field         | Type     | Required | Description                   |
|---------------|----------|----------|-------------------------------|
| `sku`         | `string` | yes      | Unique product SKU            |
| `name`        | `string` | yes      | Product name                  |
| `description` | `string` | no       | Optional description          |
| `isActive`    | `boolean`| no       | Default: `true`               |

| Status | Meaning                     |
|--------|-----------------------------|
| 201    | Product created             |
| 400    | Invalid data (sku/name empty) |
| 401    | Missing/invalid token       |
| 403    | Role lacks permission       |
| 409    | Duplicate SKU               |

---

### `PUT /api/products/:id` — Update product

**Auth:** `Admin`  
**Params:** `id` (uuid — path param)  
**Body (all optional):**

```json
{
  "name": "Parafuso Sextavado M10",
  "description": null,
  "isActive": false
}
```

**Response:** `200 OK` (same schema as `GET`)

```bash
curl -X PUT http://localhost:3333/api/products/0195b0d7-... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}'
```

| Field         | Type              | Required | Description                   |
|---------------|-------------------|----------|-------------------------------|
| `name`        | `string`          | no       | New name                      |
| `description` | `string \| null`  | no       | `null` clears description     |
| `isActive`    | `boolean`         | no       | Activate/deactivate product   |

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Product updated         |
| 400    | Invalid data            |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |
| 404    | Product not found       |

---

## 5. Warehouses

### `GET /api/warehouses` — List all warehouses

**Auth:** `Admin` | `Operator`  
**Response:** `200 OK`

```json
[
  {
    "id": "0195b0d7-...",
    "name": "Armazém Central",
    "location": "São Paulo, SP",
    "isActive": true,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/warehouses
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Warehouse list          |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

---

### `POST /api/warehouses` — Create warehouse

**Auth:** `Admin`  
**Body:**

```json
{
  "name": "Armazém Sul",
  "location": "Curitiba, PR",
  "isActive": true
}
```

**Response:** `201 Created`

```bash
curl -X POST http://localhost:3333/api/warehouses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Armazém Sul","location":"Curitiba, PR"}'
```

| Field      | Type      | Required | Description                   |
|------------|-----------|----------|-------------------------------|
| `name`     | `string`  | yes      | Warehouse name                |
| `location` | `string`  | yes      | Location                      |
| `isActive` | `boolean` | no       | Default: `true`               |

| Status | Meaning                 |
|--------|-------------------------|
| 201    | Warehouse created       |
| 400    | Invalid data            |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

> **Note:** No `PUT /warehouses/:id` endpoint exists. Warehouse updates are not implemented in this version.

---

## 6. Inventory

### `GET /api/inventory` — List inventory records

**Auth:** `Admin` | `Operator`  
**Response:** `200 OK`

```json
[
  {
    "id": "0195b0d7-...",
    "productId": "0195b0d7-...",
    "warehouseId": "0195b0d7-...",
    "quantity": 100,
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/inventory
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Inventory list          |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

> The `quantity` field includes **all** stock (available + reserved). The frontend should compute available stock by subtracting active reservations.

---

### `PUT /api/inventory` — Adjust stock

**Auth:** `Admin`  
**Body:**

```json
{
  "productId": "0195b0d7-...",
  "warehouseId": "0195b0d7-...",
  "quantity": 150
}
```

**Response:** `200 OK`

```bash
curl -X PUT http://localhost:3333/api/inventory \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"0195b0d7-...","warehouseId":"0195b0d7-...","quantity":150}'
```

| Field        | Type     | Required | Description                               |
|--------------|----------|----------|-------------------------------------------|
| `productId`  | `string` | yes      | Product UUID                              |
| `warehouseId`| `string` | yes      | Warehouse UUID                            |
| `quantity`   | `number` | yes      | **Absolute** quantity. Negative → 422.    |

| Status | Meaning                               |
|--------|---------------------------------------|
| 200    | Stock adjusted                        |
| 400    | Invalid data (Zod validation)         |
| 401    | Missing/invalid token                 |
| 403    | Role lacks permission                 |
| 404    | Product × warehouse pair not found    |
| 422    | Negative quantity                     |

> ⚠️ `quantity` is **absolute**, not incremental. Sending `{"quantity": 50}` sets stock to 50, it does not add 50.
>
> ⚠️ The inventory record **must already exist**. Use the seed data or create via migration. There is no endpoint to create inventory from scratch in this version.

---

## 7. Reservations

### `GET /api/reservations` — List reservation history

**Auth:** `Admin` | `Operator`  
**Response:** `200 OK`

```json
[
  {
    "id": "0195b0d7-...",
    "productId": "0195b0d7-...",
    "warehouseId": "0195b0d7-...",
    "quantity": 5,
    "status": "Pending",
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/reservations
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Reservation list        |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

> ⚠️ The response contains only IDs (productId, warehouseId). The frontend should resolve names from cached data or separate calls.
> The dashboard endpoint returns "flat" data with resolved names.

---

### `POST /api/reservations` — Create reservation

**Auth:** `Admin` | `Operator`  
**Body:**

```json
{
  "productId": "0195b0d7-...",
  "warehouseId": "0195b0d7-...",
  "quantity": 3
}
```

**Response:** `201 Created`

```bash
curl -X POST http://localhost:3333/api/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"0195b0d7-...","warehouseId":"0195b0d7-...","quantity":3}'
```

| Field        | Type     | Required | Description                     |
|--------------|----------|----------|---------------------------------|
| `productId`  | `string` | yes      | Product UUID                    |
| `warehouseId`| `string` | yes      | Warehouse UUID                  |
| `quantity`   | `number` | yes      | Minimum: 1                      |

**Validation order:**
1. Product exists? If not → `404`
2. Product is active? If not → `422` (`INACTIVE_PRODUCT`)
3. Warehouse exists? If not → `404`
4. Warehouse is active? If not → `422` (`INACTIVE_WAREHOUSE`)
5. Sufficient stock? If not → `422` (`INSUFFICIENT_STOCK`)

| Status | Meaning                                |
|--------|----------------------------------------|
| 201    | Reservation created, stock deducted    |
| 400    | Invalid data (quantity < 1)            |
| 401    | Missing/invalid token                  |
| 403    | Role lacks permission                  |
| 404    | Product or warehouse not found         |
| 422    | Inactive product / Inactive warehouse / Insufficient stock |

> On create, stock is **deducted** automatically (inventory.quantity -= reservation.quantity).

---

### `PUT /api/reservations/:id/cancel` — Cancel reservation

**Auth:** `Admin` | `Operator`  
**Params:** `id` (uuid — path param)  
**Response:** `200 OK`

```bash
curl -X PUT http://localhost:3333/api/reservations/0195b0d7-.../cancel \
  -H "Authorization: Bearer <token>"
```

| Status | Meaning                                 |
|--------|-----------------------------------------|
| 200    | Reservation cancelled, stock restored   |
| 400    | Invalid ID (not uuid)                   |
| 401    | Missing/invalid token                   |
| 403    | Role lacks permission                   |
| 404    | Reservation not found                   |
| 422    | Reservation was already cancelled       |

> On cancel, stock is **restored** automatically (inventory.quantity += reservation.quantity).

---

## 8. Dashboard

### `GET /api/dashboard` — Dashboard metrics

**Auth:** `Admin` | `Operator`  
**Response:** `200 OK`

```json
{
  "metrics": {
    "totalProducts": 2,
    "totalWarehouses": 3,
    "totalInventory": 245,
    "activeReservations": 2,
    "cancelledReservations": 1,
    "reservationsCreatedToday": 3
  },
  "lowStockItems": [
    {
      "productName": "Parafuso Sextavado M8",
      "productSku": "a1b2c3d4-...",
      "warehouseName": "Armazém Central",
      "quantity": 3,
      "threshold": 10
    }
  ],
  "recentReservations": [
    {
      "id": "0195b0d7-...",
      "productName": "Parafuso Sextavado M8",
      "warehouseName": "Armazém Central",
      "quantity": 5,
      "status": "Pending",
      "createdAt": "2026-06-16T10:00:00.000Z"
    }
  ],
  "warehouseMetrics": [
    {
      "warehouseName": "Armazém Central",
      "location": "São Paulo, SP",
      "totalProducts": 5,
      "totalQuantity": 150,
      "activeReservations": 2
    }
  ]
}
```

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/dashboard
```

| Status | Meaning                 |
|--------|-------------------------|
| 200    | Metrics computed        |
| 401    | Missing/invalid token   |
| 403    | Role lacks permission   |

### Response Fields

#### `metrics`

| Field                     | Type     | Description                                         |
|---------------------------|----------|-----------------------------------------------------|
| `totalProducts`           | `number` | Products with `isActive = true`                     |
| `totalWarehouses`         | `number` | **All** warehouses (includes inactive)              |
| `totalInventory`          | `number` | Sum of all quantities across all warehouses         |
| `activeReservations`      | `number` | Reservations with status `Pending` or `Confirmed`   |
| `cancelledReservations`   | `number` | Reservations with status `Cancelled`                |
| `reservationsCreatedToday`| `number` | Reservations created since 00:00 today              |

#### `lowStockItems`

Items with quantity < 10 units (fixed threshold).

| Field          | Type     | Description                       |
|----------------|----------|-----------------------------------|
| `productName`  | `string` | Product name                      |
| `productSku`   | `string` | Product SKU                       |
| `warehouseName`| `string` | Warehouse name                    |
| `quantity`     | `number` | Current stock quantity            |
| `threshold`    | `number` | Low-stock threshold (always `10`) |

#### `recentReservations`

Last 5 reservations (sorted by `createdAt` descending), with resolved names.

| Field           | Type     | Description                            |
|-----------------|----------|----------------------------------------|
| `id`            | `string` | Reservation UUID                       |
| `productName`   | `string` | Product name (resolved)                |
| `warehouseName` | `string` | Warehouse name (resolved)              |
| `quantity`      | `number` | Reserved quantity                      |
| `status`        | `string` | `Pending` / `Confirmed` / `Cancelled`  |
| `createdAt`     | `string` | ISO 8601                               |

#### `warehouseMetrics`

Per-warehouse aggregation. **Only non-cancelled reservations** are counted.

| Field                | Type     | Description                                    |
|----------------------|----------|------------------------------------------------|
| `warehouseName`      | `string` | Warehouse name                                 |
| `location`           | `string` | Location                                       |
| `totalProducts`      | `number` | **Distinct** products with stock in warehouse  |
| `totalQuantity`      | `number` | Sum of all quantities in warehouse             |
| `activeReservations` | `number` | Non-cancelled reservations in this warehouse   |

---

## 9. Error Handling

All error responses follow the same format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error description.",
  "statusCode": 400
}
```

### Error Codes

| Code                             | Status | Description                                        |
|----------------------------------|--------|----------------------------------------------------|
| `VALIDATION_ERROR`               | 400    | Invalid body/params data (Zod validation)          |
| `UNAUTHORIZED`                   | 401    | Missing, invalid, or expired token                 |
| `FORBIDDEN`                      | 403    | Role lacks permission for the route                |
| `NOT_FOUND`                      | 404    | Resource not found                                 |
| `DUPLICATE_SKU`                  | 409    | Product SKU already exists                         |
| `INACTIVE_PRODUCT`               | 422    | Inactive product cannot receive reservations       |
| `INACTIVE_WAREHOUSE`             | 422    | Inactive warehouse cannot receive reservations     |
| `INSUFFICIENT_STOCK`             | 422    | Insufficient stock for the reservation             |
| `NEGATIVE_QUANTITY`              | 422    | Negative inventory quantity                        |
| `RESERVATION_ALREADY_CANCELLED`  | 422    | Attempt to cancel an already cancelled reservation |
| `INVALID_CREDENTIALS`            | 401    | Invalid email or password                          |
| `INTERNAL_SERVER_ERROR`          | 500    | Unexpected error (contact admin)                   |

### Zod Validation Error

When the body/params fails schema validation:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Expected string, received number; Required",
  "statusCode": 400
}
```

---

## 10. Seed Data

### Users

| Email                | Password | Role         |
|----------------------|----------|--------------|
| admin@wtec.com       | 123456   | `Admin`      |
| operator@wtec.com    | 123456   | `Operator`   |

### Summary (5 products, 3 warehouses, 7 inventory records, 3 reservations)

| Product                       | SKU (UUID format)                                         |
|-------------------------------|------------------------------------------------------------|
| Parafuso Sextavado M8         | `a1b2c3d4-e5f6-7890-abcd-ef1234567890`                    |
| Porca Sextavada M8            | `b2c3d4e5-f6a7-8901-bcde-f12345678901`                    |
| Arruela Lisa M8               | `c3d4e5f6-a7b8-9012-cdef-123456789012`                    |
| Produto Inativo Teste         | `d4e5f6a7-b8c9-0123-defa-123456789abc`                    |
| Produto Sem Estoque           | `e5f6a7b8-c9d0-1234-efab-234567890bcd`                    |

| Warehouse           | Location         |
|---------------------|------------------|
| Armazém Central     | São Paulo, SP    |
| Armazém Sul         | Curitiba, PR     |
| Armazém Inativo     | Manaus, AM       |

---

## 11. Swagger Reference

The API has an interactive Swagger UI at:

```
http://localhost:3333/documentation
```

**Features:**
- "Authorize" (lock icon) → paste JWT token to authenticate
- "Try it out" → execute requests directly from the browser
- Complete request/response schemas for every endpoint
- Download the OpenAPI JSON at `GET /documentation/json`

### Authentication in Swagger

1. Call `POST /auth/login` with `{"email":"admin@wtec.com","password":"123456"}`
2. Copy the `token` from the response
3. Click "Authorize" at the top of Swagger
4. Paste the token in the `bearerAuth` field
5. Done — all protected routes are available for testing

---
