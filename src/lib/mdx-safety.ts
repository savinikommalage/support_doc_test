import { compile } from '@mdx-js/mdx';

const ALLOWED_COMPONENTS = new Set([
  'Callout',
  'Cards',
  'Card',
  'Steps',
  'Step',
  'Tabs',
  'Tab',
  'Accordions',
  'Accordion',
  'Mermaid',
]);

interface MdxNode {
  type: string;
  name?: string | null;
  attributes?: { type: string; value?: unknown }[];
  data?: { estree?: EstreeProgram };
  position?: { start: { line: number } };
  children?: MdxNode[];
}

interface EstreeProgram {
  body: { type: string; expression?: EstreeNode }[];
}

interface EstreeNode {
  type: string;
  expressions?: unknown[];
  elements?: (EstreeNode | null)[];
  properties?: { type: string; computed?: boolean; value?: EstreeNode }[];
  operator?: string;
  argument?: EstreeNode;
}

class UnsafeMdx extends Error {}

function isPlainValue(node: EstreeNode | null | undefined): boolean {
  if (!node) return false;
  switch (node.type) {
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return node.expressions?.length === 0;
    case 'ArrayExpression':
      return (node.elements ?? []).every(isPlainValue);
    case 'ObjectExpression':
      return (node.properties ?? []).every((p) => p.type === 'Property' && !p.computed && isPlainValue(p.value));
    case 'UnaryExpression':
      return node.operator === '-' && node.argument?.type === 'Literal';
    default:
      return false;
  }
}

function isPlainExpression(estree: EstreeProgram | undefined): boolean {
  if (!estree) return false;
  if (estree.body.length === 0) return true;
  return estree.body.length === 1 && estree.body[0].type === 'ExpressionStatement' && isPlainValue(estree.body[0].expression);
}

function rejectUnsafe() {
  return (tree: MdxNode) => {
    const walk = (node: MdxNode) => {
      const at = node.position ? `line ${node.position.start.line}: ` : '';
      if (node.type === 'mdxjsEsm') throw new UnsafeMdx(`${at}import and export are not allowed`);
      if ((node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') && !isPlainExpression(node.data?.estree)) {
        throw new UnsafeMdx(`${at}{ } runs code, which pages cannot use. Put the text in backticks instead`);
      }
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        if (node.name && /^[A-Z]/.test(node.name) && !ALLOWED_COMPONENTS.has(node.name)) {
          throw new UnsafeMdx(`${at}<${node.name}> is not a component pages can use`);
        }
        for (const attribute of node.attributes ?? []) {
          const value = attribute.value as MdxNode | null | undefined;
          if (
            attribute.type === 'mdxJsxExpressionAttribute' ||
            (value && typeof value === 'object' && !isPlainExpression(value.data?.estree))
          ) {
            throw new UnsafeMdx(`${at}<${node.name}> has an attribute that runs code`);
          }
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

export async function findMdxProblem(body: string): Promise<string | null> {
  try {
    await compile(body, { remarkPlugins: [rejectUnsafe] });
    return null;
  } catch (error) {
    const unsafe = error instanceof UnsafeMdx ? error : (error as { cause?: unknown }).cause;
    if (unsafe instanceof UnsafeMdx) return `The page cannot be saved: ${unsafe.message}.`;
    const detail = error as { message?: string; line?: number; place?: { line?: number } };
    const line = detail.line ?? detail.place?.line;
    const message = (detail.message ?? 'unknown error').split('\n')[0];
    return `The page would not build${line ? ` (line ${line})` : ''}: ${message}. A bare < or { in text must be written as \`<\` or inside backticks.`;
  }
}
