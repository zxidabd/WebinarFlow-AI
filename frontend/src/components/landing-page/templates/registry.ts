/** Landing Page Template System
 *
 * Each template defines its sections and editable fields.
 * The Editor reads the template definition and renders form fields.
 * The Renderer reads the template + content and renders the page.
 * New templates can be added as new files in this directory and registered below.
 */

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image' | 'color' | 'select' | 'array' | 'richtext' | 'number';
  options?: { label: string; value: string }[];
  default?: any;
  placeholder?: string;
  fields?: TemplateField[]; // for array items
}

export interface TemplateSection {
  id: string;
  name: string;
  icon: string;
  fields: TemplateField[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  preview: string;
  thumbnail: string;
  sections: TemplateSection[];
  defaults: Record<string, any>;
  colors: string[];
  fonts: { heading: string; body: string };
}

import { modernSaaS } from './modern-saas';
import { corporate } from './corporate';
import { education } from './education';

export const TEMPLATES: Record<string, TemplateDefinition> = {
  'modern-saas': modernSaaS,
  'corporate': corporate,
  'education': education,
};

export function getTemplate(id: string): TemplateDefinition | null {
  return TEMPLATES[id] ?? null;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES);
}

export function extractTemplateDefaults(template: TemplateDefinition): Record<string, any> {
  const result: Record<string, any> = {};
  for (const section of template.sections) {
    const secDefaults: Record<string, any> = {};
    for (const field of section.fields) {
      if (field.default !== undefined) {
        secDefaults[field.key] = field.default;
      }
    }
    const manualDefaults = template.defaults?.[section.id] || {};
    for (const [k, v] of Object.entries(manualDefaults)) {
      if (v !== '' && (Array.isArray(v) ? v.length > 0 : true)) {
        secDefaults[k] = v;
      }
    }
    result[section.id] = secDefaults;
  }
  return result;
}