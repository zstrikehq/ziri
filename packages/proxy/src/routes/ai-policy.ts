
import { Router, type Request, type Response } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { chatCompletions } from '../services/llm-service.js'
import { serviceFactory } from '../services/service-factory.js'
import * as providerService from '../services/provider-service.js'
import { logInternalOutcome } from '../utils/internal-audit-helpers.js'

const router: Router = Router()

const CEDAR_PROMPT_TEMPLATE = `You are an expert assistant for Amazon's Cedar policy language. Cedar is a language for defining authorization policies that determine whether a principal (user, role, etc.) should be allowed to perform an action on a resource.

## Cedar Policy Grammar
\`\`\`
Policy := Annotation* Effect Scope Conditions?
Effect := "permit" | "forbid"
Scope := "(" Principal "," Action "," Resource ")"
Conditions := "when" "{" Expr "}" ("unless" "{" Expr "}")?
\`\`\`

### Core Elements
\`\`\`
Principal := PrincipalConstraint
Action := ActionConstraint
Resource := ResourceConstraint

PrincipalConstraint := PrincipalAll | PrincipalEq | PrincipalIn | PrincipalIs
PrincipalAll := "principal"
PrincipalEq := "principal" "==" Entity
PrincipalIn := "principal" "in" (Entity | Expr)
PrincipalIs := "principal" "is" Path ("in" Entity | Expr)?

ActionConstraint := ActionAll | ActionEq | ActionIn
ActionAll := "action"
ActionEq := "action" "==" Entity
ActionIn := "action" "in" (Entity | "[" Entity ("," Entity)* "]")

ResourceConstraint := ResourceAll | ResourceEq | ResourceIn | ResourceIs
ResourceAll := "resource"
ResourceEq := "resource" "==" Entity
ResourceIn := "resource" "in" (Entity | Expr)
ResourceIs := "resource" "is" Path ("in" Entity | Expr)?
\`\`\`

### Expressions
\`\`\`
Expr := Or
Or := And ("||" And)*
And := Equality ("&&" Equality)*
Equality := Relational (("==" | "!=") Relational)*
Relational := Add (("<" | "<=" | ">" | ">=") Add)*
Add := Mult (("+" | "-") Mult)*
Mult := Unary (("*" | "/") Unary)*
Unary := ("!" | "-")* Member
Member := Primary ("." IDENT | "[" Expr "]" | "." IDENT "(" ExprList? ")")*
Primary := LITERAL | VAR | Entity | "(" Expr ")" | "[" ExprList? "]" | "{" RecInits? "}"
\`\`\`

### Literals and Identifiers
\`\`\`
Entity := Path "::" STRING
Path := IDENT ("::" IDENT)*    # IDENTifiers may include namespace components (e.g. ZStrike::Action)
VAR := "principal" | "action" | "resource" | "context"
LITERAL := BOOL | LONG | STRING
ExprList := Expr ("," Expr)*
RecInits := (IDENT | STRING) ":" Expr ("," (IDENT | STRING) ":" Expr)*
\`\`\`

### Built-in Functions

Cedar supports these built-in functions:

- \`\.contains(x)\` - checks if a set contains an element (e.g. [User::"alice"].contains(principal))
- \`\.containsAll(x)\` - checks if a set contains all elements of another set
- \`\.containsAny(x)\` - checks if a set contains any element of another set
- \`has(attr)\` - checks if an entity has an attribute
- \`like(pattern)\` - pattern matching with wildcards (* and ?)
- \`is(type)\` - type checking (e.g. principal is ZStrike::Admin)
- \`decimal(string)\` - creates decimal from string
- \`ip(string)\` - creates IP address from string
- \`datetime(string)\` - creates datetime from string

### Key Concepts

**Principal**: The entity attempting to perform an action (user, role, service, etc.)
**Action**: The operation being attempted (read, write, delete, etc.)
**Resource**: The target of the action (file, database, API endpoint, etc.)
**Context**: Additional information about the request (time, IP address, etc.)

Entities in Cedar can have namespaces. For example, ExampleCo::Database::Table::"id123" has entity type ExampleCo::Database::Table. When referencing entities from the schema, include any namespace prefixes (e.g. ZStrike::Action::"X").

## Policy Examples

### Basic Allow Policy
\`\`\`
permit (
  principal == ZStrike::User::"alice",
  action == ZStrike::Action::"read",
  resource == ZStrike::Document::"doc1"
);
\`\`\`

### Conditional Policy
\`\`\`
permit (
  principal,
  action == ZStrike::Action::"read",
  resource
)
when {
  resource.owner == principal
};
\`\`\`

### Role-Based Policy
\`\`\`
permit (
  principal,
  action in [ZStrike::Action::"read", ZStrike::Action::"write"],
  resource
)
when {
  principal has role && principal.role == "admin"
};
\`\`\`

### Ownership-Based Policy
\`\`\`
permit (
  principal,
  action == ZStrike::Action::"createProject",
  resource
)
when {
  principal.org == resource.org &&
    (principal in resource.org.admins || principal in resource.org.owners)
};
\`\`\`

### Time-Based Policy
\`\`\`
permit (
  principal,
  action,
  resource
)
when {
  context.time >= datetime("2024-01-01T00:00:00Z") &&
  context.time <= datetime("2024-12-31T23:59:59Z")
};
\`\`\`

## Instructions

When generating a Cedar policy, follow these guidelines:

  - Validate Syntax: Ensure the policy matches the grammar exactly.
  - Namespace Qualifiers: Include namespace prefixes for entity types if defined in the schema (e.g. ZStrike::Action not just Action)
  - Check Logic: Verify that permit/forbid decisions match the description. Incorporate any relationships implied by the text (e.g. "in that organization" → principal.org == resource.org).
  - Use the Correct Operators:
    - Use == for equality and != for inequality of values.
    - Use in for membership or hierarchy checks (e.g. principal in resource.org.owners)
    - Only use .contains() in rare cases; prefer in for readability
    - Use is(type) for type checks, and has(attr) to guard attribute access.
  - List Syntax for Multiple: If multiple values are allowed, use in [ ... ]. For example, multiple actions should be listed as action in [ZStrike::Action::"Create", ZStrike::Action::"Update"].
  - Proper Types and Attributes: Ensure all entity references, attributes, and values match types defined in the schema (e.g. String, Long, Bool, Set).
  - Test Scenarios: Consider examples of principals, actions, and resources to ensure edge cases are handled.

## SCHEMA:

{SCHEMA_PLACEHOLDER}

## POLICY DESCRIPTION:

It will be provided by the user.

## REQUIREMENTS:

  1. Generate only the Cedar policy – no explanations, comments, or extra text.
  2. Policy must be plain text (not enclosed in code fences) and end with a semicolon.
  3. Policy must be valid Cedar syntax per the grammar above.
  4. Use permit or forbid as specified by the logic.
  5. Include namespace qualifiers from the schema for entity types.
  6. Use in for membership tests and ==/!= for equality checks as appropriate.
  7. If multiple actions or resources apply, use in [ ... ] list syntax.
  8. Only reference entity types, actions, and attributes that exist in the schema, with correct namespace.
  9. Match data types exactly (e.g. use quotes for strings, no quotes for longs or bools).
  10. If the description implies relationships (e.g. same organization), include those in the when clause.

Generate a syntactically correct and semantically appropriate Cedar policy based on the provided schema and description. Make sure to include namespaces and choose operators (in, ==, etc.) that match the intent.`

