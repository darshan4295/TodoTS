// Default parameters for local / ad-hoc deployments.
// For environment-specific values use infra/parameters/dev.bicepparam or prod.bicepparam.
using 'main.bicep'

param appName = 'todots'
param environment = 'dev'
param location = 'centralindia'

// Replace with a real image after the first `docker build + push` to ACR.
// Example: param containerImage = 'todotsdevacr.azurecr.io/todo-api:latest'
param containerImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
