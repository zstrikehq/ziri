// Test file for Cedar WASM integration
// Tests authorization with hardcoded schema, policies, and entities

import type * as cedarType from '@cedar-policy/cedar-wasm/nodejs'

/**
 * Load Cedar WASM module
 */
async function loadCedar(): Promise<typeof cedarType> {
  console.log('[TEST] Loading Cedar WASM module...')
  const cedar = await import('@cedar-policy/cedar-wasm/nodejs')
  console.log('[TEST] ✅ Cedar WASM loaded successfully')
  return cedar
}

/**
 * Hardcoded Cedar text schema (will be converted to JSON via Cedar WASM)
 */
const hardcodedCedarTextSchema = `
type RequestContext = {
  "ip_address": __cedar::ipaddr,
  "request_time": __cedar::String,
  "hour": __cedar::Long,
  "model_name": __cedar::String,
  "model_provider": __cedar::String,
  "is_emergency": __cedar::Bool,
  "day_of_week": __cedar::String,
};

entity Resource;

entity User {
  "security_clearance": __cedar::Long,
  "last_monthly_reset": __cedar::String,
  "daily_spend_limit": __cedar::decimal,
  "role": __cedar::String,
  "created_at": __cedar::String,
  "team"?: __cedar::String,
  "training_completed": __cedar::Bool,
  "user_id": __cedar::String,
  "current_daily_spend": __cedar::decimal,
  "monthly_spend_limit": __cedar::decimal,
  "years_of_service": __cedar::decimal,
  "allowed_ip_ranges": Set<__cedar::ipaddr>,
  "last_daily_reset": __cedar::String,
  "name": __cedar::String,
  "current_monthly_spend": __cedar::decimal,
  "department": __cedar::String,
  "email": __cedar::String,
  "status": __cedar::String,
};

action "completion" appliesTo {
  principal: [User],
  resource: [Resource],
  context: RequestContext
};

action "fine_tuning" appliesTo {
  principal: [User],
  resource: [Resource],
  context: RequestContext
};

action "image_generation" appliesTo {
  principal: [User],
  resource: [Resource],
  context: RequestContext
};

action "embedding" appliesTo {
  principal: [User],
  resource: [Resource],
  context: RequestContext
};

action "moderation" appliesTo {
  principal: [User],
  resource: [Resource],
  context: RequestContext
};
`

/**
 * Hardcoded policies
 */
const hardcodedPolicies = [
  'permit(principal, action, resource) when { principal.status == "active" };'
]

/**
 * Hardcoded entities
 */
const hardcodedEntities = [
  {
    uid: {
      type: 'User',
      id: 'test-user-123'
    },
    attrs: {
      status: 'active',
      role: 'user',
      email: 'test@example.com',
      name: 'Test User',
      user_id: 'test-user-123',
      security_clearance: 1,
      daily_spend_limit: { __extn: { fn: 'decimal', arg: '1000.00' } },
      monthly_spend_limit: { __extn: { fn: 'decimal', arg: '10000.00' } },
      current_daily_spend: { __extn: { fn: 'decimal', arg: '0.00' } },
      current_monthly_spend: { __extn: { fn: 'decimal', arg: '0.00' } },
      years_of_service: { __extn: { fn: 'decimal', arg: '1.0' } },
      training_completed: true,
      created_at: '2024-01-01T00:00:00Z',
      last_daily_reset: '2024-01-01T00:00:00Z',
      last_monthly_reset: '2024-01-01T00:00:00Z',
      department: 'Engineering',
      allowed_ip_ranges: []
    },
    parents: []
  }
]

/**
 * Parse EntityUID string to object format
 */
function parseEntityUid(entityUid: string): { type: string; id: string } {
  const match = entityUid.match(/^([^:]+)::"([^"]+)"$/)
  if (!match) {
    throw new Error(`Invalid EntityUID format: ${entityUid}`)
  }
  return {
    type: match[1],
    id: match[2]
  }
}

/**
 * Main test function
 */
