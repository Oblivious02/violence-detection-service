# Project Setup Guide

## Prerequisites

This project requires a MySQL database. Ensure you have MySQL installed and running before proceeding.

## Environment Configuration

Before running the project, fill out the `.env` file based on `.env.example`.

### Example `.env` File

```
PORT="3000"
DATABASE_URL=""
JWT_SECRET=""
```

- Replace `DATABASE_URL` with your MySQL connection string.
- Generate a JWT secret from [jwtsecret.com](https://jwtsecret.com/generate) and assign it to `JWT_SECRET`.

## Installation and Setup

Run the following commands to set up and start the project:

1. Install dependencies:

   ```sh
   npm i
   ```

2. Initialize the database (only for the first time):

   ```sh
   npx prisma migrate deploy
   ```

3. Start the application:
   ```sh
   npm start
   ```

The application should now be running on the specified `PORT`.
