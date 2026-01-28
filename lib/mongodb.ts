import { MongoClient, Db } from 'mongodb'

function getMongoConfig() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
  }

  if (!process.env.MONGODB_DB) {
    throw new Error('Please define the MONGODB_DB environment variable inside .env.local')
  }

  return {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB,
  }
}

interface MongoClientCache {
  client: MongoClient | null
  promise: Promise<MongoClient> | null
}

// Use global variable to cache the client across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var mongoClientCache: MongoClientCache | undefined
}

let cached: MongoClientCache = global.mongoClientCache || { client: null, promise: null }

if (!global.mongoClientCache) {
  global.mongoClientCache = cached
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client
  }

  if (!cached.promise) {
    const config = getMongoConfig()
    cached.promise = MongoClient.connect(config.uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast: 5 second timeout
    })
  }

  try {
    cached.client = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.client
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient()
  const config = getMongoConfig()
  return client.db(config.dbName)
}

