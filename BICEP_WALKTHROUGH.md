# Bicep Walkthrough — Infrastructure as Code

A complete guide to Azure Bicep concepts, explained using the TodoTS project infrastructure.

---

## 1. What is Bicep?

Bicep is Azure's **domain-specific language (DSL)** for deploying Azure resources. It's a cleaner, more readable alternative to ARM JSON templates. Bicep files compile down to ARM templates, but you never have to write JSON.

---

## 2. Target Scope

**File: `main.bicep` — Line 18**

```bicep
targetScope = 'subscription'
```

Every Bicep file has a **target scope** — it tells Azure *where* this template deploys. Options:
- `resourceGroup` (default) — deploys resources into an existing RG
- `subscription` — can create resource groups themselves
- `managementGroup` / `tenant` — for org-wide policies

We use `subscription` so Bicep creates the resource group for us — one command deploys everything.

---

## 3. Parameters (`param`)

**File: `main.bicep` — Lines 22-43**

```bicep
@description('Short application name used as a prefix for all resource names.')
@minLength(2)
@maxLength(10)
param appName string = 'todots'

@allowed(['dev', 'prod'])
param environment string = 'dev'

param location string = 'centralindia'
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
param tags object = { ... }
```

Parameters are **inputs** to your template — like function arguments. Key concepts:
- **Types**: `string`, `int`, `bool`, `object`, `array`
- **Default values**: `= 'todots'` — used when no value is passed
- **Decorators**: `@description`, `@minLength`, `@maxLength`, `@allowed` — add validation and documentation
- **`@allowed`**: Restricts values to a whitelist — here only `'dev'` or `'prod'`

### The `@secure()` decorator

**File: `modules/containerAppEnvironment.bicep` — Line 21**

```bicep
@secure()
param logAnalyticsWorkspaceKey string
```

`@secure()` tells Azure to **never log or display** this value in deployment outputs or portal history — used for passwords, keys, connection strings.

---

## 4. Variables (`var`)

**File: `main.bicep` — Lines 47-50**

```bicep
var prefix = '${appName}-${environment}'
var resourceGroupName = 'rg-${prefix}'
var acrName = '${replace(appName, '-', '')}${environment}acr'
```

Variables are **computed values** — derived from parameters or other variables. They:
- Cannot be passed in from outside (unlike params)
- Support **string interpolation**: `'${appName}-${environment}'` → `'todots-dev'`
- Support **built-in functions**: `replace(appName, '-', '')` strips hyphens

### Conditional variables (ternary operator)

**File: `modules/containerApp.bicep` — Lines 61-65**

```bicep
var isProduction = environment == 'prod'
var minReplicas = isProduction ? 1 : 0    // scale-to-zero in dev
var maxReplicas = isProduction ? 10 : 3
var cpuCores = isProduction ? '0.5' : '0.25'
var memoryGi = isProduction ? '1Gi' : '0.5Gi'
```

The **ternary operator** (`condition ? trueValue : falseValue`) lets you configure differently per environment from the same template.

---

## 5. Resources

**File: `modules/logAnalytics.bicep` — Lines 19-36**

```bicep
resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}
```

This is the core of Bicep — a **resource declaration**. Anatomy:
- **`resource workspace`** — symbolic name (used to reference this resource elsewhere in Bicep)
- **`'Microsoft.OperationalInsights/workspaces@2023-09-01'`** — the resource type and API version
- **`name`** — the actual Azure resource name
- **`location`**, **`tags`** — standard properties
- **`properties`** — resource-specific configuration

---

## 6. Resource References & Implicit Dependencies

**File: `modules/logAnalytics.bicep` — Lines 38-49**

```bicep
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${workspaceName}-ai'
  ...
  properties: {
    WorkspaceResourceId: workspace.id    // references the workspace above
  }
}
```

When you reference `workspace.id`, Bicep **automatically knows** that App Insights depends on the workspace. It deploys them in the correct order. No need to write `dependsOn` — Bicep figures it out.

---

## 7. Parent-Child Resources

**File: `modules/cosmosdb.bicep` — Lines 106-154**

```bicep
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: accountName
  ...
}

resource mongoDatabase 'Microsoft.DocumentDB/databaseAccounts/mongodbDatabases@2024-05-15' = {
  parent: cosmosAccount          // child of the account
  name: databaseName
  ...
}

resource todosCollection '...mongodbDatabases/collections@2024-05-15' = {
  parent: mongoDatabase          // child of the database
  name: collectionName
  ...
}
```

Azure resources form hierarchies — an account contains databases, databases contain collections. The **`parent`** keyword establishes this relationship. Bicep ensures the parent is created before the child.

---

## 8. Conditional Resources

**File: `modules/staticWebApp.bicep` — Lines 75-82**

```bicep
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = if (isProd) {
  parent: swa
  name: 'backend'
  properties: {
    backendResourceId: backendContainerAppResourceId
  }
}
```

The **`if (condition)`** after `=` makes a resource **conditional** — this linked backend only gets created in production. In dev (Free SKU), it's skipped entirely. The resource doesn't exist at all, not just disabled.

---

## 9. Outputs

**File: `main.bicep` — Lines 124-146**

```bicep
output acrLoginServer string = acr.outputs.loginServer
output backendUrl string = 'https://${containerApp.outputs.fqdn}'
output frontendUrl string = staticWebApp.outputs.defaultHostname
output swaDeploymentToken string = staticWebApp.outputs.deploymentToken
```

Outputs are **return values** from your deployment. Used to:
- Pass values to CI/CD pipelines (e.g., the deployment token to a GitHub secret)
- Chain deployments together
- Display info after `az deployment sub create`

### Runtime functions in outputs

**File: `modules/containerRegistry.bicep` — Lines 50-53**

