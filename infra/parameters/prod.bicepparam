// Production environment parameters
// Deploy: az deployment group create -g rg-todots-prod -f infra/main.bicep -p infra/parameters/prod.bicepparam
using '../main.bicep'

param appName = 'todots'
param environment = 'prod'
param location = 'centralindia'
param containerImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

param tags = {
  application: 'todots'
  environment: 'prod'
  managedBy: 'bicep'
  repository: 'TodoTS'
}
