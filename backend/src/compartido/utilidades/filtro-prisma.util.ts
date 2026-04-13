const OPERATOR_MAP: Record<string, string> = {
  $eq: 'equals',
  $ne: 'not',
  $gt: 'gt',
  $gte: 'gte',
  $lt: 'lt',
  $lte: 'lte',
  $in: 'in',
  $nin: 'notIn',
  $null: 'equals',
  $contains: 'contains',
  $startsWith: 'startsWith',
  $endsWith: 'endsWith',
};

// Preserva el caso original para coincidir con el modelo PascalCase de Prisma
const toCamelCase = (str: string): string => {
  return str;
};

const mergeDeep = (target: any, source: any): any => {
  if (!source || typeof source !== 'object') return target;
  const output = { ...(target || {}) };
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = mergeDeep(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
};

const buildNestedObject = (path: string, value: any): any => {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) return value;
  const root: any = {};
  let current = root;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value;
    } else {
      current[segment] = {};
      current = current[segment];
    }
  });
  return root;
};

const FORBIDDEN_KEYS = new Set(['existe', 'exist', 'populate', 'documentId']);

export const normalizarFiltroParaPrisma = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(normalizarFiltroParaPrisma);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, any> = {};

  for (const [key, rawVal] of Object.entries(value)) {
    // IGNORAR FILTROS LEGACY / EXTRAÑOS
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey) || lowerKey.endsWith('_exist') || lowerKey.endsWith('_existe') || lowerKey.startsWith('r_')) {
      continue;
    }
    // 1. Bracket notation: "Cantidad[$lt]" → { cantidad: { lt: 5 } }
    const bracketOpMatch = key.match(/^(.+)\[\$(\w+)\]$/);
    if (bracketOpMatch) {
      const fieldPath = bracketOpMatch[1];
      const operatorKey = '$' + bracketOpMatch[2];
      const mappedOperator = OPERATOR_MAP[operatorKey] || bracketOpMatch[2];
      const normalizedVal = normalizarFiltroParaPrisma(rawVal);
      const nested = buildNestedObject(fieldPath, { [mappedOperator]: normalizedVal });
      Object.assign(output, mergeDeep(output, nested));
      continue;
    }

    // 2. Object with $ operator keys: { Cantidad: { $lt: 5 } } → { cantidad: { lt: 5 } }
    if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
      const keys = Object.keys(rawVal);
      const isOperatorObject = keys.length > 0 && keys.every(k => k.startsWith('$'));
      if (isOperatorObject) {
        const camelKey = key;
        const prismaOps: Record<string, any> = {};
        for (const [op, opVal] of Object.entries(rawVal as Record<string, any>)) {
          const mappedOp = OPERATOR_MAP[op] || op.replace('$', '');
          prismaOps[mappedOp] = opVal;
        }
        if (camelKey.includes('.')) {
          const nested = buildNestedObject(camelKey, prismaOps);
          Object.assign(output, mergeDeep(output, nested));
        } else {
          output[camelKey] = output[camelKey]
            ? mergeDeep(output[camelKey], prismaOps)
            : prismaOps;
        }
        continue;
      }
    }

    // 3. Regular key — convert to camelCase, recurse into value
    const mappedKey = OPERATOR_MAP[key] || key;
    const normalizedVal = normalizarFiltroParaPrisma(rawVal);

    if (mappedKey.includes('.')) {
      const nested = buildNestedObject(mappedKey, normalizedVal);
      Object.assign(output, mergeDeep(output, nested));
      continue;
    }

    if (
      output[mappedKey] &&
      typeof output[mappedKey] === 'object' &&
      typeof normalizedVal === 'object' &&
      !Array.isArray(output[mappedKey]) &&
      !Array.isArray(normalizedVal)
    ) {
      output[mappedKey] = mergeDeep(output[mappedKey], normalizedVal);
    } else {
      output[mappedKey] = normalizedVal;
    }
  }

  return output;
};