async function testCedarWasm(): Promise<void> {
  console.log('\n' + '='.repeat(80))
  console.log('CEDAR WASM INTEGRATION TEST')
  console.log('='.repeat(80) + '\n')

  try {
    // Load Cedar WASM
    const cedar = await loadCedar()
    console.log('\n')

    // Log Cedar text schema
    console.log('[TEST] 📋 CEDAR TEXT SCHEMA:')
    console.log(hardcodedCedarTextSchema)
    console.log('\n')

    // Convert Cedar text schema to JSON
    console.log('[TEST] 🔄 Converting Cedar text schema to JSON...')
    const schemaConversion = cedar.schemaToJson(hardcodedCedarTextSchema)
    
    if (schemaConversion.type === 'failure') {
      console.error('[TEST] ❌ Schema conversion failed:')
      console.error(JSON.stringify(schemaConversion.errors, null, 2))
      return
    }
    
    const hardcodedSchema = schemaConversion.json
    console.log('[TEST] ✅ Schema converted to JSON successfully')
    console.log('\n')

    // Log converted JSON schema
    console.log('[TEST] 📋 CONVERTED JSON SCHEMA:')
    console.log(JSON.stringify(hardcodedSchema, null, 2))
    console.log('\n')

    // Validate schema
    console.log('[TEST] 🔍 Validating converted schema...')
    const schemaValidation = cedar.checkParseSchema(hardcodedSchema)
    if (schemaValidation.type === 'failure') {
      console.error('[TEST] ❌ Schema validation failed:')
      console.error(JSON.stringify(schemaValidation.errors, null, 2))
      return
    }
    console.log('[TEST] ✅ Schema validation passed')
    console.log('\n')

    // Log policies
    console.log('[TEST] 📜 POLICIES:')
    hardcodedPolicies.forEach((policy, idx) => {
      console.log(`Policy ${idx + 1}:`)
      console.log(policy)
      console.log('')
    })
    console.log('\n')

    // Log entities
    console.log('[TEST] 👥 ENTITIES:')
    console.log(JSON.stringify(hardcodedEntities, null, 2))
    console.log('\n')

    // Prepare authorization request
    const principal = 'User::"test-user-123"'
    const action = 'Action::"QueryLLM"'
    const resource = 'Resource::"gpt-4"'

    console.log('[TEST] 🎯 AUTHORIZATION REQUEST:')
    console.log(`  Principal: ${principal}`)
    console.log(`  Action: ${action}`)
    console.log(`  Resource: ${resource}`)
    console.log('\n')

    // Parse EntityUIDs
    const parsePrincipal = parseEntityUid(principal)
    const parseAction = parseEntityUid(action)
    const parseResource = parseEntityUid(resource)

    console.log('[TEST] 📦 PARSED ENTITY UIDs:')
    console.log(`  Principal:`, parsePrincipal)
    console.log(`  Action:`, parseAction)
    console.log(`  Resource:`, parseResource)
    console.log('\n')

    // Prepare context
    const context = {
      ip_address: {
        __extn: {
          fn: 'ip',
          arg: '192.168.1.1'
        }
      },
      request_time: '2024-01-15T10:30:00Z',
      hour: 10,
      model_name: 'gpt-4',
      is_emergency: false,
      day_of_week: 'Monday'
    }

    console.log('[TEST] 📝 CONTEXT:')
    console.log(JSON.stringify(context, null, 2))
    console.log('\n')

    // Prepare policies map
    const policiesMap: Record<string, string> = {}
    hardcodedPolicies.forEach((policy, idx) => {
      policiesMap[`policy${idx + 1}`] = policy
    })

    console.log('[TEST] 📚 POLICIES MAP:')
    console.log(JSON.stringify(policiesMap, null, 2))
    console.log('\n')

    // Build authorization call
    const authorizationCall: cedarType.AuthorizationCall = {
      principal: parsePrincipal,
      action: parseAction,
      resource: parseResource,
      context: context,
      schema: hardcodedSchema,
      policies: {
        staticPolicies: policiesMap
      },
      entities: hardcodedEntities
    }

    console.log('[TEST] 🚀 AUTHORIZATION CALL OBJECT:')
    console.log(JSON.stringify(authorizationCall, null, 2))
    console.log('\n')

    // Make authorization call
    console.log('[TEST] ⚡ Calling Cedar WASM isAuthorized...')
    const startTime = Date.now()
    const result = cedar.isAuthorized(authorizationCall)
    const evaluationTime = Date.now() - startTime

    console.log(`[TEST] ⏱️  Evaluation time: ${evaluationTime}ms`)
    console.log('\n')

    // Log result
    console.log('[TEST] 📊 AUTHORIZATION RESULT:')
    console.log(JSON.stringify(result, null, 2))
    console.log('\n')

    // Parse result
    if (result.type === 'failure') {
      console.error('[TEST] ❌ AUTHORIZATION FAILED:')
      result.errors.forEach((error: any, idx: number) => {
        console.error(`  Error ${idx + 1}:`, error.message || JSON.stringify(error))
      })
    } else {
      const response = result.response
      const decision = response.decision === 'allow' ? 'ALLOW' : 'DENY'
      
      console.log('[TEST] ✅ AUTHORIZATION DECISION:', decision)
      console.log('\n')
      
      if (response.diagnostics) {
        console.log('[TEST] 🔍 DIAGNOSTICS:')
        if (response.diagnostics.reason && response.diagnostics.reason.length > 0) {
          console.log('  Reasons:')
          response.diagnostics.reason.forEach((reason: string, idx: number) => {
            console.log(`    ${idx + 1}. ${reason}`)
          })
        }
        if (response.diagnostics.errors && response.diagnostics.errors.length > 0) {
          console.log('  Errors:')
          response.diagnostics.errors.forEach((error: string, idx: number) => {
            console.log(`    ${idx + 1}. ${error}`)
          })
        }
        console.log('\n')
      }
      
      if (response.determiningPolicies && response.determiningPolicies.length > 0) {
        console.log('[TEST] 📋 DETERMINING POLICIES:')
        response.determiningPolicies.forEach((policyId: string, idx: number) => {
          console.log(`  ${idx + 1}. ${policyId}`)
        })
        console.log('\n')
      }
    }

    console.log('='.repeat(80))
    console.log('TEST COMPLETE')
    console.log('='.repeat(80) + '\n')

  } catch (error: any) {
    console.error('\n[TEST] ❌ TEST FAILED WITH ERROR:')
    console.error('  Message:', error.message)
    console.error('  Stack:', error.stack)
    console.error('\n')
  }
}

// Run the test
testCedarWasm()
  .then(() => {
    console.log('[TEST] Test execution completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[TEST] Test execution failed:', error)
    process.exit(1)
  })
