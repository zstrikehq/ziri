import type { IAuthorizationService, IPolicyStore, IEntityStore, ISchemaStore } from './interfaces.js'
import { LocalAuthorizationService } from './local/local-authorization-service.js'
import { localPolicyStore } from './local/local-policy-store.js'
import { localEntityStore } from './local/local-entity-store.js'
import { localSchemaStore } from './local/local-schema-store.js'

class ServiceFactory {
  private readonly authorizationService: IAuthorizationService
  private readonly policyStore: IPolicyStore
  private readonly entityStore: IEntityStore
  private readonly schemaStore: ISchemaStore

  constructor() {
    this.authorizationService = new LocalAuthorizationService()
    this.policyStore = localPolicyStore
    this.entityStore = localEntityStore
    this.schemaStore = localSchemaStore
  }

  initialize(): void {
    // kept for backward compatibility with older startup paths
  }

  getAuthorizationService(): IAuthorizationService {
    return this.authorizationService
  }

  getPolicyStore(): IPolicyStore {
    return this.policyStore
  }

  getEntityStore(): IEntityStore {
    return this.entityStore
  }

  getSchemaStore(): ISchemaStore {
    return this.schemaStore
  }
}

export const serviceFactory = new ServiceFactory()
