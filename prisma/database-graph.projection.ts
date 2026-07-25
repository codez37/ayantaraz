import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SCHEMA_PATH = join(ROOT, 'prisma', 'schema.prisma');
const OUTPUT_PATH = join(ROOT, 'prisma', 'database-graph.projection.json');

const schema = readFileSync(SCHEMA_PATH, 'utf8');

type Token = { type: 'enum' | 'model' | 'attribute' | 'field' | 'comment'; value: string };
type FieldNode = { name: string; type: string; optional: boolean; array: boolean; attributes: string[] };
type AttributeNode = { name: string; args: string[] };
type EnumNode = { name: string; values: string[] };
type ModelNode = { name: string; fields: FieldNode[]; attributes: AttributeNode[] };

const nodes: (EnumNode | ModelNode)[] = [];
const lines = schema.split('\n');

let i = 0;
while (i < lines.length) {
  const line = lines[i].trim();
  if (line.startsWith('enum ')) {
    const name = line.slice(5, line.indexOf('{')).trim();
    const values: string[] = [];
    i++;
    while (i < lines.length && !lines[i].trim().startsWith('}')) {
      const v = lines[i].trim().replace(/[,\s]/g, '');
      if (v) values.push(v);
      i++;
    }
    nodes.push({ type: 'enum', name, values });
  } else if (line.startsWith('model ')) {
    const name = line.slice(6, line.indexOf('{')).trim();
    const fields: FieldNode[] = [];
    const attributes: AttributeNode[] = [];
    i++;
    while (i < lines.length && !lines[i].trim().startsWith('}')) {
      const f = lines[i].trim();
      if (!f || f.startsWith('//') || f.startsWith('@@')) {
        if (f.startsWith('@@')) {
          const paren = f.indexOf('(');
          const attr: AttributeNode = { name: paren > 0 ? f.slice(2, paren) : f.slice(2), args: [] };
          if (paren > 0) {
            attr.args = f
              .slice(paren + 1, f.lastIndexOf(')'))
              .split(',')
              .map((a) => a.trim().replace(/"/g, ''));
          }
          attributes.push(attr);
        }
        i++;
        continue;
      }
      const parts = f.split(/\s+/);
      if (parts.length >= 2) {
        const field: FieldNode = {
          name: parts[0],
          type: parts[1].replace('?', '').replace('[]', ''),
          optional: parts[1].includes('?'),
          array: parts[1].includes('[]'),
          attributes: [],
        };
        const attrStart = f.indexOf('@');
        if (attrStart > 0) {
          field.attributes = f
            .slice(attrStart)
            .split(/@(?=[a-zA-Z])/)
            .filter(Boolean)
            .map((a) => '@' + a.trim());
        }
        fields.push(field);
      }
      i++;
    }
    nodes.push({ type: 'model', name, fields, attributes });
  }
  i++;
}

const output = JSON.stringify(nodes, null, 2);
writeFileSync(OUTPUT_PATH, output, 'utf8');
