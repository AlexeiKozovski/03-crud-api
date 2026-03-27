# Product Catalog CRUD API 

A RESTful CRUD API for managing a product catalog, built with **Fastify** and an **in-memory store**. Supports single-instance and horizontally-scaled multi-worker modes.

## Requirements

- **Node.js** `>= 24.10.0`
- **npm** `>= 10`

## Installation

```bash
git clone https://github.com/AlexeiKozovski/03-crud-api.git

cd 03-crud-api

git checkout crud-api

npm install
```

## Configuration

The application reads its configuration from a `.env` file in the project root.

**1. Create your `.env` file from the provided example:**

```bash
cp .env.example .env
```

**2. Edit .env if needed (default port is 4000):**

```env
PORT=4000
```

## Running the Application

### Development Mode

Uses `ts-node-dev` for fast TypeScript execution with automatic restarts on file changes.

```bash
npm run start:dev
```

The server starts at `http://localhost:4000` (or the port defined in `.env`).

### Production Mode

Compiles TypeScript to JavaScript via `tsc`, then runs the compiled output.

```bash
npm run start:prod
```

This runs two steps internally:
1. `npm run build` — compiles `src/` to `dist/`
2. `node dist/server.js` — runs the compiled server

### Multi-Worker Mode

Starts multiple worker instances using the **Node.js Cluster API** with a **round-robin load balancer**.

```bash
npm run start:multi
```

**How it works:**

| Process | Role | Port |
| Primary | Load balancer | `PORT` (e.g. `4000`) |
| Worker 1 | Fastify instance | `PORT + 1` (e.g. `4001`) |
| Worker 2 | Fastify instance | `PORT + 2` (e.g. `4002`) |
| Worker N | Fastify instance | `PORT + N` |

The number of workers equals `os.availableParallelism() - 1` (one less than the number of CPU threads on your machine).

**All requests go through the load balancer at `PORT`.** Workers are not meant to be called directly.

**State consistency:** When any worker mutates data (POST / PUT / DELETE), it broadcasts the updated state to the primary process, which fans it out to all other workers. This keeps the in-memory database consistent across all instances.

> To run multi-worker mode in production (compiled):
> ```bash
> npm run start:multi:prod
> ```

## API Reference

### Product Schema

Every product stored in the catalog has the following shape:

|Field| Type      |Required| Constraints                                               |
|---|-----------|---|-----------------------------------------------------------|
|`id`| `string` (UUID) |auto-generated| Set by the server, not accepted in request body           |
| `name` | `string` | ✅ | Non-empty                                                 |
| `description` | `string` | ✅ | Non-empty                                                 |
| `price` | `number` | ✅ | Must be `> 0`                                             |
| `category` | `string` | ✅ | Non-empty (e.g. `"electronics"`, `"books"`, `"clothing"`) |
| `inStock` | `boolean` | ✅ | Non-empty                                                 |                                                        |

**Example product object:**

```json
{
  "id": "063934f6-41c1-49cd-a841-96d945cb7016",
  "name": "Apple MacBook Pro 16 M5 2026",
  "description": "High-performance laptop",
  "price": 2500,
  "category": "electronics",
  "inStock": true
}
```

### API Endpoints

All endpoints are prefixed with `/api/products`.

|Description|Method|Endpoint|Status Codes|
|---|---|---|---|
|Get all products|GET|`/api/products`|200|
|Get product by ID|GET|`/api/products/:id`|200, 400, 404|
|Create product|POST|`/api/products`|201, 400|
|Update product|PUT|`/api/products/:id`|200, 400, 404|
|Delete product|DELETE|`/api/products/:id`|204, 400, 404|

Creates a new product.

**Request Body** — `application/json`

```json
{
  "name": "Apple MacBook Pro 16 M5 2026",
  "description": "High-performance laptop",
  "price": 2500,
  "category": "electronics",
  "inStock": true
}
```

All fields are required. The `id` is generated server-side and must not be included.

## Usage Examples

The examples below are formatted for **Postman** so you can copy-paste quickly.

### Postman 

### Get all products (empty catalog)

**Method:** `GET`  
**URL:** `http://localhost:4000/api/products`

**Expected response**
- Status: `200 OK`
- Body:

```json
[]
```

### Create a product

**Method:** `POST`  
**URL:** `http://localhost:4000/api/products`  
**Headers:**
- `Content-Type: application/json`

**Body** (`raw` -> `JSON`)

```json
{
  "name": "Apple MacBook Pro 16 M5 2026",
  "description": "High-performance laptop",
  "price": 2500,
  "category": "electronics",
  "inStock": true
}
```

**Expected response**
- Status: `201 Created`
- Body (example):

```json
{
  "id": "063934f6-41c1-49cd-a841-96d945cb7016",
  "name": "Apple MacBook Pro 16 M5 2026",
  "description": "High-performance laptop",
  "price": 2500,
  "category": "electronics",
  "inStock": true
}
```

Save the returned `id` for the next requests.

### Get product by ID

**Method:** `GET`  
**URL:** `http://localhost:4000/api/products/<productId>`

Replace `<productId>` with the `id` from step 2.

**Expected response**
- Status: `200 OK`
- Body: the product object

### Update a product

**Method:** `PUT`  
**URL:** `http://localhost:4000/api/products/<productId>`  
**Headers:**
- `Content-Type: application/json`

**Body**

```json
{
  "name": "Apple MacBook Pro 16 M4 2024",
  "description": "High-performance laptop",
  "price": 2000,
  "category": "electronics",
  "inStock": false
}
```

**Expected response**
- Status: `200 OK`
- Body: updated product object

### Delete a product

**Method:** `DELETE`  
**URL:** `http://localhost:4000/api/products/<productId>`

**Expected response**
- Status: `204 No Content`
- Body: empty

### Error scenario: non-existent route

**Method:** `GET`  
**URL:** `http://localhost:4000/some/random/path`

**Expected response**
- Status: `404 Not Found`
- Body:

```json
{
  "message": "The requested endpoint does not exist"
}
```

### Error scenario: invalid UUID

**Method:** `GET`
**URL:** `http://localhost:4000/api/products/not-a-uuid`

**Expected response**
- Status: `400 Bad Request`
- Body:

```json
{
  "message": "Invalid product id: value must be a valid UUID"
}
```

## Testing the API

Tests are written with **Vitest** and **Supertest**. They run against a real Fastify instance in-process — no network required.

**Run all tests once:**
```bash
npm test
```

**Run tests in watch mode (re-runs on file change):**
```bash
npm run test:watch
```

