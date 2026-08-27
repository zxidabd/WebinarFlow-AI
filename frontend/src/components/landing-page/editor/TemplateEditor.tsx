'use client';

import { useState } from 'react';
import { getTemplate, getAllTemplates, extractTemplateDefaults } from '../templates/registry';
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
            onClick={() => onChange([...(Array.isArray(val) ? val : []), {}])}
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900 text-base">{section.name}</h3>
      <div className="space-y-4">
        {section.fields.map((field) => {
          const key = field.key;
          return (
            <div key={key}>
              <label className="mb-1 block text-xs font-semibold text-gray-700">{field.label}</label>
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
  const template = getTemplate(templateId) || getTemplate('modern-saas')!;

  const [sections, setSections] = useState<Record<string, any>>(() => {
    const initial = initialState?.sections || {};
    const tpl = getTemplate(initialState?.template || 'modern-saas') || getTemplate('modern-saas')!;
    const defaults = extractTemplateDefaults(tpl);
    const merged: Record<string, any> = {};
    for (const s of tpl.sections) {
      merged[s.id] = { ...(defaults[s.id] || {}), ...(initial[s.id] || {}) };
    }
    return merged;
  });

  const [tab, setTab] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'both' | 'edit' | 'preview'>('both');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const handleTemplateChange = (newId: string) => {
    const tpl = getTemplate(newId);
    if (!tpl) return;
    setTemplateId(newId);
    const defaults = extractTemplateDefaults(tpl);
    setSections(defaults);
    setTab(tpl.sections[0]?.id || null);
  };

  if (!template) {
    return (
      <div className="p-6 text-center text-gray-400">
        Template not found: {templateId}
      </div>
    );
  }

  const allDefaults = extractTemplateDefaults(template);
  const activeTab = tab || template.sections[0]?.id;
  const activeSection = template.sections.find(s => s.id === activeTab);
  const activeData = activeTab
    ? { ...(allDefaults[activeTab] || {}), ...(sections[activeTab] || {}) }
    : {};

  const handleSectionChange = (newSectionData: any) => {
    if (!activeTab) return;
    setSections(prev => ({
      ...prev,
      [activeTab]: newSectionData,
    }));
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Mobile View Toggle Bar (visible only on mobile/tablet screens < lg) */}
      <div className="flex lg:hidden items-center justify-between bg-white border border-gray-200 rounded-xl p-2 shadow-sm sticky top-0 z-20">
        <span className="text-xs font-semibold text-gray-700 pl-2">View Mode:</span>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMobileViewMode('edit')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              mobileViewMode === 'edit'
                ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ✏️ Edit Only
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('both')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              mobileViewMode === 'both'
                ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📑 Both (Stacked)
          </button>
          <button
            type="button"
            onClick={() => setMobileViewMode('preview')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              mobileViewMode === 'preview'
                ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Main Container: Flex-col on mobile (stacked), Flex-row on Desktop */}
      <div className="flex flex-col lg:flex-row h-full gap-6">
        {/* Editor Form Panel */}
        <div
          className={`w-full lg:w-96 lg:shrink-0 overflow-y-auto space-y-4 lg:border-r lg:border-gray-100 lg:pr-6 ${
            mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Template selector */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Template</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
              value={templateId}
              onChange={e => handleTemplateChange(e.target.value)}
            >
              {getAllTemplates().map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Section tabs */}
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-gray-100 rounded-xl">
            {template.sections.map(s => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === s.id
                    ? 'bg-white text-indigo-600 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
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
              onChange={handleSectionChange}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 sticky bottom-0 bg-white/95 backdrop-blur py-3 border-t border-gray-100 lg:border-none lg:static">
            <button
              onClick={() => onSave({ template: templateId, sections })}
              className="flex-1 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Live Preview Panel (Stacked Below on Mobile, Side-by-Side on Desktop) */}
        <div
          className={`w-full flex-1 overflow-y-auto bg-gray-100 rounded-xl border border-gray-200 min-h-[500px] ${
            mobileViewMode === 'edit' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Header with Live Status & Device Switcher */}
          <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur px-4 py-2 text-xs text-gray-600 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-gray-700">Live Landing Page Preview</span>
              <span className="text-gray-400 hidden sm:inline">(Updates as you type)</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-2 py-0.5 text-xs rounded ${previewDevice === 'desktop' ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-500'}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2 py-0.5 text-xs rounded ${previewDevice === 'mobile' ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-500'}`}
              >
                Mobile View
              </button>
            </div>
          </div>

          <div className={`p-2 transition-all ${previewDevice === 'mobile' ? 'max-w-sm mx-auto shadow-2xl my-4 rounded-3xl overflow-hidden border-4 border-gray-800' : 'w-full'}`}>
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
      </div>
    </div>
  );
}
