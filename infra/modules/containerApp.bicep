/*
  Azure Container App – Backend API
  ===================================
  Runs the Node.js / Express backend.

  Scaling:
    Dev  → min 0 replicas (scale to zero), max 3
    Prod → min 1 replica  (no cold start),  max 10
    HTTP scaling rule: 1 replica per 10 concurrent requests

  Health probes:
    Liveness  → GET /health (prevents zombie containers)
    Readiness → GET /health (gates traffic until DB is connected)

  Secrets stored inside the Container App (not Key Vault) for simplicity.
  Migrate to Key Vault references for stricter security posture.

  PORT note:
    The Dockerfile EXPOSEs 3000 but the app defaults to 8080.
    We force PORT=8080 via env var and target port 8080 in ingress.
*/

@description('Container App name.')
param appName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Container Apps Environment resource ID.')
param containerAppEnvironmentId string

@description('Container image to deploy (e.g. myacr.azurecr.io/todo-api:v1.0.0).')
param containerImage string

@description('ACR login server hostname.')
param containerRegistryServer string

@description('ACR admin username.')
param containerRegistryUsername string

@description('ACR admin password.')
@secure()
param containerRegistryPassword string

@description('MongoDB connection URI (includes database name and SSL params).')
@secure()
param mongoUri string

@description('Application Insights connection string.')
param appInsightsConnectionString string

@description('Deployment environment.')
@allowed(['dev', 'prod'])
param environment string

// ─── Derived values ───────────────────────────────────────────────────────────

var isProduction = environment == 'prod'
var minReplicas = isProduction ? 1 : 0
var maxReplicas = isProduction ? 10 : 3
var cpuCores = isProduction ? '0.5' : '0.25'
var memoryGi = isProduction ? '1Gi' : '0.5Gi'

// ─── Container App ────────────────────────────────────────────────────────────

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
          allowedHeaders: ['*', 'Authorization', 'Content-Type']
          allowCredentials: false
          maxAge: 3600
        }
      }
      registries: [
        {
          server: containerRegistryServer
          username: containerRegistryUsername
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: containerRegistryPassword
        }
        {
          name: 'mongo-uri'
          value: mongoUri
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'todo-api'
          image: containerImage
          resources: {
            cpu: json(cpuCores)
            memory: memoryGi
          }
          env: [
            {
              name: 'PORT'
              value: '8080'
            }
            {
              name: 'MONGO_URI'
              secretRef: 'mongo-uri'
            }
            {
              name: 'NODE_ENV'
              value: isProduction ? 'production' : 'development'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 15
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
              successThreshold: 1
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 5
              successThreshold: 1
            }
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 8080
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 5
              timeoutSeconds: 3
              failureThreshold: 12 // 60s total startup budget
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output fqdn string = containerApp.properties.configuration.ingress.fqdn
output containerAppId string = containerApp.id
output containerAppName string = containerApp.name
