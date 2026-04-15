/*
  Azure Container Apps Environment
  ==================================
  The shared compute environment that hosts all Container Apps.
  Logs are forwarded to Log Analytics via the built-in log sink.
*/

@description('Name of the Container Apps Environment.')
param environmentName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Log Analytics workspace customer ID (used as the log sink destination).')
param logAnalyticsWorkspaceId string

@description('Log Analytics workspace primary shared key.')
@secure()
param logAnalyticsWorkspaceKey string

// ─── Resources ───────────────────────────────────────────────────────────────

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspaceId
        sharedKey: logAnalyticsWorkspaceKey
      }
    }
    // Single-region deployment – set to true and add a second location for HA
    zoneRedundant: false
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output environmentId string = containerAppEnv.id
output environmentName string = containerAppEnv.name
output defaultDomain string = containerAppEnv.properties.defaultDomain
output staticIp string = containerAppEnv.properties.staticIp
