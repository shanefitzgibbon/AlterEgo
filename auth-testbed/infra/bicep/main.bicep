@description('Deployment location')
param location string = resourceGroup().location

@description('Container registry login server')
param registryServer string

@description('Container image tag (single image running different SITE values)')
param imageTag string = 'latest'

@description('Key Vault resource ID used for secret references')
param keyVaultResourceId string

var siteNames = [
  'site-a'
  'site-b-auth'
  'site-b-app'
  'site-b-api'
  'site-c-idp'
  'site-c-rp'
  'site-d'
  'site-e-api'
  'site-f'
]

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'auth-testbed-env'
  location: location
  properties: {}
}

resource containerApps 'Microsoft.App/containerApps@2024-03-01' = [for site in siteNames: {
  name: 'auth-${site}'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      secrets: [
        {
          name: 'site-c-client-secret'
          keyVaultUrl: '${keyVaultResourceId}/secrets/site-c-client-secret'
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'app'
          image: '${registryServer}/auth-testbed:${imageTag}'
          env: [
            { name: 'PORT', value: '8080' }
            { name: 'SITE', value: site }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}]
