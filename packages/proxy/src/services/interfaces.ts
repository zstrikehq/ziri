// Service interfaces for adapter pattern - all data formats match Backend API responses

import type { Entity } from '../types/entity.js'

// Re-export Entity type for use in other modules
export type { Entity }

/**
 * Authorization decision result
 */
export interface AuthorizationResult {
  decision: 'Allow' | 'Deny'
  diagnostics?: {
    reason?: string[]
    errors?: string[]
  }
  determiningPolicies?: string[]
  evaluationTime?: number
}

/**
 * Authorization request
 */
export interface AuthorizationRequest {
  principal: string  // e.g., "User::\"userId\""
  action: string    // e.g., "Action::\"completion\""
  resource: string   // e.g., "Resource::\"gpt-4\""
  context?: Record<string, any>
}

/**
 * IAuthorizationService - Authorization decision interface
 */
export interface IAuthorizationService {
  /**
   * Authorize a request
   */
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult>
  
  /**
   * Check if authorization service is healthy/available
   */
  isHealthy(): Promise<boolean>
}

/**
 * Policy structure (matches Backend API format)
 */
export interface Policy {
  policy: string  // Cedar policy string
  description: string
}

/**
 * IPolicyStore - Policy CRUD interface
 */
export interface IPolicyStore {
  /**
   * Get all policies
   */
  getPolicies(): Promise<Policy[]>
  
  /**
   * Create a new policy
   */
  createPolicy(policy: string, description: string): Promise<void>
  
  /**
   * Update a policy (by policy string)
   */
  updatePolicy(oldPolicy: string, newPolicy: string, description: string): Promise<void>
  
  /**
   * Delete a policy
   */
  deletePolicy(policy: string): Promise<void>
}

/**
 * IEntityStore - Entity CRUD interface
 * All methods use Backend API response format
 */
export interface IEntityStore {
  /**
   * Get all entities (or filter by UID)
   */
  getEntities(uid?: string, params?: {
    search?: string
    limit?: number
    offset?: number
    entityType?: string
    sortBy?: string | null
    sortOrder?: 'asc' | 'desc' | null
  }): Promise<{ data: Entity[]; total: number }>
  
  /**
   * Create an entity
   */
  createEntity(entity: Entity, status: number): Promise<void>
  
  /**
   * Update an entity (full entity body required, same as create)
   */
  updateEntity(entity: Entity, status: number): Promise<void>
  
  /**
   * Delete an entity by UID name
   */
  deleteEntity(entityName: string): Promise<void>
}

/**
 * Schema structure (matches Backend API format)
 */
export interface SchemaData {
  schema: {
    [namespace: string]: {
      entityTypes?: Record<string, any>
      actions?: Record<string, any>
      commonTypes?: Record<string, any>
    }
  }
  version: string
}

/**
 * ISchemaStore - Schema management interface
 */
export interface ISchemaStore {
  /**
   * Get current schema
   */
  getSchema(): Promise<SchemaData>
  
  /**
   * Update schema
   */
  updateSchema(schema: SchemaData['schema']): Promise<SchemaData>
  
  /**
   * Get schema as Cedar text format (optional helper method)
   */
  getSchemaAsCedarText?(): Promise<string>
}
