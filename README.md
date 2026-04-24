# NestJS Commerce Microservices

This project is a small commerce platform implemented with NestJS microservices. It models a simple order flow from user registration to payment and delivery notification, and runs the full stack with Docker Compose for local development.

## Overview

The application is split into six services:

- `gateway`: HTTP entry point for clients
- `user`: user registration, login, and token parsing
- `product`: product catalog and sample product creation
- `order`: order orchestration and order state management
- `payment`: payment processing and payment status updates
- `notification`: notification persistence and delivery-started messaging

The gateway exposes REST endpoints. Service-to-service communication uses gRPC. Each service owns its own persistence layer:

- `user`: PostgreSQL
- `product`: PostgreSQL
- `payment`: PostgreSQL
- `order`: MongoDB
- `notification`: MongoDB

## Architecture

The main flow looks like this:

1. A client calls the `gateway` service.
2. The gateway forwards registration and login requests to `user`.
3. The gateway forwards product requests to `product`.
4. For order creation, the gateway authenticates the bearer token once and passes user metadata downstream.
5. The `order` service loads user and product data, validates the total amount, stores the order, and requests payment.
6. The `payment` service stores payment data, marks payment status, and triggers a notification request.
7. The `notification` service stores a notification document and signals the order service to move the order into a delivery-started state.

## Project Structure

```text
apps/
  gateway/
  user/
  product/
  order/
  payment/
  notification/
libs/
  common/
proto/
  *.proto
tutorial/
  kubernetes/
  helm/
docker-compose.yml
docker-compose.image-test.yml
```

Key directories:

- `apps/`: application services
- `libs/common/`: shared DTOs, constants, gRPC helpers, and interceptors
- `proto/`: gRPC contract definitions
- `tutorial/`: Kubernetes and Helm examples for the project

## Tech Stack

- NestJS
- TypeScript
- gRPC
- PostgreSQL
- MongoDB
- TypeORM
- Mongoose
- Docker Compose
- PNPM

## Services and Ports

### Public entry point

- `gateway`: `http://localhost:3000`

### Databases

- `postgres_user`: `localhost:6001`
- `postgres_product`: `localhost:6002`
- `mongo_order`: `localhost:6003`
- `postgres_payment`: `localhost:6005`
- `mongo_notification`: `localhost:6006`

## Environment Files

Each service includes its own local `.env` file:

- `apps/gateway/.env`
- `apps/user/.env`
- `apps/product/.env`
- `apps/order/.env`
- `apps/payment/.env`
- `apps/notification/.env`

These files are configured for local Docker Compose usage.

## Running the Project

Install dependencies locally:

```bash
pnpm install
```

Start the full stack:

```bash
docker compose up --build
```

Stop the stack:

```bash
docker compose down
```

## Local Quality Checks

Lint:

```bash
pnpm lint
```

Unit tests:

```bash
pnpm test
```

E2E command:

```bash
pnpm run test:e2e
```

Note:

`test:e2e` is wired to the current project structure, but there are no committed E2E spec files yet, so it exits successfully without running real E2E cases.

## Example API Flow

Create sample products:

```bash
curl -X POST http://127.0.0.1:3000/product/sample
```

Register a user:

```bash
curl -X POST http://127.0.0.1:3000/auth/register \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Basic <base64(email:password)>' \
  -d '{
    "name": "Test User",
    "age": 28,
    "profile": "QA flow test user"
  }'
```

Login:

```bash
curl -X POST http://127.0.0.1:3000/auth/login \
  -H 'Authorization: Basic <base64(email:password)>'
```

Create an order:

```bash
curl -X POST http://127.0.0.1:3000/order \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{
    "productIds": [
      "<product-id-1>",
      "<product-id-2>"
    ],
    "address": {
      "name": "Test User",
      "street": "123 George Street",
      "city": "Sydney",
      "postalCode": "2000",
      "country": "Australia"
    },
    "payment": {
      "paymentMethod": "CreditCard",
      "paymentName": "Test User",
      "cardNumber": "4111111111111111",
      "expiryYear": "2030",
      "expiryMonth": "12",
      "birthOrRegistration": "900101",
      "passwordTwoDigits": "12",
      "amount": 2500
    }
  }'
```

## Verified Behavior

The following workflow has been verified in the local Docker Compose environment:

- sample product creation
- user registration
- user login
- order creation
- payment processing
- notification persistence
- order persistence with updated status

## Notes

- The codebase has been normalized to English for comments, messages, and sample data.
- Complex flows keep only minimal comments where extra context is useful.
- The repository was initialized as a fresh Git history for this project.

## License

This project is provided for learning and portfolio use.
