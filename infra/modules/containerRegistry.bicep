/*
  Azure Container Registry
  ========================
  Stores backend Docker images.
  - Dev / Prod → Standard SKU (Basic is deprecated in many regions)

  NOTE: Admin credentials are enabled so Container Apps can pull images
  without a managed identity. Switch to managed identity for stricter
  security posture in future.
*/

@description('Registry name – globally unique, alphanumeric only, 5-50 chars.')
@minLength(5)
@maxLength(50)
param registryName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

@description('Deployment environment.')
@allowed(['dev', 'prod'])
param environment string

// ─── Derived values ───────────────────────────────────────────────────────────

var skuName = 'Standard'

// ─── Resources ───────────────────────────────────────────────────────────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: skuName
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output registryId string = acr.id
output loginServer string = acr.properties.loginServer
output adminUsername string = acr.listCredentials().username
@description('Admin password – treated as a secret in downstream modules.')
output adminPassword string = acr.listCredentials().passwords[0].value
