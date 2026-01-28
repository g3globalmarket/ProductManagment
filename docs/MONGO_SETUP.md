# MongoDB Setup Guide

Quick guide for setting up MongoDB Atlas with the Product Import Tool.

## Environment Variables

Create a `.env.local` file in the project root (copy from `.env.example`):

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=product-import
NEXT_PUBLIC_USE_API=true
ALLOW_DEV_SEED=true
```

### Getting MongoDB URI

1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user (username/password)
4. Whitelist your IP address (or `0.0.0.0/0` for development)
5. Click "Connect" → "Connect your application"
6. Copy the connection string and replace `<password>` with your password

## Seeding the Database

To populate the database with fake products for testing:

1. Set `ALLOW_DEV_SEED=true` in `.env.local`
2. Start the dev server: `npm run dev`
3. Call the seed endpoint:

```bash
curl -X POST http://localhost:3000/api/dev/seed
```

Or use a tool like Postman/Insomnia to POST to `http://localhost:3000/api/dev/seed`

**Note:** The seed endpoint only works when:
- `NODE_ENV !== "production"`
- `ALLOW_DEV_SEED=true`

## Toggling API Mode

**Use MongoDB (API mode):**
```bash
NEXT_PUBLIC_USE_API=true
```

**Use localStorage (default MVP mode):**
```bash
NEXT_PUBLIC_USE_API=false
# or omit the variable
```

When `NEXT_PUBLIC_USE_API=true`:
- Products are stored in MongoDB
- All operations go through API routes
- localStorage is not used for products

When `NEXT_PUBLIC_USE_API=false`:
- Products are stored in browser localStorage
- No backend required
- Original MVP behavior

## Verification

After setting up:

1. Start dev server: `npm run dev`
2. With `NEXT_PUBLIC_USE_API=true`:
   - Seed database: `POST /api/dev/seed`
   - Open `/import` - products should load from MongoDB
   - Edit a product and refresh - changes should persist

## Troubleshooting

**"MONGODB_URI environment variable not defined"**
- Make sure `.env.local` exists and contains `MONGODB_URI`

**"Failed to connect to MongoDB"**
- Check your connection string
- Verify IP whitelist includes your IP
- Check database user credentials

**"Seed endpoint returns 403"**
- Ensure `ALLOW_DEV_SEED=true`
- Ensure `NODE_ENV !== "production"`

