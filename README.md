# Basic CRUD MVC Task Manager

This version contains the CRUD application, building and testing, code quality, and security implementation.

## Stack
- HTML
- CSS
- Vanilla JavaScript
- Node.js
- Express
- MongoDB
- Mongoose
- MVC architecture

## Run with Docker

```bash
docker compose down

docker compose up --build
```

Open:

http://localhost:3000

## Run without Docker

Install MongoDB locally and make sure MongoDB is running.

```bash
cp .env.example .env
npm install
npm start
```

Open:

http://localhost:3000

## CRUD API

- POST `/api/tasks` - Create
- GET `/api/tasks` - Read all
- GET `/api/tasks/:id` - Read one
- PUT `/api/tasks/:id` - Update
- DELETE `/api/tasks/:id` - Delete
