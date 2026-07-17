import React, { useEffect, useState } from 'react';
import { Save, Loader2, Building, Landmark, Image as ImageIcon, FileText, Settings as SettingsIcon, Layout, Mail, CreditCard, Share2, Upload, Eye } from 'lucide-react';
import { api } from '../lib/api';
import { Settings } from '../types';

const TABS = [
  { id: 'company', label: 'Company Info', icon: Building },
  { id: 'bank', label: 'Bank Details', icon: Landmark },
  { id: 'branding', label: 'Invoice Branding', icon: Layout },
  { id: 'invoice', label: 'Invoice Settings', icon: FileText },
  { id: 'gst', label: 'GST Settings', icon: SettingsIcon },
  { id: 'quotation', label: 'Quotation Settings', icon: FileText },
  { id: 'email', label: 'Email Settings', icon: Mail },
  { id: 'payment', label: 'Payment Details', icon: CreditCard },
  { id: 'social', label: 'Social Links', icon: Share2 },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'preview', label: 'Live Preview', icon: Eye },
];

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await api.getSettings();
      // Ensure JSON fields are parsed if they come back as strings, though Supabase handles JSONB
      const cleanData = { ...data };
      if (typeof cleanData.accepted_payments === 'string') {
        try { cleanData.accepted_payments = JSON.parse(cleanData.accepted_payments); } catch { cleanData.accepted_payments = []; }
      }
      if (typeof cleanData.social_links === 'string') {
        try { cleanData.social_links = JSON.parse(cleanData.social_links); } catch { cleanData.social_links = {}; }
      }
      
      if (!cleanData.accepted_payments) cleanData.accepted_payments = [];
      if (!cleanData.social_links) cleanData.social_links = {};

      setSettings(cleanData);
    } catch {
      setToast({ msg: 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setToast({ msg: 'Settings updated successfully', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to save settings. Make sure you have run the Supabase schema migration.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (field: keyof Settings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleCheckboxChange = (field: keyof Settings, checked: boolean) => {
    handleChange(field, checked);
  };

  const handleArrayToggle = (field: keyof Settings, item: string) => {
    if (!settings) return;
    const currentArray = (settings[field] as any[]) || [];
    if (currentArray.includes(item)) {
      handleChange(field, currentArray.filter(i => i !== item));
    } else {
      handleChange(field, [...currentArray, item]);
    }
  };

  const handleObjectChange = (field: keyof Settings, key: string, value: string) => {
    if (!settings) return;
    const currentObj = (settings[field] as any) || {};
    handleChange(field, { ...currentObj, [key]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Settings) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output as jpeg/png based on transparency need. For signature/stamp we might need PNG
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(type, 0.85);
        handleChange(field, dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;
  }

  // Common UI helpers
  const renderInput = (label: string, field: keyof Settings, type: string = 'text', placeholder: string = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={(settings[field] as string) || ''} onChange={e => handleChange(field, e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
    </div>
  );

  const renderTextarea = (label: string, field: keyof Settings, rows: number = 3) => (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <textarea value={(settings[field] as string) || ''} onChange={e => handleChange(field, e.target.value)} rows={rows} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 resize-none" />
    </div>
  );

  const renderSelect = (label: string, field: keyof Settings, options: string[]) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select value={(settings[field] as string) || ''} onChange={e => handleChange(field, e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20">
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const renderToggle = (label: string, field: keyof Settings) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={Boolean(settings[field])} onChange={e => handleCheckboxChange(field, e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );

  const renderUploadBox = (label: string, field: keyof Settings) => (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
      <label className="cursor-pointer block">
        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, field)} />
        {settings[field] ? (
          <div className="relative group">
            <img src={settings[field] as string} alt={label} className="mx-auto max-h-32 object-contain" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
              <span className="text-white text-sm font-medium">Change Image</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-slate-400" />
            <div className="text-sm font-medium text-slate-700">Click to upload {label}</div>
            <div className="text-xs text-slate-500">PNG, JPG up to 2MB</div>
          </div>
        )}
      </label>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 h-full overflow-y-auto shrink-0 py-4">
        <div className="px-6 mb-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Configuration</h2>
        </div>
        <nav className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{TABS.find(t => t.id === activeTab)?.label}</h1>
                <p className="text-slate-500 text-sm mt-1">Manage configuration and preferences</p>
              </div>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              
              {/* SECTION 1: Company Info */}
              {activeTab === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput('Company Name', 'company_name')}
                  {renderInput('Legal Business Name', 'legal_name')}
                  {renderInput('Brand Name', 'brand_name')}
                  {renderInput('Business Type', 'business_type', 'text', 'e.g. IT Services, Software Development')}
                  
                  <div className="col-span-2"><hr className="border-slate-100" /></div>
                  
                  {renderInput('GSTIN', 'gstin')}
                  {renderInput('PAN Number', 'pan')}
                  {renderInput('CIN Number', 'cin')}
                  {renderInput('MSME Registration No', 'msme_no')}
                  {renderInput('Startup India No', 'startup_no')}
                  {renderInput('IEC Code', 'iec_code')}

                  <div className="col-span-2"><hr className="border-slate-100" /></div>
                  
                  {renderTextarea('Registered Address', 'address')}
                  {renderInput('City', 'city')}
                  {renderInput('State', 'state')}
                  {renderInput('Country', 'country')}
                  {renderInput('Pincode', 'pincode')}

                  <div className="col-span-2"><hr className="border-slate-100" /></div>

                  {renderInput('Mobile Number', 'phone')}
                  {renderInput('Alternate Number', 'alt_phone')}
                  {renderInput('Support Email', 'support_email', 'email')}
                  {renderInput('Accounts Email', 'accounts_email', 'email')}
                  {renderInput('Website', 'website', 'url')}
                </div>
              )}

              {/* SECTION 2: Bank Details */}
              {activeTab === 'bank' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput('Bank Name', 'bank_name')}
                  {renderInput('Account Holder Name', 'bank_account_name')}
                  {renderInput('Account Number', 'bank_account_number')}
                  {renderInput('IFSC Code', 'ifsc')}
                  {renderInput('Branch', 'branch')}
                  {renderInput('UPI ID', 'upi_id')}
                  {renderInput('Swift Code', 'swift_code')}
                  {renderInput('IBAN', 'iban')}
                </div>
              )}

              {/* SECTION 3: Branding */}
              {activeTab === 'branding' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Theme Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={(settings.theme_color_primary as string) || '#1E3A8A'} onChange={e => handleChange('theme_color_primary', e.target.value)} className="h-10 w-10 rounded cursor-pointer border border-slate-300" />
                        <input type="text" value={(settings.theme_color_primary as string) || '#1E3A8A'} onChange={e => handleChange('theme_color_primary', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Secondary Theme Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={(settings.theme_color_secondary as string) || '#2563EB'} onChange={e => handleChange('theme_color_secondary', e.target.value)} className="h-10 w-10 rounded cursor-pointer border border-slate-300" />
                        <input type="text" value={(settings.theme_color_secondary as string) || '#2563EB'} onChange={e => handleChange('theme_color_secondary', e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
                      </div>
                    </div>
                    {renderSelect('Font Family', 'font_family', ['Helvetica', 'Courier', 'Times-Roman', 'Inter', 'Roboto'])}
                    {renderSelect('Invoice Layout', 'invoice_layout', ['Classic', 'Modern', 'Corporate', 'Minimal'])}
                  </div>
                </div>
              )}

              {/* SECTION 4: Invoice Settings */}
              {activeTab === 'invoice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput('Invoice Prefix', 'invoice_prefix', 'text', 'e.g. INV-')}
                  {renderInput('Starting Invoice Number', 'invoice_start_no', 'text', 'e.g. 00001')}
                  {renderInput('Invoice Number Padding', 'invoice_padding', 'number')}
                  {renderInput('Default Currency', 'currency', 'text', 'e.g. INR')}
                  {renderInput('Default GST Rate (%)', 'default_gst_rate', 'number')}
                  {renderInput('Payment Terms', 'payment_terms', 'text', 'e.g. Immediate, Net 15, Net 30')}
                  {renderInput('Default Place of Supply', 'place_of_supply')}
                  
                  <div className="col-span-2"><hr className="border-slate-100" /></div>
                  
                  {renderTextarea('Invoice Footer Text', 'invoice_footer', 2)}
                  {renderTextarea('Invoice Notes', 'invoice_notes', 2)}
                  {renderTextarea('Declaration', 'declaration_text', 3)}

                  <div className="col-span-2"><hr className="border-slate-100" /></div>
                  <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {renderToggle('Reverse Charge', 'reverse_charge')}
                    {renderToggle('Round Off Total', 'round_off')}
                    {renderToggle('Show Amount in Words', 'show_amount_in_words')}
                    {renderToggle('Enable QR Code', 'enable_qr')}
                    {renderToggle('Enable Signature', 'enable_signature')}
                    {renderToggle('Enable Company Stamp', 'enable_stamp')}
                    {renderToggle('Enable Logo', 'enable_logo')}
                  </div>
                </div>
              )}

              {/* SECTION 5: GST Settings */}
              {activeTab === 'gst' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSelect('GST Type', 'gst_type', ['Auto', 'CGST + SGST', 'IGST'])}
                  {renderSelect('GST Registration Type', 'gst_reg_type', ['Regular', 'Composition', 'Unregistered'])}
                  {renderInput('Default SAC Code', 'default_sac')}
                  {renderInput('Default HSN Code', 'default_hsn')}
                </div>
              )}

              {/* SECTION 6: Quotation Settings */}
              {activeTab === 'quotation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput('Quotation Prefix', 'quotation_prefix', 'text', 'e.g. QTN-')}
                  {renderInput('Expiry Days', 'quotation_expiry_days', 'number')}
                  {renderTextarea('Default Terms', 'quotation_terms', 3)}
                  {renderTextarea('Default Notes', 'quotation_notes', 2)}
                  <div className="col-span-2 grid grid-cols-3 gap-4">
                    {renderToggle('Show Logo', 'quote_show_logo')}
                    {renderToggle('Show Signature', 'quote_show_signature')}
                    {renderToggle('Show Stamp', 'quote_show_stamp')}
                  </div>
                </div>
              )}

              {/* SECTION 7: Email Settings */}
              {activeTab === 'email' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderInput('Sender Email', 'sender_email', 'email')}
                  {renderInput('Reply Email', 'reply_email', 'email')}
                  {renderInput('BCC Email', 'bcc_email', 'email')}
                  {renderTextarea('Email Signature', 'email_signature', 4)}
                </div>
              )}

              {/* SECTION 8: Payment Details */}
              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Accepted Payment Methods</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Cash', 'UPI', 'Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'Cheque'].map(method => (
                        <label key={method} className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                          <input 
                            type="checkbox" 
                            checked={((settings.accepted_payments as string[]) || []).includes(method)} 
                            onChange={() => handleArrayToggle('accepted_payments', method)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300"
                          />
                          <span className="text-sm font-medium text-slate-700">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 9: Social Links */}
              {activeTab === 'social' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['Website', 'LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'YouTube'].map(platform => (
                    <div key={platform}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{platform}</label>
                      <input 
                        type="url" 
                        value={settings.social_links?.[platform.toLowerCase()] || ''}
                        onChange={e => handleObjectChange('social_links', platform.toLowerCase(), e.target.value)}
                        placeholder={`https://${platform.toLowerCase()}.com/`}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* SECTION 10: Uploads */}
              {activeTab === 'uploads' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {renderUploadBox('Company Logo', 'logo_url')}
                  {renderUploadBox('Favicon', 'favicon_url')}
                  {renderUploadBox('Digital Signature', 'signature_url')}
                  {renderUploadBox('Company Stamp', 'stamp_url')}
                  {renderUploadBox('QR Code', 'qr_url')}
                  {renderUploadBox('Letterhead Background', 'letterhead_url')}
                </div>
              )}

              {/* SECTION 11: Preview */}
              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-4 rounded-lg">
                    <p className="text-sm">This is a live mockup based on your current unsaved configuration.</p>
                  </div>
                  
                  {/* Mock Invoice Preview Canvas */}
                  <div className="bg-white border shadow-xl mx-auto rounded overflow-hidden" style={{ width: '210mm', minHeight: '297mm', transformOrigin: 'top center', transform: 'scale(0.8)' }}>
                    <div className="p-10" style={{ fontFamily: settings.font_family || 'sans-serif' }}>
                      <div className="flex justify-between items-start mb-12">
                        <div>
                          {settings.enable_logo && settings.logo_url && (
                            <img src={settings.logo_url} alt="Logo" className="max-h-16 mb-4" />
                          )}
                          <h1 className="text-2xl font-bold" style={{ color: settings.theme_color_primary || '#1E3A8A' }}>
                            {settings.company_name || 'Your Company Name'}
                          </h1>
                          <p className="text-sm text-gray-500 mt-2 max-w-xs">{settings.address || 'Company Address'}</p>
                          <p className="text-xs text-gray-500 mt-1 font-bold">GSTIN: {settings.gstin || 'XXXXXXXXXXXXXXX'}</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-3xl font-bold" style={{ color: settings.theme_color_primary || '#1E3A8A' }}>TAX INVOICE</h2>
                          <div className="mt-4 text-sm">
                            <p className="font-bold">INV NO: {settings.invoice_prefix || 'INV-'}{settings.invoice_start_no || '00001'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="border p-4 rounded-lg" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                          <h3 className="font-bold mb-2" style={{ color: settings.theme_color_primary || '#1E3A8A' }}>BILL TO</h3>
                          <p className="text-sm font-bold text-gray-800">Client Name</p>
                          <p className="text-sm text-gray-600">Client Address</p>
                        </div>
                        <div className="border p-4 rounded-lg" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                          <h3 className="font-bold mb-2" style={{ color: settings.theme_color_primary || '#1E3A8A' }}>PROJECT DETAILS</h3>
                          <p className="text-sm text-gray-600">Sample Software Project</p>
                        </div>
                      </div>

                      <table className="w-full text-left text-sm mb-8 border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: settings.theme_color_primary || '#1E3A8A', color: 'white' }}>
                            <th className="p-3 border">Description</th>
                            <th className="p-3 border">SAC</th>
                            <th className="p-3 border">Rate</th>
                            <th className="p-3 border">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-3 border">Software Development Service</td>
                            <td className="p-3 border">{settings.default_sac || '998314'}</td>
                            <td className="p-3 border">10,000</td>
                            <td className="p-3 border">10,000</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="flex justify-between items-end mt-20">
                        <div className="w-1/2">
                           <p className="text-xs font-bold" style={{ color: settings.theme_color_primary }}>DECLARATION</p>
                           <p className="text-xs text-gray-600 mb-4">{settings.declaration_text}</p>
                        </div>
                        <div className="text-center">
                          {settings.enable_stamp && settings.stamp_url && (
                            <img src={settings.stamp_url} alt="Stamp" className="w-24 h-24 mx-auto mb-2 opacity-80" />
                          )}
                          {settings.enable_signature && settings.signature_url && (
                            <img src={settings.signature_url} alt="Signature" className="h-12 mx-auto mb-2" />
                          )}
                          <p className="text-sm border-t pt-2">Authorized Signatory</p>
                        </div>
                      </div>

                      <div className="text-center mt-12 pt-4 border-t text-sm font-bold" style={{ color: settings.theme_color_primary }}>
                        {settings.invoice_footer}
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