router.post('/generate', requireAdmin, async (req: Request, res: Response) => {
  const actionStart = Date.now()
  try {
    const { provider, model, messages, cedarSchema } = req.body

    if (!provider || !model || !messages || !Array.isArray(messages) || messages.length === 0) {
      await logInternalOutcome(req, {
        status: 'failed',
        code: '400',
        message: 'provider, model, and messages are required',
        actionDurationMs: Date.now() - actionStart
      })
      
      res.status(400).json({
        error: 'provider, model, and messages are required',
        code: 'MISSING_FIELDS'
      })
      return
    }


    const configuredProvider = providerService.getProvider(provider)
    if (!configuredProvider) {
      await logInternalOutcome(req, {
        status: 'failed',
        code: '400',
        message: `Provider '${provider}' is not configured`,
        actionDurationMs: Date.now() - actionStart
      })
      
      res.status(400).json({
        error: `Provider '${provider}' is not configured`,
        code: 'PROVIDER_NOT_CONFIGURED'
      })
      return
    }


    let schemaText = cedarSchema
    if (!schemaText) {
      try {
        const schemaStore = serviceFactory.getSchemaStore()
        if (schemaStore.getSchemaAsCedarText) {
          schemaText = await schemaStore.getSchemaAsCedarText()
        } else {
          const schema = await schemaStore.getSchema()
          schemaText = JSON.stringify(schema.schema, null, 2)
        }
      } catch (error: any) {
        await logInternalOutcome(req, {
          status: 'failed',
          code: '500',
          message: 'Failed to retrieve schema',
          actionDurationMs: Date.now() - actionStart
        })
        
        console.error('[AI-POLICY] Failed to get schema:', error)
        res.status(500).json({
          error: 'Failed to retrieve schema',
          code: 'SCHEMA_ERROR'
        })
        return
      }
    }


    const systemMessage = CEDAR_PROMPT_TEMPLATE.replace('{SCHEMA_PLACEHOLDER}', schemaText || 'No schema available')


    const chatMessages = [
      { role: 'system', content: systemMessage },
      ...messages
    ]


    const response = await chatCompletions({
      provider,
      model,
      messages: chatMessages,
      temperature: 0.3,
      max_tokens: 2048
    })


    let policy = ''
    if (response.choices && response.choices.length > 0) {
      policy = response.choices[0].message.content || ''
      

      policy = policy.replace(/^```(?:cedar|policy)?\n?/gm, '').replace(/```$/gm, '').trim()
    }

    await logInternalOutcome(req, {
      status: 'success',
      code: '200',
      message: 'Policy generated successfully',
      actionDurationMs: Date.now() - actionStart
    })

    res.json({
      policy,
      usage: response.usage
    })
  } catch (error: any) {
    await logInternalOutcome(req, {
      status: 'failed',
      code: '500',
      message: error.message || 'Failed to generate policy',
      actionDurationMs: Date.now() - actionStart
    })
    
    console.error('[AI-POLICY] Generate error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate policy',
      code: 'GENERATION_ERROR'
    })
  }
})

export default router
