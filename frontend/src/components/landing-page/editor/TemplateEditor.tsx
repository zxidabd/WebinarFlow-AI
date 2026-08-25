'use client';

import { useState } from 'react';
import { getTemplate, getAllTemplates } from '../templates/registry';
import type { TemplateDefinition, TemplateSection } from '../templates/registry';
import LandingPageRenderer from '../LandingPageRenderer';

interface Props {
  initialState?: {
    template: string;
    sections: Record<string, any>;
  };
  onSave: (data: { template: string; sections: Record<string, any> }) => void;
  onCancel: () => void;
  webinarId?: string;
  isPaid?: boolean;
  priceCents?: number;
  currency?: string;
  paymentGateway?: string;
}

function FieldEditor({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  const val = value ?? field.default ?? '';

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
          value={val}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case 'image':
      return (
        <div className="space-y-2">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
            value={val}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder || 'URL to image'}
          />
          {val && <img src={val} alt="" className="h-16 rounded border object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
      );
    case 'color':
      return (
        <div className="flex items-center gap-3">
          <input type="color" value={val || '#000000'} onChange={e => onChange(e.target.value)} className="h-9 w-9 rounded border border-gray-200 cursor-pointer" />
          <input type="text" className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none font-mono" value={val} onChange={e => onChange(e.target.value)} />
        </div>
      );
    case 'select':
      return (
        <select
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
          value={val}
          onChange={e => onChange(e.target.value)}
        >
          {field.options?.map((o: any) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case 'array':
      return (
        <div className="space-y-2">
          {(Array.isArray(val) ? val : []).map((item: any, idx: number) => (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{idx + 1}</span>
                <button onClick={() => {
                  const next = [...val];
                  next.splice(idx, 1);
                  onChange(next);
                }} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              {field.fields?.map((sub: any) => (
                <div key={sub.key} className="mb-2">
                  <label className="block text-xs text-gray-500 mb-0.5">{sub.label}</label>
                  <FieldEditor
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v: any) => {
                      const next = [...val];
                      next[idx] = { ...next[idx], [sub.key]: v };
                      onChange(next);
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
          <button
            onClick={() => onChange([...val, {}])}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Add Item
          </button>
        </div>
      );
    default:
      return (
        <input
          type="text"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
          value={val}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }
}

function SectionEditor({ section, data, onChange }: { section: TemplateSection; data: any; onChange: (v: any) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-gray-900">{section.icon} {section.name}</h3>
      <div className="space-y-4">
        {section.fields.map((field) => {
          const key = field.key;
          return (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              <FieldEditor
                field={field}
                value={data?.[key]}
                onChange={(v: any) => onChange({ ...data, [key]: v })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TemplateEditor({ initialState, onSave, onCancel, webinarId, isPaid, priceCents, currency, paymentGateway }: Props) {
  const [templateId, setTemplateId] = useState(initialState?.template || 'modern-saas');
  const [sections, setSections] = useState<Record<string, any>>(initialState?.sections || {});
  const [tab, setTab] = useState<string | null>(null);

  const template = getTemplate(templateId);

  const handleTemplateChange = (newId: string) => {
    const tpl = getTemplate(newId);
    if (!tpl) return;
    setTemplateId(newId);
    setSections(tpl.defaults);
    setTab(tpl.sections[0]?.id || null);
  };

  if (!template) {
    return (
      <div className="p-6 text-center text-gray-400">
        Template not found: {templateId}
      </div>
    );
  }

  const activeTab = tab || template.sections[0]?.id;
  const activeSection = template.sections.find(s => s.id === activeTab);
  const activeData = activeTab ? sections[activeTab] || {} : {};

  return (
    <div className="flex h-full gap-6">
      {/* Left: Editor form */}
      <div className="w-96 shrink-0 overflow-y-auto space-y-4 border-r border-gray-100 pr-6">
        {/* Template selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Template</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
            value={templateId}
            onChange={e => handleTemplateChange(e.target.value)}
          >
            {getAllTemplates().map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-1">
          {template.sections.map(s => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === s.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Active section fields */}
        {activeSection && (
          <SectionEditor
            section={activeSection}
            data={activeData}
            onChange={(v: any) => setSections({ ...sections, [activeTab!]: v })}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={() => onSave({ template: templateId, sections })}
            className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Right: Live preview */}
      <div className="flex-1 overflow-y-auto bg-gray-100 rounded-xl">
        <div className="sticky top-0 bg-gray-100 px-4 py-2 text-xs text-gray-400 border-b border-gray-200">
          Preview
        </div>
        <LandingPageRenderer
          content={{ template: templateId, sections }}
          webinarId={webinarId}
          preview
          isPaid={isPaid}
          priceCents={priceCents}
          currency={currency}
          paymentGateway={paymentGateway}
        />
      </div>
    </div>
  );
}
