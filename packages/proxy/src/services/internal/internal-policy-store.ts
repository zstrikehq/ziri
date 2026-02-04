import { getDatabase } from '../../db/index.js'
import { internalPolicies } from '../../authorization/internal/internal-policies.js'

export interface InternalPolicy {
  policy: string
  description?: string
}

export interface IInternalPolicyStore {
  getPolicies(): Promise<InternalPolicy[]>
  updatePolicies(policies: string[]): Promise<void>
  shouldUpdatePolicies(): Promise<{ shouldUpdate: boolean; filePolicies: string[]; dbPolicies: string[] }>
}

export class InternalPolicyStore implements IInternalPolicyStore {
  async getPolicies(): Promise<InternalPolicy[]> {
    const db = getDatabase()
    
    const rows = db.prepare(`
      SELECT content, description 
      FROM internal_schema_policy 
      WHERE obj_type = 'policy' AND status = 1
      ORDER BY created_at ASC
    `).all() as any[]
    
    if (rows.length === 0) {

      return internalPolicies.map(policy => ({
        policy,
        description: 'Internal authorization policy'
      }))
    }
    
    return rows.map(row => ({
      policy: row.content,
      description: row.description || ''
    }))
  }
  
  async updatePolicies(policies: string[]): Promise<void> {
    const db = getDatabase()
    const { randomBytes } = await import('crypto')
    

    db.prepare(`
      UPDATE internal_schema_policy
      SET status = 0, updated_at = datetime('now')
      WHERE obj_type = 'policy' AND status = 1
    `).run()
    

    const insertStmt = db.prepare(`
      INSERT INTO internal_schema_policy (id, obj_type, content, description, status)
      VALUES (?, 'policy', ?, ?, 1)
    `)
    
    for (const policy of policies) {
      const policyId = `internal-policy-${randomBytes(8).toString('hex')}`
      insertStmt.run(policyId, policy, 'Internal authorization policy')
    }
  }
  
  async shouldUpdatePolicies(): Promise<{ shouldUpdate: boolean; filePolicies: string[]; dbPolicies: string[] }> {
    const db = getDatabase()
    
    const rows = db.prepare(`
      SELECT content 
      FROM internal_schema_policy 
      WHERE obj_type = 'policy' AND status = 1
      ORDER BY created_at ASC
    `).all() as any[]
    
    const filePolicies = internalPolicies.map(p => p.trim()).sort()
    const dbPolicies = rows.map((r: any) => r.content.trim()).sort()
    

    const shouldUpdate = 
      filePolicies.length !== dbPolicies.length ||
      filePolicies.some((fp, idx) => fp !== dbPolicies[idx])
    
    return {
      shouldUpdate,
      filePolicies: internalPolicies,
      dbPolicies: rows.map((r: any) => r.content)
    }
  }
}

export const internalPolicyStore = new InternalPolicyStore()
