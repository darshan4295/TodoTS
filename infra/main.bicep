/*
  TodoTS – Azure Infrastructure (Bicep)
  ======================================
  Deploys the full stack at subscription scope:
    • Resource Group
    • Log Analytics Workspace + Application Insights
    • Azure Container Registry (ACR)
    • Azure Cosmos DB for MongoDB API
    • Container Apps Environment + Container App (backend API)
    • Azure Static Web Apps (React frontend)

  Deployment:
    az deployment sub create \
      --location centralindia \
      -f infra/main.bicep \
      -p infra/parameters/dev.bicepparam
*/

targetScope = 'subscription'

// ─── Parameters ──────────────────────────────────────────────────────────────

@description('Short application name used as a prefix for all resource names.')
@minLength(2)
@maxLength(10)
param appName string = 'todots'

@description('Deployment environment.')
@allowed(['dev', 'prod'])
param environment string = 'dev'

@description('Azure region for all resources.')
param location string = 'centralindia'

@description('Container image to run in the backend Container App (e.g. myacr.azurecr.io/todo-api:v1.0.0). Use the placeholder default for the very first deployment before an image has been pushed.')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Tags applied to every resource.')
param tags object = {
  application: appName
  environment: environment
  managedBy: 'bicep'
  repository: 'TodoTS'
}

// ─── Derived names ───────────────────────────────────────────────────────────

var prefix = '${appName}-${environment}'
var resourceGroupName = 'rg-${prefix}'
// ACR names must be globally unique and alphanumeric only
var acrName = '${replace(appName, '-', '')}${environment}acr'

// ─── Resource Group ─────────────────────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// ─── Modules ─────────────────────────────────────────────────────────────────

module logAnalytics 'modules/logAnalytics.bicep' = {
  name: 'deploy-logAnalytics'
  scope: rg
  params: {
    workspaceName: '${prefix}-law'
    location: location
    tags: tags
  }
}

module acr 'modules/containerRegistry.bicep' = {
  name: 'deploy-acr'
  scope: rg
  params: {
    registryName: acrName
    location: location
    tags: tags
    environment: environment
  }
}

module cosmosdb 'modules/cosmosdb.bicep' = {
  name: 'deploy-cosmosdb'
  scope: rg
  params: {
    accountName: '${prefix}-cosmos'
    databaseName: 'todoapp'
    collectionName: 'todos'
    location: location
    tags: tags
    environment: environment
  }
}

module containerAppEnv 'modules/containerAppEnvironment.bicep' = {
  name: 'deploy-containerAppEnv'
  scope: rg
  params: {
    environmentName: '${prefix}-cae'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceCustomerId
    logAnalyticsWorkspaceKey: logAnalytics.outputs.workspacePrimaryKey
  }
}

module containerApp 'modules/containerApp.bicep' = {
  name: 'deploy-containerApp'
  scope: rg
  params: {
    appName: '${prefix}-api'
    location: location
    tags: tags
    containerAppEnvironmentId: containerAppEnv.outputs.environmentId
    containerImage: containerImage
    containerRegistryServer: acr.outputs.loginServer
    containerRegistryUsername: acr.outputs.adminUsername
    containerRegistryPassword: acr.outputs.adminPassword
    mongoUri: cosmosdb.outputs.mongoUriWithDb
    appInsightsConnectionString: logAnalytics.outputs.appInsightsConnectionString
    environment: environment
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'deploy-staticWebApp'
  scope: rg
  params: {
    appName: '${prefix}-swa'
    location: location
    tags: tags
    environment: environment
    backendContainerAppResourceId: containerApp.outputs.containerAppId
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

@description('Resource group name created by this deployment.')
output resourceGroupName string = rg.name

@description('Azure Container Registry login server – use this as the image prefix when pushing.')
output acrLoginServer string = acr.outputs.loginServer

@description('Push an image: docker push <acrLoginServer>/todo-api:<tag>')
output dockerPushCommand string = 'docker push ${acr.outputs.loginServer}/todo-api:<tag>'

@description('Backend API URL (HTTPS).')
output backendUrl string = 'https://${containerApp.outputs.fqdn}'

@description('Frontend URL (Azure Static Web Apps).')
output frontendUrl string = staticWebApp.outputs.defaultHostname

@description('Cosmos DB account name.')
output cosmosDbAccountName string = cosmosdb.outputs.accountName

@description('Application Insights connection string (safe to expose to the frontend).')
output appInsightsConnectionString string = logAnalytics.outputs.appInsightsConnectionString

@description('Static Web Apps deployment token – store this as a GitHub secret named AZURE_STATIC_WEB_APPS_API_TOKEN.')
output swaDeploymentToken string = staticWebApp.outputs.deploymentToken
