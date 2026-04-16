/*
  Azure Cosmos DB – MongoDB API
  ==============================
  Provides a managed MongoDB-compatible database.

  Dev  → Serverless capacity mode (pay-per-request, no minimum cost)
  Prod → Provisioned throughput (predictable performance) with periodic backups

  IMPORTANT – App code fix needed:
  The app calls `client.db()` with no argument. The MongoDB Node.js driver
  interprets this as the database name in the connection string URI.
  The mongoUriWithDb output below appends "/todoapp" to the URI so the
  driver connects to the correct database without any code change.

  Collections created here:
    todos  – partition key: _id (hash), indexes on status and createdAt
*/

@description('Cosmos DB account name – globally unique, lowercase, 3-44 chars.')
@minLength(3)
@maxLength(44)
param accountName string

@description('MongoDB database name.')
param databaseName string

@description('MongoDB collection name for todos.')
param collectionName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Deployment environment.')
@allowed(['dev', 'prod'])
param environment string

// ─── Derived values ───────────────────────────────────────────────────────────

var isProduction = environment == 'prod'

// ─── Cosmos DB account ───────────────────────────────────────────────────────

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  location: location
  tags: tags
  kind: 'MongoDB'
  properties: {
    apiProperties: {
      serverVersion: '7.0'
    }
    databaseAccountOfferType: 'Standard'

    // Serverless for dev (no minimum charge); provisioned for prod
    capabilities: isProduction
      ? []
      : [{ name: 'EnableServerless' }]

    // Disable availability zones to avoid capacity issues in high-demand regions
    enableMultipleWriteLocations: false
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]

    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }

    // Prod: 7-day periodic backups with geo-redundant storage
    // Dev:  daily backups with local redundancy
    backupPolicy: isProduction
      ? {
          type: 'Periodic'
          periodicModeProperties: {
            backupIntervalInMinutes: 240
            backupRetentionIntervalInHours: 168 // 7 days
            backupStorageRedundancy: 'Geo'
          }
        }
      : {
          type: 'Periodic'
          periodicModeProperties: {
            backupIntervalInMinutes: 1440 // daily
            backupRetentionIntervalInHours: 48
            backupStorageRedundancy: 'Local'
          }
        }

    enableFreeTier: false
    minimalTlsVersion: 'Tls12'

    // Cosmos DB for MongoDB uses port 10255 (not 27017)
    // The connection string returned by listConnectionStrings() is correct.
  }
}

// ─── Database ─────────────────────────────────────────────────────────────────

resource mongoDatabase 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    // Serverless accounts must not set throughput options
    options: isProduction ? { throughput: 400 } : {}
  }
}

// ─── todos collection ─────────────────────────────────────────────────────────

resource todosCollection 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases/collections@2024-05-15' = {
  parent: mongoDatabase
  name: collectionName
  properties: {
    resource: {
      id: collectionName
      shardKey: {
        _id: 'Hash'
      }
      indexes: [
        // Default _id index
        {
          key: { keys: ['_id'] }
        }
        // Supports GET /api/todos/pending and /api/todos/completed
        {
          key: { keys: ['status'] }
          options: { sparse: true }
        }
        // Supports sorting by creation date
        {
          key: { keys: ['createdAt'] }
          options: { sparse: true }
        }
        // TTL index placeholder (not used by the app currently)
        {
          key: { keys: ['updatedAt'] }
          options: { sparse: true }
        }
      ]
    }
    // Serverless collections must not set throughput options
    options: {}
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

var primaryKey = cosmosAccount.listKeys().primaryMasterKey
var host = '${accountName}.mongo.cosmos.azure.com'

// Full URI including the database name so `client.db()` resolves correctly
var mongoUriBase = 'mongodb://${accountName}:${primaryKey}@${host}:10255/${databaseName}'
var mongoUriOptions = '?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${accountName}@'

output accountName string = cosmosAccount.name
output accountId string = cosmosAccount.id
output mongoUriWithDb string = '${mongoUriBase}${mongoUriOptions}'
output mongoEndpoint string = cosmosAccount.properties.documentEndpoint
output primaryKey string = primaryKey
