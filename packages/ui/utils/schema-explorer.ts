export interface NormalizedAttribute {
    name: string
    type: string
    required: boolean
    rawType: RawTypeNode
    children?: NormalizedAttribute[]
  }
  
  export interface NormalizedEntity {
    id: string
    name: string
    namespace: string
    kind: 'entity' | 'enum'
    attributes: NormalizedAttribute[]
    parents: string[]
    tags?: { type: string }
    enumValues?: string[]

    usedInActions: {
      asPrincipal: string[]
      asResource: string[]
    }
    referencedBy: string[]
    parentOf: string[]
  }
  
  export interface NormalizedContextAttribute extends NormalizedAttribute {}
  
  export interface NormalizedAction {
    id: string
    name: string
    namespace: string
    kind: 'action' | 'actionGroup'
    principalTypes: string[]
    resourceTypes: string[]
    contextType?: string
    contextAttributes: NormalizedContextAttribute[]
    memberOf: string[]
    children: string[]
  }
  
  export interface NormalizedCommonType {
    id: string
    name: string
    namespace: string
    type: string
    attributes: NormalizedAttribute[]
    rawType: RawTypeNode
    usedBy: string[]
  }
  
  export interface NormalizedSchema {
    entities: NormalizedEntity[]
    actions: NormalizedAction[]
    commonTypes: NormalizedCommonType[]
    namespaces: string[]
    entityMap: Map<string, NormalizedEntity>
    actionMap: Map<string, NormalizedAction>
    commonTypeMap: Map<string, NormalizedCommonType>
    stats: {
      totalEntities: number
      totalEnums: number
      totalActions: number
      totalActionGroups: number
      totalCommonTypes: number
    }
  }
  

  
  interface RawTypeNode {
    type?: string
    name?: string
    required?: boolean
    attributes?: Record<string, RawTypeNode>
    element?: RawTypeNode
    enum?: string[]
  }
  
  interface RawEntityDef {
    memberOfTypes?: string[]
    shape?: RawTypeNode
    tags?: { type: string }
    enum?: string[]
  }
  
  interface RawActionDef {
    memberOf?: Array<{ id: string; type?: string }>
    appliesTo?: {
      principalTypes?: string[]
      resourceTypes?: string[]
      context?: RawTypeNode
    }
  }
  
  interface RawNamespaceBlock {
    entityTypes?: Record<string, RawEntityDef>
    actions?: Record<string, RawActionDef>
    commonTypes?: Record<string, RawTypeNode>
  }
  
  type RawSchemaJson = Record<string, RawNamespaceBlock>
  

  
  const CEDAR_PRIMITIVES: Record<string, string> = {
    '__cedar::String': 'String',
    '__cedar::Long':   'Long',
    '__cedar::Bool':   'Bool',
    'String': 'String',
    'Long':   'Long',
    'Bool':   'Bool',
  }
  
  const CEDAR_EXTENSIONS: Record<string, string> = {
    '__cedar::ipaddr':   'ipaddr',
    '__cedar::decimal':  'decimal',
    '__cedar::datetime': 'datetime',
    '__cedar::duration': 'duration',
    'ipaddr':   'ipaddr',
    'decimal':  'decimal',
    'datetime': 'datetime',
    'duration': 'duration',
  }
  
  export function resolveDisplayType(node: RawTypeNode | undefined | null): string {
    if (!node || !node.type) return 'Unknown'
  
    const t = node.type
  

    if (t === 'Extension' && node.name) {
      return CEDAR_PRIMITIVES[node.name] || CEDAR_EXTENSIONS[node.name] || cleanTypeName(node.name)
    }
  

    if (t === 'EntityOrCommon' && node.name) {
      return cleanTypeName(node.name)
    }
  

    if (t === 'Entity' && node.name) {
      return cleanTypeName(node.name)
    }
  

    if (t === 'Set' && node.element) {
      return `Set<${resolveDisplayType(node.element)}>`
    }
  

    if (t === 'Record') {
      return 'Record'
    }
  

    if (CEDAR_PRIMITIVES[t]) return CEDAR_PRIMITIVES[t]
    if (CEDAR_EXTENSIONS[t]) return CEDAR_EXTENSIONS[t]
  
    return cleanTypeName(t)
  }
  
  function cleanTypeName(name: string): string {
    return name.replace(/^__cedar::/, '').replace(/^"|"$/g, '')
  }
  
  function cleanAttrKey(key: string): string {
    return key.replace(/^"/, '').replace(/"$/, '')
  }
  

  
  function parseAttributes(attrs: Record<string, RawTypeNode> | undefined): NormalizedAttribute[] {
    if (!attrs) return []
  
    return Object.entries(attrs)
      .map(([rawKey, node]) => {
        const name = cleanAttrKey(rawKey)
        const displayType = resolveDisplayType(node)
        const required = node.required !== false
        const children = node.type === 'Record' && node.attributes
          ? parseAttributes(node.attributes)
          : undefined
  
        return {
          name,
          type: displayType,
          required,
          rawType: node,
          children,
        }
      })
      .sort((a, b) => {

        if (a.required !== b.required) return a.required ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }
  

  
  function qualify(ns: string, name: string): string {
    return ns ? `${ns}::${name}` : name
  }
  

  
  export function parseSchemaJson(raw: RawSchemaJson | null | undefined): NormalizedSchema {
    const entities: NormalizedEntity[] = []
    const actions: NormalizedAction[] = []
    const commonTypes: NormalizedCommonType[] = []
    const namespaces: string[] = []
  
    const entityMap = new Map<string, NormalizedEntity>()
    const actionMap = new Map<string, NormalizedAction>()
    const commonTypeMap = new Map<string, NormalizedCommonType>()
  
    if (!raw || typeof raw !== 'object') {
      return {
        entities, actions, commonTypes, namespaces,
        entityMap, actionMap, commonTypeMap,
        stats: { totalEntities: 0, totalEnums: 0, totalActions: 0, totalActionGroups: 0, totalCommonTypes: 0 },
      }
    }
  

  
    for (const [ns, block] of Object.entries(raw)) {
      if (ns) namespaces.push(ns)
  

      if (block.entityTypes) {
        for (const [name, def] of Object.entries(block.entityTypes)) {
          const id = qualify(ns, name)
          const isEnum = Array.isArray(def.enum) && def.enum.length > 0
  
          const entity: NormalizedEntity = {
            id,
            name,
            namespace: ns,
            kind: isEnum ? 'enum' : 'entity',
            attributes: isEnum ? [] : parseAttributes(def.shape?.attributes),
            parents: (def.memberOfTypes || []).map(p => qualify(ns, p)),
            tags: def.tags ? { type: cleanTypeName(def.tags.type || 'String') } : undefined,
            enumValues: isEnum ? def.enum : undefined,
            usedInActions: { asPrincipal: [], asResource: [] },
            referencedBy: [],
            parentOf: [],
          }
  
          entities.push(entity)
          entityMap.set(id, entity)
        }
      }
  

      if (block.commonTypes) {
        for (const [name, def] of Object.entries(block.commonTypes)) {
          const id = qualify(ns, name)
          const ct: NormalizedCommonType = {
            id,
            name,
            namespace: ns,
            type: resolveDisplayType(def),
            attributes: def.type === 'Record' && def.attributes
              ? parseAttributes(def.attributes)
              : [],
            rawType: def,
            usedBy: [],
          }
          commonTypes.push(ct)
          commonTypeMap.set(id, ct)
        }
      }
  

      if (block.actions) {
        for (const [name, def] of Object.entries(block.actions)) {
          const id = qualify(ns, name)
          const applies = def.appliesTo
          const principalTypes = (applies?.principalTypes || []).map(p => qualify(ns, p))
          const resourceTypes = (applies?.resourceTypes || []).map(r => qualify(ns, r))
  
          const isGroup =
            principalTypes.length === 0 &&
            resourceTypes.length === 0 &&
            !def.appliesTo?.context
  

          let contextType: string | undefined
          let contextAttributes: NormalizedContextAttribute[] = []
  
          if (applies?.context) {
            if (applies.context.type === 'Record' && applies.context.attributes) {
              contextAttributes = parseAttributes(applies.context.attributes)
            } else if (applies.context.type && applies.context.type !== 'Record') {

              contextType = applies.context.type

              const ctId = qualify(ns, applies.context.type)
              const ct = commonTypeMap.get(ctId) || commonTypeMap.get(applies.context.type)
              if (ct) {
                contextAttributes = [...ct.attributes]
              }
            }
          }
  
          const memberOf = (def.memberOf || []).map(m => qualify(ns, m.id))
  
          const action: NormalizedAction = {
            id,
            name,
            namespace: ns,
            kind: isGroup ? 'actionGroup' : 'action',
            principalTypes,
            resourceTypes,
            contextType,
            contextAttributes,
            memberOf,
            children: [],
          }
  
          actions.push(action)
          actionMap.set(id, action)
        }
      }
    }
  

  

    for (const action of actions) {
      for (const pt of action.principalTypes) {
        const entity = entityMap.get(pt)
        if (entity) entity.usedInActions.asPrincipal.push(action.id)
      }
      for (const rt of action.resourceTypes) {
        const entity = entityMap.get(rt)
        if (entity) entity.usedInActions.asResource.push(action.id)
      }
    }
  

    for (const action of actions) {
      for (const parentId of action.memberOf) {
        const parent = actionMap.get(parentId)
        if (parent) parent.children.push(action.id)
      }
    }

    for (const entity of entities) {
      for (const parentId of entity.parents) {
        const parent = entityMap.get(parentId)
        if (parent) parent.parentOf.push(entity.id)
      }
    }

    for (const entity of entities) {
      collectEntityRefs(entity.attributes, entity.id, entityMap)
    }
  

    for (const entity of entities) {
      collectCommonTypeRefs(entity.attributes, entity.id, commonTypeMap, entity.namespace)
    }
    for (const action of actions) {
      if (action.contextType) {
        const ctId = qualify(action.namespace, action.contextType)
        const ct = commonTypeMap.get(ctId) || commonTypeMap.get(action.contextType)
        if (ct && !ct.usedBy.includes(action.id)) ct.usedBy.push(action.id)
      }
    }
  

    entities.sort((a, b) => a.name.localeCompare(b.name))
    actions.sort((a, b) => {

      if (a.kind !== b.kind) return a.kind === 'actionGroup' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    commonTypes.sort((a, b) => a.name.localeCompare(b.name))
  
    const stats = {
      totalEntities: entities.filter(e => e.kind === 'entity').length,
      totalEnums: entities.filter(e => e.kind === 'enum').length,
      totalActions: actions.filter(a => a.kind === 'action').length,
      totalActionGroups: actions.filter(a => a.kind === 'actionGroup').length,
      totalCommonTypes: commonTypes.length,
    }
  
    return {
      entities, actions, commonTypes, namespaces,
      entityMap, actionMap, commonTypeMap,
      stats,
    }
  }
  

  
  function collectEntityRefs(
    attrs: NormalizedAttribute[],
    sourceEntityId: string,
    entityMap: Map<string, NormalizedEntity>
  ) {
    for (const attr of attrs) {
      const rawType = attr.rawType?.type
      if (rawType === 'EntityOrCommon' || rawType === 'Entity') {
        const refName = attr.rawType?.name
        if (refName) {

          for (const [id, entity] of entityMap) {
            if (id === refName || entity.name === refName) {
              if (!entity.referencedBy.includes(sourceEntityId) && id !== sourceEntityId) {
                entity.referencedBy.push(sourceEntityId)
              }
            }
          }
        }
      }

      if (attr.rawType?.type === 'Set' && attr.rawType?.element) {
        const elType = attr.rawType.element.type
        const elName = attr.rawType.element.name
        if ((elType === 'Entity' || elType === 'EntityOrCommon') && elName) {
          for (const [id, entity] of entityMap) {
            if (id === elName || entity.name === elName) {
              if (!entity.referencedBy.includes(sourceEntityId) && id !== sourceEntityId) {
                entity.referencedBy.push(sourceEntityId)
              }
            }
          }
        }
      }

      if (attr.children) {
        collectEntityRefs(attr.children, sourceEntityId, entityMap)
      }
    }
  }
  
  function collectCommonTypeRefs(
    attrs: NormalizedAttribute[],
    sourceId: string,
    commonTypeMap: Map<string, NormalizedCommonType>,
    ns: string
  ) {
    for (const attr of attrs) {
      if (attr.rawType?.type === 'EntityOrCommon' && attr.rawType?.name) {
        const refName = attr.rawType.name
        const ct = commonTypeMap.get(qualify(ns, refName)) || commonTypeMap.get(refName)
        if (ct && !ct.usedBy.includes(sourceId)) {
          ct.usedBy.push(sourceId)
        }
      }
      if (attr.children) {
        collectCommonTypeRefs(attr.children, sourceId, commonTypeMap, ns)
      }
    }
  }
  

  
  export function filterSchema(
    schema: NormalizedSchema,
    query: string
  ): { entities: NormalizedEntity[]; actions: NormalizedAction[]; commonTypes: NormalizedCommonType[] } {
    if (!query.trim()) {
      return {
        entities: schema.entities,
        actions: schema.actions,
        commonTypes: schema.commonTypes,
      }
    }
  
    const q = query.toLowerCase().trim()
  
    const entities = schema.entities.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.attributes.some(a => a.name.toLowerCase().includes(q)) ||
      (e.enumValues || []).some(v => v.toLowerCase().includes(q))
    )
  
    const actions = schema.actions.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.principalTypes.some(p => p.toLowerCase().includes(q)) ||
      a.resourceTypes.some(r => r.toLowerCase().includes(q)) ||
      (a.contextType || '').toLowerCase().includes(q)
    )
  
    const commonTypes = schema.commonTypes.filter(ct =>
      ct.name.toLowerCase().includes(q) ||
      ct.id.toLowerCase().includes(q) ||
      ct.attributes.some(a => a.name.toLowerCase().includes(q))
    )
  
    return { entities, actions, commonTypes }
  }
  
  export function shortName(qualifiedId: string): string {
    const parts = qualifiedId.split('::')
    return parts[parts.length - 1]
  }
  
  export function isEntityRef(attr: NormalizedAttribute): boolean {
    const t = attr.rawType?.type
    return t === 'EntityOrCommon' || t === 'Entity'
  }
  
  export function getEntityRefTarget(attr: NormalizedAttribute, schema: NormalizedSchema): NormalizedEntity | undefined {
    if (!isEntityRef(attr)) return undefined
    const refName = attr.rawType?.name
    if (!refName) return undefined
    return schema.entityMap.get(refName) || schema.entities.find(e => e.name === refName)
  }
  
  export function getCommonTypeRefTarget(attr: NormalizedAttribute, schema: NormalizedSchema): NormalizedCommonType | undefined {
    if (attr.rawType?.type !== 'EntityOrCommon') return undefined
    const refName = attr.rawType?.name
    if (!refName) return undefined
    return schema.commonTypeMap.get(refName) || schema.commonTypes.find(ct => ct.name === refName)
  }