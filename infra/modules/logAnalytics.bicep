/*
  Log Analytics Workspace + Application Insights
  ================================================
  Provides centralised logging for Container Apps and
  performance/availability monitoring via App Insights.
*/

@description('Name of the Log Analytics workspace.')
param workspaceName string

@description('Azure region.')
param location string

@description('Resource tags.')
param tags object

// ─── Resources ───────────────────────────────────────────────────────────────

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      // 1 GB/day cap – adjust or remove for prod
      dailyQuotaGb: 1
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${workspaceName}-ai'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    RetentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

// customerId == workspace ID string used by Container Apps log sink
output workspaceCustomerId string = workspace.properties.customerId
output workspacePrimaryKey string = workspace.listKeys().primarySharedKey
output workspaceResourceId string = workspace.id
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
