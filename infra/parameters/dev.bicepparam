// Development environment parameters
// Deploy: az deployment group create -g rg-todots-dev -f infra/main.bicep -p infra/parameters/dev.bicepparam
using '../main.bicep'

param appName = 'todots'
param environment = 'dev'
param location = 'centralindia'
param containerImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

param tags = {
  application: 'todots'
  environment: 'dev'
  managedBy: 'bicep'
  repository: 'TodoTS'
}