```bicep
output loginServer string = acr.properties.loginServer
output adminUsername string = acr.listCredentials().username
output adminPassword string = acr.listCredentials().passwords[0].value
```

`listCredentials()` and `listKeys()` are **runtime functions** — they call the Azure API at deploy time to retrieve secrets that only exist after the resource is created.

---

## 10. Modules — The Key to Organizing Bicep

**File: `main.bicep` — Lines 58-122**

```bicep
module logAnalytics 'modules/logAnalytics.bicep' = {
  name: 'deploy-logAnalytics'
  scope: rg
  params: {
    workspaceName: '${prefix}-law'
    location: location
    tags: tags
  }
}
```

Modules are **reusable Bicep files** called from a parent file. Think of them as functions:
- **`'modules/logAnalytics.bicep'`** — path to the module file
- **`name`** — the deployment name (visible in Azure Portal under Deployments)
- **`scope: rg`** — deploy this module into our resource group (needed because main.bicep is subscription-scoped)
- **`params`** — pass values into the module's parameters

### Module output chaining

```bicep
module containerAppEnv 'modules/containerAppEnvironment.bicep' = {
  params: {
    logAnalyticsWorkspaceId: logAnalytics.outputs.workspaceCustomerId   // output from another module
    logAnalyticsWorkspaceKey: logAnalytics.outputs.workspacePrimaryKey
  }
}
```

One module's outputs become another module's inputs. Bicep resolves the dependency graph automatically.

---

## 11. Scope

**File: `main.bicep` — Lines 55-60**

```bicep
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module logAnalytics 'modules/logAnalytics.bicep' = {
  scope: rg      // deploy into the resource group we just created
  ...
}
```

Since `main.bicep` is subscription-scoped, each module needs **`scope: rg`** to target the resource group. This is how a single subscription-level deployment creates the RG and all resources inside it.

---

## 12. Secrets Management

**File: `modules/containerApp.bicep` — Lines 95-122**

```bicep
// Declare secrets inside the Container App
secrets: [
  { name: 'acr-password', value: containerRegistryPassword }
  { name: 'mongo-uri', value: mongoUri }
]

// Reference secrets in environment variables
env: [
  { name: 'MONGO_URI', secretRef: 'mongo-uri' }    // reference by name, not value
]
```

Secrets are stored in the Container App's secret store. Environment variables use **`secretRef`** instead of `value` — Azure injects the secret at runtime without exposing it in logs or the portal.

---

## 13. Parameter Files (`.bicepparam`)

**File: `parameters/dev.bicepparam`**

```bicep
using '../main.bicep'

param appName = 'todots'
param environment = 'dev'
param location = 'centralindia'
param containerImage = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
```

Parameter files provide **environment-specific values** without changing the template. You have:
- `dev.bicepparam` — smaller resources, serverless DB, scale-to-zero
- `prod.bicepparam` — bigger resources, provisioned throughput, minimum 1 replica

Same Bicep code, different configurations. The **`using`** keyword points to which template these params belong to.

---

## 14. The Deployment Command

```bash
# One command deploys EVERYTHING — RG + 10 resources
az deployment sub create \
  --location centralindia \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam

# Override a single parameter (e.g., after pushing a new image)
az deployment sub create \
  --location centralindia \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --parameters containerImage=todotsdevacr.azurecr.io/todo-api:v1.0.0
```

---

## 15. Project Structure

```
infra/
├── main.bicep                          # Orchestrator (subscription scope)
│   ├── Creates: Resource Group
│   ├── Calls: 6 modules
│   └── Outputs: URLs, tokens, connection strings
├── main.bicepparam                     # Default parameters
├── parameters/
│   ├── dev.bicepparam                  # Dev: serverless, scale-to-zero, Free SKU
│   └── prod.bicepparam                 # Prod: provisioned, HA, Standard SKU
└── modules/
    ├── logAnalytics.bicep              # Log Analytics + App Insights
    ├── containerRegistry.bicep         # ACR (Docker image storage)
    ├── cosmosdb.bicep                  # Cosmos DB + Database + Collection
    ├── containerAppEnvironment.bicep   # Shared compute environment
    ├── containerApp.bicep              # Backend API container
    └── staticWebApp.bicep              # React frontend hosting
```

---

## 16. Concepts Cheat Sheet

| Concept | Example | File |
|---|---|---|
| `targetScope` | `subscription` | main.bicep:18 |
| `param` with decorators | `@allowed`, `@minLength`, `@secure()` | main.bicep:22, containerAppEnv.bicep:21 |
| `var` with ternary | `isProduction ? 1 : 0` | containerApp.bicep:62 |
| String interpolation | `'${appName}-${environment}'` | main.bicep:48 |
| Built-in functions | `replace()`, `json()` | main.bicep:50, containerApp.bicep:113 |
| Resource declaration | `resource workspace '...@version' = {}` | logAnalytics.bicep:19 |
| Implicit dependencies | `workspace.id` auto-orders deployment | logAnalytics.bicep:45 |
| Parent-child | `parent: cosmosAccount` | cosmosdb.bicep:107 |
| Conditional resources | `= if (isProd)` | staticWebApp.bicep:75 |
| Modules | `module acr 'modules/acr.bicep'` | main.bicep:63 |
| Module output chaining | `logAnalytics.outputs.workspaceCustomerId` | main.bicep:92 |
| Scope | `scope: rg` | main.bicep:60 |
| Outputs | `output backendUrl string = ...` | main.bicep:133 |
| Runtime functions | `listKeys()`, `listCredentials()` | cosmosdb.bicep:158, acr.bicep:51 |
| Parameter files | `using '../main.bicep'` | dev.bicepparam:3 |
| Secrets | `secretRef: 'mongo-uri'` | containerApp.bicep:122 |
