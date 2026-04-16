/*
  Azure Static Web Apps – React Frontend
  ========================================
  Hosts the Vite-built React SPA.

  - Dev  → Free SKU  (no custom domains, limited staging environments)
  - Prod → Standard SKU (custom domains, unlimited staging environments,
                          linked backend for API proxying)

  API routing:
    On Standard SKU we link the backend Container App so that SWA proxies
    /api/* calls to it automatically (no CORS header required from the browser).
    Free SKU cannot link a backend; the frontend must call the backend URL directly
    (set VITE_API_BASE_URL at build time via the GitHub Actions workflow).

  CI/CD:
    The deploymentToken output should be stored as a GitHub secret named
    AZURE_STATIC_WEB_APPS_API_TOKEN and used by the GitHub Actions workflow.
*/

@description('Static Web App resource name.')
param appName string

@description('Azure region. Note: SWA availability varies – eastus2 is a safe default.')
param location string

@description('Resource tags.')
param tags object

@description('Deployment environment.')
@allowed(['dev', 'prod'])
param environment string

@description('Resource ID of the backend Container App (used to link the backend on Standard SKU).')
param backendContainerAppResourceId string

// ─── Derived values ───────────────────────────────────────────────────────────

var isProd = environment == 'prod'
var skuName = isProd ? 'Standard' : 'Free'
var skuTier = isProd ? 'Standard' : 'Free'

// ─── Static Web App ───────────────────────────────────────────────────────────

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: appName
  // SWA has limited regional availability – eastasia is closest to India
  // Supported: westus2, centralus, eastus2, westeurope, eastasia
  location: 'eastasia'
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      // Paths relative to the repository root
      appLocation: 'client'
      outputLocation: 'dist'
      appBuildCommand: 'npm run build'
      skipGithubActionWorkflowGeneration: true // We manage CI/CD ourselves
    }
  }
}

/*
  Link the backend Container App (Standard SKU only).
  This makes SWA proxy /api/* to the Container App, removing the need for
  the browser to call a different origin (avoids CORS pre-flight on /api routes).

  On Free SKU the linkedBackend resource is skipped.
*/
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = if (isProd) {
  parent: swa
  name: 'backend'
  properties: {
    backendResourceId: backendContainerAppResourceId
    region: location
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output staticWebAppId string = swa.id
output defaultHostname string = 'https://${swa.properties.defaultHostname}'
output deploymentToken string = swa.listSecrets().properties.apiKey
