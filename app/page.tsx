"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const TRANSPORT_FACTORS: Record<string, number> = { truck: 0.15, rail: 0.02, ship: 0.015 };
const safeNum = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string') val = val.replace(/,/g, ''); 
  const parsed = parseFloat(val);
  return Number.isNaN(parsed) ? fallback : parsed;
};
const CSI_DIVISIONS = ["Div 03: Concrete", "Div 04: Masonry", "Div 05: Metals", "Div 06: Wood, Plastics, and Composites", "Div 07: Thermal and Moisture Protection", "Div 08: Openings", "Div 09: Finishes", "Div 10-49: Other"];

export default function GreenEngineeringSaaS() {
  return (
    <div className="flex flex-col">
      {/* JSON-LD SCHEMA FOR GOOGLE SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Green Engineering Tools LCA",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Enterprise Life Cycle Assessment (LCA) software and embodied carbon calculator for LEED v4 compliance and EN-15804 reporting. Integrates with EC3 and Revit BIM.",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      })}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What is an embodied carbon calculator?", "acceptedAnswer": { "@type": "Answer", "text": "An embodied carbon calculator is an engineering tool used to quantify the total greenhouse gas emissions generated during the manufacturing, transportation, and construction phases of building materials." } },
          { "@type": "Question", "name": "Does this software integrate with the EC3 database?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, our Life Cycle Assessment software features a direct API bridge to the Building Transparency EC3 global database, allowing engineers to link CAD quantities to verified manufacturer EPDs." } },
          { "@type": "Question", "name": "Can I use this for LEED v4 certification?", "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. The engine automatically evaluates baseline vs. proposed designs across 6 TRACI impact categories to generate compliance matrices for the LEED v4 Building Life-Cycle Impact Reduction credit." } }
        ]
      })}} />

      {/* --- HOMEPAGE CONTENT --- */}
      <main className="flex-1 flex flex-col">
        <div className="bg-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-transparent"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10 text-center">
                <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">EN-15804 & LEED v4 Compliant</div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8">Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Life Cycle Assessment</span> Software</h1>
                <p className="mt-4 text-xl text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed mb-10">
                    Calculate embodied carbon, reconcile EC3 databases, and generate LEED v4 compliance matrices directly from your browser or live BIM webhook.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => document.getElementById('calculator-workspace')?.scrollIntoView({ behavior: 'smooth' })} className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-lg text-lg font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
                        Access the Engine <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button onClick={() => document.getElementById('seo-content')?.scrollIntoView({ behavior: 'smooth' })} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-8 py-4 rounded-lg text-lg font-bold transition-all">Read Methodology</button>
                </div>
            </div>
        </div>

        <div id="calculator-workspace" className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <LcaEngineComponent />
        </div>

        <div id="seo-content" className="bg-white border-t border-slate-200 py-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Advanced Life Cycle Assessment Software for Modern Engineering</h2>
                    <p className="text-lg text-slate-600 font-medium">Why architectural firms rely on Green Engineering Tools to manage their carbon accounting workflows.</p>
                </div>
                
                <div className="prose prose-lg prose-slate max-w-none">
                    <p>In the modern AEC (Architecture, Engineering, and Construction) industry, managing a building's environmental footprint is no longer optional. Our <strong>embodied carbon calculator</strong> provides precise, EN-15804 compliant tracking for architectural materials across their entire lifecycle—from Phase A (Manufacturing and Construction) to Phase C (End of Life).</p>
                    
                    <div className="grid md:grid-cols-3 gap-8 my-12 not-prose">
                        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                            <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-lg flex items-center justify-center mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg></div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">EC3 Database Reconciliation</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Bypass generic approximations. Our LCA software connects directly to the Building Transparency EC3 database, allowing you to link CAD takeoff quantities directly to verified, manufacturer-specific Environmental Product Declarations (EPDs).</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                            <div className="bg-emerald-100 text-emerald-700 w-12 h-12 rounded-lg flex items-center justify-center mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg></div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">LEED v4 Compliance</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Achieve the Building Life-Cycle Impact Reduction credit easily. Upload a Baseline and Proposed structural schedule, and our engine automatically calculates TRACI metrics (Acidification, Smog, Eutrophication) to generate your legal compliance matrix.</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
                            <div className="bg-indigo-100 text-indigo-700 w-12 h-12 rounded-lg flex items-center justify-center mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Bid Leveling & Carbon Cost</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Merge your financial budget with your carbon budget. By utilizing our Procurement dashboard, estimators can establish the exact "Carbon per Dollar" ratio, optimizing sustainable material choices without breaking the bank.</p>
                        </div>
                    </div>

                    <h3>Evaluating the Circular Economy (Module D)</h3>
                    <p>Standard life cycle assessment software often stops at demolition (Phase C4). Green Engineering Tools goes further by calculating <strong>Module D</strong>. When you input high material recovery rates (e.g., melting down structural steel or repurposing cross-laminated timber), our engine calculates the negative carbon credits generated, providing a truly holistic view of your architectural system's environmental stewardship.</p>
                </div>
            </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-black text-slate-900 mb-10 text-center">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    {[
                        { q: "What is an embodied carbon calculator?", a: "An embodied carbon calculator is an engineering utility tool used to quantify the total greenhouse gas emissions generated during the manufacturing, transportation, and construction phases (Phases A1-A5) of building materials." },
                        { q: "Does this software integrate with the EC3 database?", a: "Yes, our Life Cycle Assessment software features a direct API bridge to the Building Transparency EC3 global database. When an unrecognized material is uploaded via CSV, the engine prompts you to search and link a verified manufacturer EPD instantly." },
                        { q: "Can I use this for LEED v4 certification?", a: "Absolutely. The engine automatically evaluates baseline versus proposed designs across 6 critical TRACI impact categories (Global Warming Potential, Acidification, Smog Formation, Eutrophication, Ozone Depletion, and Energy Demand) to generate an automated PDF compliance matrix." },
                        { q: "Do I have to use CSV uploads?", a: "No. For advanced enterprise users, our software features a secure Webhook endpoint, allowing developers to pipe architectural schedules directly from custom C# Autodesk Revit add-ins into the web application." }
                    ].map((faq, i) => (
                        <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-start gap-3"><span className="text-emerald-500">Q.</span> {faq.q}</h4>
                            <p className="text-slate-600 leading-relaxed ml-7">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// --- THE LCA ENGINE COMPONENT (UNCHANGED) ---
// ============================================================================

function LcaEngineComponent() {
  const [epdDatabase, setEpdDatabase] = useState<Record<string, any>>({});
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const [customAssemblies, setCustomAssemblies] = useState<Record<string, any>>({});
  const [showAssemblyBuilder, setShowAssemblyBuilder] = useState(false);
  const [showRevitModal, setShowRevitModal] = useState(false);
  const [assemblyForm, setAssemblyForm] = useState({ name: '', category: 'Div 09: Finishes', unit: 'm2', lifespan: 60, items: [{ name: '', qty: 1 }] });

  const [activeTab, setActiveTab] = useState<'manufacturing' | 'construction' | 'use' | 'eol' | 'procurement'>('manufacturing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [buildingLifespan, setBuildingLifespan] = useState(60); 
  const [annualEnergyKwh, setAnnualEnergyKwh] = useState(150000); 
  const [gridIntensity, setGridIntensity] = useState(0.38); 

  const [eolScenarios, setEolScenarios] = useState<Record<string, number>>({}); 
  const [unitCosts, setUnitCosts] = useState<Record<string, number>>({}); 
  
  const [baselineBOM, setBaselineBOM] = useState<any[]>([]);
  const [proposedBOM, setProposedBOM] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'baseline' | 'proposed' | 'comparison'>('proposed');

  const [pendingUpload, setPendingUpload] = useState<{ type: 'baseline' | 'proposed', data: any[], headers: string[] } | null>(null);
  const [columnMapping, setColumnMapping] = useState({ material: '', quantity: '', unit: '' });

  const [pendingReconciliation, setPendingReconciliation] = useState<{ type: 'baseline' | 'proposed', mappedData: any[], uniqueMaterials: string[] } | null>(null);
  const [ec3SearchResults, setEc3SearchResults] = useState<Record<string, any[]>>({});
  const [isSearchingEc3, setIsSearchingEc3] = useState<Record<string, boolean>>({});
  const [selectedEpds, setSelectedEpds] = useState<Record<string, any>>({});

  const baselineInputRef = useRef<HTMLInputElement>(null);
  const proposedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDatabase = async () => {
      const dbMap: Record<string, any> = {};

      const cachedData = localStorage.getItem('lca_epd_cache');
      if (cachedData) {
          try { Object.assign(dbMap, JSON.parse(cachedData)); } catch (e) { console.error(e); }
      }

      try {
        const res = await fetch('/api/epd');
        const json = await res.json();
        if (json.success && json.data) {
          json.data.forEach((row: any) => {
            let cat = row.category || 'Div 10-49: Other';
            if (!cat.includes('Div')) {
                if (cat.includes('Structure') && row.material_name.includes('Concrete')) cat = 'Div 03: Concrete';
                else if (cat.includes('Structure') && row.material_name.includes('Steel')) cat = 'Div 05: Metals';
                else if (cat.includes('Structure') && row.material_name.includes('Timber')) cat = 'Div 06: Wood, Plastics, and Composites';
                else if (row.material_name.includes('Insulation')) cat = 'Div 07: Thermal and Moisture Protection';
                else if (row.material_name.includes('Glass') || row.material_name.includes('Aluminum')) cat = 'Div 08: Openings';
                else cat = 'Div 09: Finishes';
            }

            dbMap[row.material_name] = {
              category: cat,
              lifespan: safeNum(row.lifespan_years, 60),
              weight: safeNum(row.weight_kg_per_unit, 100),
              phases: { manufacturing: safeNum(row.gwp_mfg), construction: safeNum(row.gwp_con), use: safeNum(row.gwp_use), eol: safeNum(row.gwp_eol) },
              biogenic: safeNum(row.gwp_biogenic),
              traci: { acidification: safeNum(row.traci_acidification), smog: safeNum(row.traci_smog), eutrophication: safeNum(row.traci_eutrophication), ozone: safeNum(row.traci_ozone), energy: safeNum(row.traci_energy) }
            };
          });
        }
      } catch (error) {} 
      
      setEpdDatabase(dbMap);
      setIsLoadingDb(false);
    };
    fetchDatabase();
  }, []);

  const handleAddAssemblyComponent = () => setAssemblyForm({ ...assemblyForm, items: [...assemblyForm.items, { name: '', qty: 1 }] });
  const handleRemoveAssemblyComponent = (index: number) => { const newItems = [...assemblyForm.items]; newItems.splice(index, 1); setAssemblyForm({ ...assemblyForm, items: newItems }); };
  const handleAssemblyComponentChange = (index: number, field: 'name' | 'qty', value: any) => { const newItems = [...assemblyForm.items]; newItems[index] = { ...newItems[index], [field]: value }; setAssemblyForm({ ...assemblyForm, items: newItems }); };

  const saveCustomAssembly = () => {
    if (!assemblyForm.name) return alert("Assembly needs a name");
    let mfg = 0, con = 0, use = 0, eol = 0, biogenic = 0, weight = 0, acid = 0, smog = 0, eutro = 0, ozone = 0, energy = 0;

    assemblyForm.items.forEach(item => {
        const epd = epdDatabase[item.name];
        if (epd) {
            mfg += (epd.phases.manufacturing * item.qty); con += (epd.phases.construction * item.qty); use += (epd.phases.use * item.qty); eol += (epd.phases.eol * item.qty);
            biogenic += (epd.biogenic * item.qty); weight += (epd.weight * item.qty);
            acid += (epd.traci.acidification * item.qty); smog += (epd.traci.smog * item.qty); eutro += (epd.traci.eutrophication * item.qty);
            ozone += (epd.traci.ozone * item.qty); energy += (epd.traci.energy * item.qty);
        }
    });

    const syntheticEPD = {
        category: assemblyForm.category, lifespan: assemblyForm.lifespan, weight: weight,
        phases: { manufacturing: mfg, construction: con, use: use, eol: eol }, biogenic: biogenic,
        traci: { acidification: acid, smog: smog, eutrophication: eutro, ozone: ozone, energy: energy },
        isAssembly: true, components: assemblyForm.items
    };
    setCustomAssemblies(prev => ({ ...prev, [assemblyForm.name]: syntheticEPD }));
    setShowAssemblyBuilder(false);
    setAssemblyForm({ name: '', category: 'Div 09: Finishes', unit: 'm2', lifespan: 60, items: [{ name: '', qty: 1 }] });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'baseline' | 'proposed') => {
    const inputElement = e.target;
    const file = inputElement.files?.[0]; 
    if (!file) return;
    
    setIsProcessing(true);
    
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
        let csvText = event.target?.result as string;
        csvText = csvText.split('\n').map(line => line.replace(/(^\s*"|"\s*$)/g, '')).join('\n');

        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            setTimeout(() => {
              setColumnMapping({ 
                  material: headers.find(h => /material|name|family|type/i.test(h)) || headers[0] || '', 
                  quantity: headers.find(h => /qty|quantity|volume|area/i.test(h)) || headers[1] || '', 
                  unit: headers.find(h => /unit|uom/i.test(h)) || headers[2] || '' 
              });
              setPendingUpload({ type, data: results.data, headers });
              setIsProcessing(false);
              
              inputElement.value = ''; 
              if (baselineInputRef.current) baselineInputRef.current.value = '';
              if (proposedInputRef.current) proposedInputRef.current.value = '';
            }, 600);
          },
        });
    };
    fileReader.readAsText(file);
  };

  const confirmMapping = () => {
    if (!pendingUpload) return;
    const mappedData = pendingUpload.data.map(row => ({ 
        Material_Name: row[columnMapping.material] || 'Unknown', 
        Quantity: row[columnMapping.quantity] || 0, 
        Unit: row[columnMapping.unit] || 'units', 
        _distance: 300, _mode: 'truck' 
    }));
    
    const uniqueMaterials = Array.from(new Set(mappedData.map(d => d.Material_Name as string)))
      .filter(Boolean)
      .filter(name => !customAssemblies[name] && !epdDatabase[name]);

    if (uniqueMaterials.length === 0) {
        if (pendingUpload.type === 'baseline') { 
            setBaselineBOM(mappedData); 
            if (proposedBOM.length > 0) setActiveView('comparison');
            else setActiveView('baseline');
        } 
        else { 
            setProposedBOM(mappedData); 
            if (baselineBOM.length > 0) setActiveView('comparison');
            else setActiveView('proposed'); 
        }
        setPendingUpload(null);
    } else {
        setPendingReconciliation({ type: pendingUpload.type, mappedData, uniqueMaterials });
        setPendingUpload(null);
    }
  };

  const searchEc3 = async (localName: string, query: string) => {
    setIsSearchingEc3(prev => ({...prev, [localName]: true}));
    try {
        const res = await fetch(`/api/ec3?search=${encodeURIComponent(query)}`);
        if (!res.ok) {
            alert(`API Route Not Found. Please ensure app/api/ec3/route.ts exists.`);
            setIsSearchingEc3(prev => ({...prev, [localName]: false}));
            return;
        }
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            if(json.success) setEc3SearchResults(prev => ({...prev, [localName]: json.data}));
        } catch (parseError) { alert("The server returned an invalid response."); }
    } catch(e) { console.error("Fetch request failed completely:", e); }
    setIsSearchingEc3(prev => ({...prev, [localName]: false}));
  };

  const confirmReconciliation = async () => {
    if (!pendingReconciliation) return;
    const newDb = { ...epdDatabase };
    const epdsToSave: any[] = [];
    
    const newBOM = pendingReconciliation.mappedData.map(row => {
        const selected = selectedEpds[row.Material_Name];
        if (selected) {
            const gwpVal = safeNum(selected.gwp);
            const traciAcid = safeNum(selected.traci_acidification, gwpVal * 0.005);
            const traciSmog = safeNum(selected.traci_smog, gwpVal * 0.02);
            
            const matData = { 
                category: selected.category, lifespan: 60, weight: 100, 
                phases: { manufacturing: gwpVal, construction: 5, use: 0, eol: 10 }, 
                biogenic: 0, 
                traci: { acidification: traciAcid, smog: traciSmog, eutrophication: 0.1, ozone: 0.001, energy: gwpVal * 12 } 
            };
            
            newDb[selected.name] = matData;
            epdsToSave.push({
                material_name: selected.name, category: selected.category, lifespan_years: 60, weight_kg_per_unit: 100,
                gwp_mfg: gwpVal, gwp_con: 5, gwp_use: 0, gwp_eol: 10, gwp_biogenic: 0,
                traci_acidification: traciAcid, traci_smog: traciSmog, traci_eutrophication: 0.1, traci_ozone: 0.001, traci_energy: gwpVal * 12
            });

            return { ...row, Material_Name: selected.name };
        }
        return row;
    });

    setEpdDatabase(newDb);
    localStorage.setItem('lca_epd_cache', JSON.stringify(newDb));

    try { fetch('/api/epd', { method: 'POST', body: JSON.stringify({ newMaterials: epdsToSave }) }).catch(()=>{}); } catch(e){}

    if (pendingReconciliation.type === 'baseline') {
       setBaselineBOM(newBOM);
       if (proposedBOM.length > 0) setActiveView('comparison');
       else setActiveView('baseline');
    } else {
       setProposedBOM(newBOM);
       if (baselineBOM.length > 0) setActiveView('comparison');
       else setActiveView('proposed');
    }
    setPendingReconciliation(null);
    setSelectedEpds({});
    setEc3SearchResults({});
  };

  const handleQuantityChange = (index: number, newQty: string) => {
    const val = newQty === '' ? '' : safeNum(newQty);
    if (activeView === 'baseline') { const updated = [...baselineBOM]; updated[index].Quantity = val; setBaselineBOM(updated); } 
    else if (activeView === 'proposed') { const updated = [...proposedBOM]; updated[index].Quantity = val; setProposedBOM(updated); }
  };

  const handleCostChange = (index: number, val: string) => {
    const key = `${activeView}_${index}`;
    setUnitCosts(prev => ({ ...prev, [key]: safeNum(val) }));
  };

  const handleEolChange = (index: number, recyclePercent: number) => {
    if (activeView === 'comparison') return;
    const key = `${activeView}_${index}`;
    setEolScenarios(prev => ({ ...prev, [key]: recyclePercent }));
  };

  const getMaterialData = (name: string) => {
      return customAssemblies[name] || epdDatabase[name] || { category: 'Div 10-49: Other', lifespan: 60, weight: 100, phases: { manufacturing: 50, construction: 5, use: 0, eol: 10 }, biogenic: 0, traci: { acidification: 0, smog: 0, eutrophication: 0, ozone: 0, energy: 0 } };
  };

  const processBOM = (bomData: any[], viewPrefix: string) => {
    if (!bomData || bomData.length === 0) return null;
    let sumGwpFossil = 0, sumGwpBiogenic = 0, sumModuleD = 0, sumCost = 0;
    
    const items = bomData.map((row: any, originalIndex: number) => {
      const name = row['Material_Name'] || 'Unknown Material';
      const qty = safeNum(row['Quantity'], 0);
      const distance = safeNum(row._distance, 300);
      const mode = row._mode || 'truck';
      const unit = row['Unit'] || 'units';
      const recycleRate = (eolScenarios[`${viewPrefix}_${originalIndex}`] || 0) / 100;
      const unitCost = unitCosts[`${viewPrefix}_${originalIndex}`] || 0;
      
      const epd = getMaterialData(name);
      const replacements = Math.max(1, Math.ceil(buildingLifespan / epd.lifespan));
      
      const moduleD = qty * (epd.phases.manufacturing || 0) * recycleRate * 0.85 * replacements;
      const totalCost = qty * unitCost * replacements;

      let multiplier = 1;
      if (activeTab === 'manufacturing' || activeTab === 'eol' || activeTab === 'procurement') multiplier = replacements;
      if (activeTab === 'use') multiplier = buildingLifespan;

      let transportImpact = 0;
      if (activeTab === 'construction') transportImpact = ((qty * epd.weight) / 1000) * distance * (TRANSPORT_FACTORS[mode] || 0.15) * replacements;
      let phaseImpactBase = epd.phases[activeTab] || 0;
      if (activeTab === 'eol') phaseImpactBase = phaseImpactBase * (1 - recycleRate);

      const impact = (qty * phaseImpactBase * multiplier) + transportImpact;
      sumGwpFossil += impact;
      sumCost += totalCost;
      sumModuleD += moduleD;

      if (activeTab === 'manufacturing') sumGwpBiogenic += (qty * epd.biogenic * replacements);
      if (activeTab === 'eol') sumGwpBiogenic += (qty * Math.abs(epd.biogenic) * (1 - recycleRate) * replacements);

      return { originalIndex, name, qty, unit, distance, mode, impact, replacements, recycleRate: recycleRate * 100, unitCost, totalCost, moduleD, category: epd.category };
    });
    
    items.sort((a, b) => activeTab === 'procurement' ? b.totalCost - a.totalCost : b.impact - a.impact);
    return { items, totalGwpFossil: sumGwpFossil, totalGwpBiogenic: sumGwpBiogenic, totalModuleD: sumModuleD, totalCost: sumCost };
  };

  const { baseline, proposed } = useMemo(() => {
    return { baseline: processBOM(baselineBOM, 'baseline'), proposed: processBOM(proposedBOM, 'proposed') };
  }, [baselineBOM, proposedBOM, activeTab, buildingLifespan, eolScenarios, unitCosts, epdDatabase, customAssemblies]);

  const generateFullMatrix = (bomData: any[], viewPrefix: string) => {
    if (!bomData || bomData.length === 0) return null;
    let grandTotalFossil = 0, totalModuleD = 0, totalCost = 0, maxStoredBio = 0, totalAcid = 0, totalSmog = 0, totalEutro = 0, totalOzone = 0, totalEnergy = 0;
    
    const reportPhases = { manufacturing: { items: [] as any[], total: 0 }, construction: { items: [] as any[], total: 0 }, use: { items: [] as any[], total: 0 }, eol: { items: [] as any[], total: 0 } };
    const summaryItems = [] as any[];

    bomData.forEach((row: any, i: number) => {
      const name = row['Material_Name'] || 'Unknown Material';
      const qty = safeNum(row['Quantity'], 0);
      const distance = safeNum(row._distance, 300);
      const mode = row._mode || 'truck';
      const unit = row['Unit'] || 'units';
      const recycleRate = (eolScenarios[`${viewPrefix}_${i}`] || 0) / 100;
      const unitCost = unitCosts[`${viewPrefix}_${i}`] || 0;
      
      const epd = getMaterialData(name);
      const replacements = Math.max(1, Math.ceil(buildingLifespan / epd.lifespan));

      const mfgFossil = qty * (epd.phases.manufacturing || 0) * replacements;
      const transport = ((qty * epd.weight) / 1000) * distance * (TRANSPORT_FACTORS[mode] || 0.15) * replacements;
      const conFossil = (qty * (epd.phases.construction || 0) * replacements) + transport;
      const useFossil = qty * (epd.phases.use || 0) * buildingLifespan;
      const eolFossil = qty * (epd.phases.eol || 0) * (1 - recycleRate) * replacements;
      
      const itemTotalFossil = mfgFossil + conFossil + useFossil + eolFossil;
      const itemModuleD = qty * (epd.phases.manufacturing || 0) * recycleRate * 0.85 * replacements;
      const itemCost = qty * unitCost * replacements;

      grandTotalFossil += itemTotalFossil;
      totalModuleD += itemModuleD;
      totalCost += itemCost;

      totalAcid += qty * (epd.traci?.acidification || 0) * replacements;
      totalSmog += (qty * (epd.traci?.smog || 0) * replacements) + (transport * 0.05); 
      totalEutro += qty * (epd.traci?.eutrophication || 0) * replacements;
      totalOzone += qty * (epd.traci?.ozone || 0) * replacements;
      totalEnergy += qty * (epd.traci?.energy || 0) * replacements;

      summaryItems.push({ name, qty, unit, category: epd.category, total: itemTotalFossil, cost: itemCost, moduleD: itemModuleD });
      reportPhases.manufacturing.items.push({ name, qty, unit, impact: mfgFossil }); reportPhases.manufacturing.total += mfgFossil;
      reportPhases.construction.items.push({ name, qty, unit, distance, mode, impact: conFossil }); reportPhases.construction.total += conFossil;
      reportPhases.use.items.push({ name, qty, unit, impact: useFossil }); reportPhases.use.total += useFossil;
      reportPhases.eol.items.push({ name, qty, unit, recycleRate: recycleRate * 100, impact: eolFossil }); reportPhases.eol.total += eolFossil;
    });

    summaryItems.sort((a, b) => b.total - a.total);
    return { grandTotalFossil, totalModuleD, totalCost, maxStoredBio, totalAcid, totalSmog, totalEutro, totalOzone, totalEnergy, summaryItems, phases: reportPhases };
  };

  const fullReport = useMemo(() => {
    return { baseline: generateFullMatrix(baselineBOM, 'baseline'), proposed: generateFullMatrix(proposedBOM, 'proposed') };
  }, [baselineBOM, proposedBOM, buildingLifespan, eolScenarios, unitCosts, epdDatabase, customAssemblies]);

  const hasData = baseline || proposed;
  const isComparing = baseline && proposed;
  const currentViewData = activeView === 'baseline' ? baseline : proposed;

  const crossoverChartData = useMemo(() => {
      const targetReport = activeView === 'baseline' ? fullReport.baseline : (fullReport.proposed || fullReport.baseline);
      if (!targetReport) return [];
      
      const data = [];
      let accEmbodied = targetReport.phases.manufacturing.total + targetReport.phases.construction.total;
      
      for (let year = 0; year <= buildingLifespan; year += 5) {
          const operational = year * annualEnergyKwh * gridIntensity;
          data.push({
              year: `Year ${year}`,
              Operational: operational,
              Embodied: accEmbodied,
              Total_Carbon: accEmbodied + operational
          });
      }
      return data;
  }, [fullReport, annualEnergyKwh, gridIntensity, buildingLifespan, activeView]);

  const deltaMatrix = useMemo(() => {
    if (!baseline || !proposed) return [];
    const allMaterialNames = Array.from(new Set([...baseline.items.map(i => i.name), ...proposed.items.map(i => i.name)]));
    return allMaterialNames.map(name => {
       const bItem = baseline.items.find(i => i.name === name);
       const pItem = proposed.items.find(i => i.name === name);
       return { name, bQty: bItem?.qty || 0, pQty: pItem?.qty || 0, unit: bItem?.unit || pItem?.unit || 'units', bGwp: bItem ? bItem.impact : 0, pGwp: pItem ? pItem.impact : 0, savings: (bItem ? bItem.impact : 0) - (pItem ? pItem.impact : 0) };
    }).sort((a, b) => b.savings - a.savings); 
  }, [baseline, proposed]);

  const leedResults = useMemo(() => {
      if (!isComparing || !fullReport.baseline || !fullReport.proposed) return null;
      const b = fullReport.baseline; const p = fullReport.proposed;
      const calc = (base: number, prop: number) => base === 0 ? 0 : ((base - prop) / base) * 100;
      
      const metrics = [
          { label: 'Global Warming (GWP)', unit: 'kg CO₂e', base: b.grandTotalFossil, prop: p.grandTotalFossil, red: calc(b.grandTotalFossil, p.grandTotalFossil), isReq: true },
          { label: 'Acidification', unit: 'kg SO₂e', base: b.totalAcid, prop: p.totalAcid, red: calc(b.totalAcid, p.totalAcid), isReq: false },
          { label: 'Smog Formation', unit: 'kg O₃e', base: b.totalSmog, prop: p.totalSmog, red: calc(b.totalSmog, p.totalSmog), isReq: false },
          { label: 'Eutrophication', unit: 'kg Ne', base: b.totalEutro, prop: p.totalEutro, red: calc(b.totalEutro, p.totalEutro), isReq: false },
          { label: 'Ozone Depletion', unit: 'kg CFC-11e', base: b.totalOzone, prop: p.totalOzone, red: calc(b.totalOzone, p.totalOzone), isReq: false },
          { label: 'Primary Energy Demand', unit: 'MJ', base: b.totalEnergy, prop: p.totalEnergy, red: calc(b.totalEnergy, p.totalEnergy), isReq: false },
      ];

      let passed10 = 0; let failed5 = false;
      metrics.forEach(m => { if (m.red >= 10) passed10++; if (m.red < -5) failed5 = true; });
      const gwpPassed = metrics[0].red >= 10;
      const compliant = gwpPassed && passed10 >= 3 && !failed5;

      return { metrics, compliant, gwpPassed, passed10, failed5 };
  }, [fullReport, isComparing]);

  const chartData = useMemo(() => {
    if (!isComparing || !fullReport.baseline || !fullReport.proposed) return [];
    return [
      { name: 'Baseline', Manufacturing: fullReport.baseline.phases.manufacturing.total, Construction: fullReport.baseline.phases.construction.total, Use: fullReport.baseline.phases.use.total, End_of_Life: fullReport.baseline.phases.eol.total },
      { name: 'Proposed', Manufacturing: fullReport.proposed.phases.manufacturing.total, Construction: fullReport.proposed.phases.construction.total, Use: fullReport.proposed.phases.use.total, End_of_Life: fullReport.proposed.phases.eol.total }
    ];
  }, [fullReport, isComparing]);

  const reportTarget = activeView === 'baseline' && fullReport.baseline ? fullReport.baseline : (fullReport.proposed || fullReport.baseline);

  const generateNativePDF = () => {
    if (!reportTarget) return;
    setIsDownloading(true);

    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const primaryColor: [number, number, number] = [15, 23, 42]; 
        const secondaryColor: [number, number, number] = [100, 116, 139]; 

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28); doc.setFont("helvetica", "bold"); doc.text("LIFECYCLE ASSESSMENT", 14, 20);
        doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("EN-15804 & LEED v4 Verification Report", 14, 28);
        
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("Executive Summary", 14, 55);
        doc.setFontSize(10); doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 65);
        doc.text(`Assessed Lifespan: ${buildingLifespan} Years`, 14, 71);
        doc.text(`Assessment Scope: ${isComparing ? 'Comparative (Baseline vs. Proposed)' : 'Single System LCA'}`, 14, 77);

        let currentY = 90;
        
        if (isComparing && leedResults) {
            doc.setFillColor(leedResults.compliant ? 220 : 254, leedResults.compliant ? 252 : 226, leedResults.compliant ? 231 : 226); 
            doc.rect(14, currentY, 182, 35, 'F');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFontSize(14); doc.setFont("helvetica", "bold");
            doc.text("LEED v4 Qualification Result", 20, currentY + 12);
            doc.setFontSize(18);
            doc.setTextColor(leedResults.compliant ? 21 : 220, leedResults.compliant ? 128 : 38, leedResults.compliant ? 61 : 38);
            doc.text(leedResults.compliant ? "CERTIFIED: Requirements Met" : "FAILED: Requirements Not Met", 20, currentY + 22);
            doc.setFontSize(10); doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.text(`>10% GWP Reduction: ${leedResults.gwpPassed ? 'Pass' : 'Fail'} | 3+ Categories Reduced: ${leedResults.passed10 >= 3 ? 'Pass' : 'Fail'} | No >5% Increase: ${!leedResults.failed5 ? 'Pass' : 'Fail'}`, 20, currentY + 30);
            currentY += 50;

            autoTable(doc, {
                startY: currentY,
                head: [['Impact Category', 'Baseline', 'Proposed', '% Reduction']],
                body: leedResults.metrics.map(m => [ m.label, `${m.base.toLocaleString(undefined, {maximumFractionDigits: 1})} ${m.unit}`, `${m.prop.toLocaleString(undefined, {maximumFractionDigits: 1})} ${m.unit}`, m.red > 0 ? `+${m.red.toFixed(2)}%` : `${m.red.toFixed(2)}%` ]),
                theme: 'striped', headStyles: { fillColor: primaryColor },
                columnStyles: { 0: { fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        doc.setFontSize(14); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("System Boundary Totals", 14, currentY);
        doc.setFontSize(11); doc.setTextColor(15, 23, 42); 
        doc.text(`Total Fossil Carbon (GWP):`, 14, currentY + 10); doc.text(`${reportTarget.grandTotalFossil.toLocaleString(undefined, {maximumFractionDigits:0})} kg CO2e`, 80, currentY + 10);
        
        doc.setTextColor(22, 163, 74); 
        doc.text(`Max Biogenic Carbon Stored:`, 14, currentY + 18); doc.text(`-${reportTarget.maxStoredBio.toLocaleString(undefined, {maximumFractionDigits:0})} kg CO2e`, 80, currentY + 18);

        doc.setTextColor(16, 185, 129); 
        doc.text(`Module D (Reuse/Recycling Savings):`, 14, currentY + 26); 
        doc.text(`-${reportTarget.totalModuleD.toLocaleString(undefined, {maximumFractionDigits:0})} kg CO2e`, 80, currentY + 26);

        const groupedInventory: Record<string, any[]> = {};
        reportTarget.summaryItems.forEach((item: any) => { if (!groupedInventory[item.category]) groupedInventory[item.category] = []; groupedInventory[item.category].push(item); });

        const tableBody: any[] = [];
        Object.keys(groupedInventory).sort().forEach(div => {
            tableBody.push([{ content: div, colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } }]);
            groupedInventory[div].forEach((item: any) => { tableBody.push([ item.name, `${Number(item.qty).toLocaleString()} ${item.unit}`, item.total.toLocaleString(undefined, {maximumFractionDigits:0}) ]); });
        });
        
        doc.addPage();
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("CSI MasterFormat Inventory", 14, 20);
        autoTable(doc, {
            startY: 30, head: [['Material Name', 'Total Quantity', 'Lifecycle GWP (kg CO2e)']],
            body: tableBody, theme: 'grid', headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold', textColor: primaryColor } }
        });

        const phases = [
            { key: 'manufacturing', title: 'A1-A3: Product & Manufacturing Phase', cols: ['Material', 'Quantity', 'Phase Impact'] },
            { key: 'construction', title: 'A4-A5: Logistics & Construction Phase', cols: ['Material', 'Quantity', 'Route', 'Phase Impact'] },
            { key: 'use', title: 'B1-B7: Use & Replacement Phase', cols: ['Material', 'Quantity', 'Phase Impact'] },
            { key: 'eol', title: 'C1-C4: End of Life Phase', cols: ['Material', 'Quantity', 'Recovery %', 'Phase Impact'] }
        ];

        phases.forEach((phase) => {
            const phaseData = reportTarget.phases[phase.key as keyof typeof reportTarget.phases];
            if (!phaseData || phaseData.total === 0) return;
            doc.addPage();
            doc.setFillColor(248, 250, 252); doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]); doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(phase.title, 14, 18);
            doc.setFontSize(10); doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]); doc.text(`Phase Total: ${phaseData.total.toLocaleString(undefined, {maximumFractionDigits:0})} kg CO2e`, 14, 24);

            const bodyData = phaseData.items.map((item: any) => {
                const row = [item.name, `${Number(item.qty).toLocaleString()} ${item.unit}`];
                if (phase.key === 'construction') row.push(`${item.distance}km via ${item.mode}`);
                if (phase.key === 'eol') row.push(`${item.recycleRate}%`);
                row.push(item.impact.toLocaleString(undefined, {maximumFractionDigits:0})); return row;
            });
            autoTable(doc, {
                startY: 40, head: [phase.cols], body: bodyData, theme: 'striped', headStyles: { fillColor: secondaryColor, textColor: 255 },
                columnStyles: { 0: { fontStyle: 'bold', textColor: primaryColor }, [phase.cols.length - 1]: { halign: 'right', fontStyle: 'bold' } }
            });
        });

        doc.save(`LCA_Verification_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) { console.error("Native PDF Export Error:", error); alert("Failed to generate PDF."); } 
    finally { setIsDownloading(false); }
  };

  const generateCSV = () => {
    if (!reportTarget) return;
    const csvData = reportTarget.summaryItems.map(item => {
      const epd = getMaterialData(item.name);
      return {
        'Material / Assembly Name': item.name, 'CSI MasterFormat Div': item.category, 'Quantity': item.qty, 'Unit': item.unit,
        'Total Lifecycle GWP (kg CO2e)': item.total, 'Acidification (kg SO2e)': (epd.traci?.acidification || 0) * item.qty,
        'Smog Formation (kg O3e)': (epd.traci?.smog || 0) * item.qty, 'Eutrophication (kg Ne)': (epd.traci?.eutrophication || 0) * item.qty,
        'Ozone Depletion (kg CFC-11e)': (epd.traci?.ozone || 0) * item.qty, 'Energy Demand (MJ)': (epd.traci?.energy || 0) * item.qty,
        'Mfg Phase GWP (A1-A3)': epd.phases.manufacturing * item.qty, 'Const Phase GWP (A4-A5)': epd.phases.construction * item.qty,
        'EoL Phase GWP (C1-C4)': epd.phases.eol * item.qty, 'Is Composite Assembly?': epd.isAssembly ? 'Yes' : 'No'
      };
    });
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([Papa.unparse(csvData)], { type: 'text/csv;charset=utf-8;' }));
    link.download = `LCA_Full_System_Export_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  return (
    <div className="w-full bg-white rounded-sm shadow-2xl overflow-hidden border border-gray-200 relative mt-8 mb-16">
      <style dangerouslySetInnerHTML={{__html: `input[type='number']::-webkit-inner-spin-button, input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type='number'] { -moz-appearance: textfield; }`}} />

      {/* --- MODAL 1: REVIT BIM INTEGRATION --- */}
      {showRevitModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 h-screen w-screen text-left">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col relative overflow-hidden">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div><h2 className="text-xl font-bold flex items-center gap-2"><svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> Revit / C# BIM Webhook Integration</h2></div>
                    <button onClick={() => setShowRevitModal(false)} className="text-slate-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-8 space-y-6">
                    <p className="text-slate-600 font-semibold">Bypass CSV uploads entirely. Use this secure endpoint to pipe material schedules directly from your custom C# Revit Add-in into this web application.</p>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Your Secure Webhook URL</label>
                        <code className="text-blue-700 font-mono text-sm font-bold block p-2 bg-blue-50 border border-blue-200 rounded">POST https://greenengineeringtools.com/api/webhook/revit</code>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">C# HttpClient Implementation Snippet</label>
                        <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono overflow-x-auto text-left">
{`using System.Net.Http;
using System.Text;
using System.Text.Json;

public async Task SyncToSaaS(object revitScheduleData)
{
    using var client = new HttpClient();
    client.DefaultRequestHeaders.Add("x-revit-api-key", "your_secure_password");
    
    var jsonPayload = JsonSerializer.Serialize(revitScheduleData);
    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

    var response = await client.PostAsync("https://greenengineeringtools.com/api/webhook/revit", content);
    
    if(response.IsSuccessStatusCode) {
        TaskDialog.Show("Sync", "Successfully synced Revit schedule to Web Engine.");
    }
}`}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL 2: EC3 RECONCILIATION WIZARD --- */}
      {pendingReconciliation && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 h-screen w-screen overflow-hidden text-left">
           <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col relative">
              <div className="flex items-center gap-3 mb-2">
                 <div className="bg-blue-100 text-blue-700 p-2 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900">Link Global EC3 EPDs</h3>
              </div>
              <p className="text-slate-600 mb-8 ml-11">We found materials in your CAD export that are not in your local database. Search the official EC3 Global Database to link them to verified manufacturer EPDs.</p>

              <div className="space-y-4 overflow-y-auto pr-4 flex-1">
                 {pendingReconciliation.uniqueMaterials.map(matName => (
                    <div key={matName} className={`p-5 border-2 rounded-lg transition-colors ${selectedEpds[matName] ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-slate-800 text-lg">{matName}</span>
                            {selectedEpds[matName] ? 
                                <span className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Verified Link</span> 
                                : <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Action Required</span>
                            }
                        </div>
                        <div className="flex gap-2 mb-2">
                            <input type="text" id={`search-${matName}`} defaultValue={matName.split(',')[0]} className="flex-1 px-4 py-2 border-2 border-slate-300 rounded font-bold text-slate-900 focus:border-blue-600 outline-none shadow-inner" />
                            <button onClick={() => {
                                const q = (document.getElementById(`search-${matName}`) as HTMLInputElement).value;
                                searchEc3(matName, q);
                            }} className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700 min-w-[140px] flex justify-center items-center transition-colors">
                                {isSearchingEc3[matName] ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Search EC3'}
                            </button>
                        </div>
                        
                        {ec3SearchResults[matName] && ec3SearchResults[matName].length === 0 && (
                            <div className="mt-2 text-sm font-bold text-red-600">
                                No exact matches found. Try simplifying your search term (e.g., "Steel").
                            </div>
                        )}

                        {ec3SearchResults[matName] && ec3SearchResults[matName].length > 0 && (
                            <div className="mt-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Select Exact Manufacturer EPD</label>
                                <select 
                                    onChange={e => {
                                        const selected = ec3SearchResults[matName].find(epd => epd.name === e.target.value);
                                        if(selected) setSelectedEpds(prev => ({...prev, [matName]: selected}));
                                    }}
                                    className="w-full p-3 border-2 border-blue-300 bg-white text-slate-900 rounded font-semibold outline-none shadow-sm"
                                >
                                    <option value="">-- Choose a Verified EPD --</option>
                                    {ec3SearchResults[matName].map((epd, i) => (
                                        <option key={i} value={epd.name}>{epd.name} ({epd.manufacturer}) - {epd.gwp.toFixed(2)} kgCO₂e/{epd.declared_unit}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                 ))}
              </div>
              
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-200 pt-6">
                 <button onClick={() => { setPendingReconciliation(null); setPendingUpload(null); }} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors">Cancel Upload</button>
                 <button 
                    onClick={confirmReconciliation} 
                    disabled={Object.keys(selectedEpds).length !== pendingReconciliation.uniqueMaterials.length}
                    className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow disabled:opacity-50 transition-colors flex items-center gap-2"
                 >
                    Finalize Database Import <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- MODAL 3: ASSEMBLY BUILDER --- */}
      {showAssemblyBuilder && (
        <div className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 text-left">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div><h2 className="text-xl font-bold text-slate-900">Assembly Builder</h2><p className="text-sm text-slate-500">Combine raw materials into a custom architectural system.</p></div>
                    <button onClick={() => setShowAssemblyBuilder(false)} className="text-slate-400 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-12 gap-4 mb-6">
                        <div className="col-span-5"><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assembly Name</label><input type="text" placeholder="e.g. Standard Exterior Wall" value={assemblyForm.name} onChange={e => setAssemblyForm({...assemblyForm, name: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:border-blue-600 focus:outline-none font-bold text-slate-900" /></div>
                        <div className="col-span-5"><label className="block text-xs font-bold text-slate-700 uppercase mb-1">CSI Division</label><select value={assemblyForm.category} onChange={e => setAssemblyForm({...assemblyForm, category: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:border-blue-600 focus:outline-none text-slate-900 text-sm font-semibold">{CSI_DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}</select></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label><input type="text" placeholder="m2" value={assemblyForm.unit} onChange={e => setAssemblyForm({...assemblyForm, unit: e.target.value})} className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:border-blue-600 focus:outline-none font-bold text-slate-900" /></div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Components (per 1 {assemblyForm.unit})</h4>
                        {assemblyForm.items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 mb-3 items-center">
                                <select value={item.name} onChange={e => handleAssemblyComponentChange(idx, 'name', e.target.value)} className="flex-1 bg-white border-2 border-slate-300 p-2 rounded text-sm text-slate-900"><option value="">Select Material...</option>{Object.keys(epdDatabase).map(mat => <option key={mat} value={mat}>{mat}</option>)}</select>
                                <input type="number" value={item.qty} onChange={e => handleAssemblyComponentChange(idx, 'qty', safeNum(e.target.value))} className="w-24 text-right bg-white border-2 border-slate-300 p-2 rounded text-sm font-mono text-slate-900" placeholder="Qty" />
                                <button onClick={() => handleRemoveAssemblyComponent(idx)} className="text-slate-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                        ))}
                        <button onClick={handleAddAssemblyComponent} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Component</button>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={() => setShowAssemblyBuilder(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100">Cancel</button>
                    <button onClick={saveCustomAssembly} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-500">Generate Assembly</button>
                </div>
            </div>
        </div>
      )}

      {/* --- HEADER CONTROLS --- */}
      <div className="bg-slate-900 px-6 py-5 flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 text-left rounded-t-sm">
        <h3 className="text-white font-bold text-lg tracking-tight flex items-center gap-3">
          Enterprise LCA Engine
          <button onClick={() => setShowAssemblyBuilder(true)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded text-xs font-bold border border-slate-700 transition-colors">+ Build Assembly</button>
        </h3>
        
        <div className="flex flex-wrap items-center gap-3">
          {!pendingUpload && hasData && (
            <div className="flex gap-4 border-r border-slate-700 pr-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                   <label className="font-semibold">B4 Lifespan:</label>
                   <input type="number" value={buildingLifespan} onChange={(e) => setBuildingLifespan(Number(e.target.value))} className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                   <label className="font-semibold">Grid Carbon (kg/kWh):</label>
                   <input type="number" step="0.01" value={gridIntensity} onChange={(e) => setGridIntensity(Number(e.target.value))} className="w-20 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
            </div>
          )}

          {!pendingUpload && hasData && (
            <button onClick={() => setShowRevitModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 px-4 py-2 text-sm font-semibold rounded shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> BIM Sync
            </button>
          )}
          
          {hasData && !pendingUpload && (
            <>
              <button onClick={() => baselineInputRef.current?.click()} className={`px-4 py-2 text-sm font-semibold rounded shadow-sm transition-colors border ${baselineBOM.length > 0 ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500' : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 animate-pulse'}`}>
                {baselineBOM.length > 0 ? 'Update Baseline' : 'Upload Baseline (LEED)'}
              </button>
              <button onClick={() => proposedInputRef.current?.click()} className={`px-4 py-2 text-sm font-semibold rounded shadow-sm transition-colors border ${proposedBOM.length > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500' : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300 animate-pulse'}`}>
                {proposedBOM.length > 0 ? 'Update Proposed' : 'Upload Proposed Design'}
              </button>
            </>
          )}
        </div>
        <input type="file" accept=".csv" className="hidden" ref={baselineInputRef} onChange={(e) => handleFileUpload(e, 'baseline')} />
        <input type="file" accept=".csv" className="hidden" ref={proposedInputRef} onChange={(e) => handleFileUpload(e, 'proposed')} />
      </div>

      {/* --- WIZARD 1: DATA MAPPING --- */}
      {pendingUpload ? (
        <div className="bg-slate-50 p-10 min-h-[500px] flex items-center justify-center text-left rounded-b-sm">
           <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-3xl w-full">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Data Mapping Required</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">Material Name Column</label><select value={columnMapping.material} onChange={e => setColumnMapping({...columnMapping, material: e.target.value})} className="w-full bg-white text-slate-900 border-2 border-slate-300 rounded p-2 text-sm"><option value="">-- Select --</option>{pendingUpload.headers.map((h, i) => <option key={i} value={h}>{h}</option>)}</select></div>
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">Quantity Column</label><select value={columnMapping.quantity} onChange={e => setColumnMapping({...columnMapping, quantity: e.target.value})} className="w-full bg-white text-slate-900 border-2 border-slate-300 rounded p-2 text-sm"><option value="">-- Select --</option>{pendingUpload.headers.map((h, i) => <option key={i} value={h}>{h}</option>)}</select></div>
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">Unit Column</label><select value={columnMapping.unit} onChange={e => setColumnMapping({...columnMapping, unit: e.target.value})} className="w-full bg-white text-slate-900 border-2 border-slate-300 rounded p-2 text-sm"><option value="">-- Select --</option>{pendingUpload.headers.map((h, i) => <option key={i} value={h}>{h}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-3"><button onClick={() => setPendingUpload(null)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded">Cancel</button><button onClick={confirmMapping} disabled={!columnMapping.material || !columnMapping.quantity} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded disabled:opacity-50">Confirm</button></div>
           </div>
        </div>
      ) : !pendingReconciliation && (
        <>
          {hasData && (
            <div className="flex bg-slate-50 text-sm font-semibold text-slate-500 overflow-x-auto shadow-inner border-b border-slate-200 text-left">
              {[{ id: 'manufacturing', label: 'A1-A3: Manufacturing' }, { id: 'construction', label: 'A4-A5: Construction' }, { id: 'use', label: 'B1-B7: Use (Crossover Graph)' }, { id: 'eol', label: 'C1-C4 + Mod D: End of Life' }, { id: 'procurement', label: 'Bid Leveling / Cost' }].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 px-6 py-4 transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white shadow-sm' : 'border-transparent hover:text-slate-800 hover:bg-slate-100'}`}>{tab.label}</button>
              ))}
            </div>
          )}
          
          <div className="p-8 min-h-[500px] bg-slate-50 text-left rounded-b-sm">
            {/* --- EMPTY STATE START DASHBOARD --- */}
            {!hasData ? (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <h4 className="text-3xl font-black text-slate-900 mb-4">Select Engineering Workflow</h4>
                <p className="text-slate-500 max-w-2xl text-center mb-12">Choose how you want to interact with the engine. Run a single structural analysis, or perform a full LEED v4 standard baseline comparison.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">
                    <div onClick={() => proposedInputRef.current?.click()} className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group shadow-sm hover:shadow-md">
                        <div className="bg-slate-100 group-hover:bg-blue-200 text-slate-600 group-hover:text-blue-700 p-4 rounded-full mb-4 transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Single Model Analysis</h3>
                        <p className="text-slate-500 text-sm">Upload a single CSV to calculate absolute embodied carbon, grid crossover, and procurement costs.</p>
                    </div>

                    <div onClick={() => baselineInputRef.current?.click()} className="bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group shadow-sm hover:shadow-md">
                        <div className="bg-slate-100 group-hover:bg-emerald-200 text-slate-600 group-hover:text-emerald-700 p-4 rounded-full mb-4 transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">LEED v4 Comparison</h3>
                        <p className="text-slate-500 text-sm">Start a comparative assessment by uploading a standard Baseline CSV to compare against your Proposed design.</p>
                    </div>

                    <div onClick={() => setShowRevitModal(true)} className="bg-white border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group shadow-sm hover:shadow-md">
                        <div className="bg-slate-100 group-hover:bg-indigo-200 text-slate-600 group-hover:text-indigo-700 p-4 rounded-full mb-4 transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Live BIM Sync</h3>
                        <p className="text-slate-500 text-sm">Pipe architectural quantities directly from a custom C# Revit Add-in via the secure webhook endpoint.</p>
                    </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* --- ACTIVE DASHBOARD UI --- */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {isComparing ? (
                        <>
                            <div className="flex bg-slate-200 p-1 rounded-lg w-fit shadow-inner">
                                <button onClick={() => setActiveView('baseline')} className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'baseline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Baseline Model</button>
                                <button onClick={() => setActiveView('proposed')} className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'proposed' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Proposed Model</button>
                                <button onClick={() => setActiveView('comparison')} className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${activeView === 'comparison' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>LEED Matrix</button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={generateCSV} className="bg-white text-blue-700 hover:bg-blue-100 border border-blue-300 px-4 py-2 text-sm font-bold rounded shadow-sm transition-all">CSV Export</button>
                                <button onClick={generateNativePDF} disabled={isDownloading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold rounded shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isDownloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Download Full PDF'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between items-center w-full bg-blue-50 text-blue-800 px-4 py-3 rounded-md border border-blue-200 shadow-sm">
                            <div>
                                <h4 className="font-bold">Single Model Workspace Active</h4>
                                <p className="text-xs text-blue-600 mt-1">You can export this single system report now, or upload a Baseline model to unlock LEED comparison.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={generateCSV} className="bg-white text-blue-700 hover:bg-blue-100 border border-blue-300 px-4 py-2 text-sm font-bold rounded shadow-sm transition-all">CSV Export</button>
                                <button onClick={generateNativePDF} disabled={isDownloading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-bold rounded shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isDownloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Download PDF Report'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {activeView === 'comparison' && isComparing && leedResults ? (
                    <div className="space-y-8">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className={`p-6 border-b border-slate-200 flex justify-between items-center ${leedResults.compliant ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                <div>
                                    <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">LEED v4 Building Life-Cycle Impact Reduction</h4>
                                    <p className="text-sm font-semibold text-slate-600 mt-1">Required: 10% GWP Reduction + 2 other categories. Max 5% penalty in any category.</p>
                                </div>
                                <div className={`px-6 py-3 rounded-lg border-2 font-black text-xl uppercase tracking-widest ${leedResults.compliant ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                                    {leedResults.compliant ? 'CERTIFIED' : 'FAILED'}
                                </div>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 uppercase text-xs">
                                        <th className="p-4 font-bold">Impact Category</th>
                                        <th className="p-4 text-right font-bold">Baseline</th>
                                        <th className="p-4 text-right font-bold">Proposed</th>
                                        <th className="p-4 text-right font-bold">Reduction %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leedResults.metrics.map((m, idx) => (
                                        <tr key={idx} className="border-b border-slate-100">
                                            <td className="p-4 font-bold text-slate-800">{m.label} {m.isReq && <span className="text-red-500 ml-1">*</span>}</td>
                                            <td className="p-4 text-right font-mono text-slate-500">{m.base.toLocaleString(undefined, {maximumFractionDigits: 1})} {m.unit}</td>
                                            <td className="p-4 text-right font-mono text-slate-900">{m.prop.toLocaleString(undefined, {maximumFractionDigits: 1})} {m.unit}</td>
                                            <td className={`p-4 text-right font-mono font-black ${m.red >= 10 ? 'text-emerald-600' : m.red < -5 ? 'text-red-600' : 'text-slate-600'}`}>
                                                {m.red > 0 ? `+${m.red.toFixed(2)}%` : `${m.red.toFixed(2)}%`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                            <h4 className="text-lg font-bold text-slate-900 mb-6">Lifecycle System Boundary Visualization (A1-C4)</h4>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={100}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fill: '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#475569' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value: any) => `${Number(value).toLocaleString()} kg CO₂e`} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="Manufacturing" stackId="a" fill="#3b82f6" name="A1-A3: Manufacturing" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="Construction" stackId="a" fill="#f59e0b" name="A4-A5: Construction" />
                                        <Bar dataKey="Use" stackId="a" fill="#10b981" name="B1-B7: Use" />
                                        <Bar dataKey="End_of_Life" stackId="a" fill="#64748b" name="C1-C4: End of Life" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white">
                                <h4 className="text-lg font-bold">Itemized Carbon Reductions</h4>
                                <p className="text-slate-400 text-xs mt-1">Line-by-line breakdown of Phase {activeTab} carbon deltas.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider border-b border-slate-300">
                                            <th className="p-4 font-bold">Material / Assembly Name</th>
                                            <th className="p-4 text-right font-bold border-l border-slate-200">Baseline Qty</th>
                                            <th className="p-4 text-right font-bold">Proposed Qty</th>
                                            <th className="p-4 text-right font-bold border-l border-slate-200">Baseline Impact</th>
                                            <th className="p-4 text-right font-bold">Proposed Impact</th>
                                            <th className="p-4 text-right font-black text-slate-800 bg-slate-200 border-l border-slate-300">Delta Savings</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deltaMatrix.map((item, idx) => {
                                            const isSavings = item.savings > 0;
                                            const isIncrease = item.savings < 0;
                                            return (
                                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="p-4 font-bold text-slate-800">
                                                        {item.name}
                                                        {customAssemblies[item.name] && <span className="ml-2 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Assembly</span>}
                                                    </td>
                                                    <td className="p-4 text-right font-mono text-slate-500 border-l border-slate-100">{item.bQty} {item.unit}</td>
                                                    <td className="p-4 text-right font-mono text-slate-900 font-semibold">{item.pQty} {item.unit}</td>
                                                    <td className="p-4 text-right font-mono text-slate-500 border-l border-slate-100">{item.bGwp.toLocaleString(undefined, {maximumFractionDigits:0})} kg</td>
                                                    <td className="p-4 text-right font-mono text-slate-900 font-semibold">{item.pGwp.toLocaleString(undefined, {maximumFractionDigits:0})} kg</td>
                                                    <td className={`p-4 text-right font-mono font-black border-l border-slate-200 ${isSavings ? 'text-emerald-600 bg-emerald-50/30' : isIncrease ? 'text-red-600 bg-red-50/30' : 'text-slate-400 bg-slate-50/30'}`}>
                                                        {isSavings ? '+' : ''}{item.savings.toLocaleString(undefined, {maximumFractionDigits:0})} kg
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'use' && (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
                                <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
                                    <div>
                                        <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">Embodied vs Operational Crossover</h4>
                                        <p className="text-sm font-semibold text-slate-500 mt-1">Visualize the year operational carbon exceeds embodied impact for the <strong>{activeView}</strong> model.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Annual Energy (kWh)</label>
                                        <input type="number" value={annualEnergyKwh} onChange={(e) => setAnnualEnergyKwh(Number(e.target.value))} className="w-32 px-3 py-2 border-2 border-slate-300 rounded font-mono font-bold text-slate-900 focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={crossoverChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="year" tick={{ fill: '#475569', fontWeight: 'bold' }} />
                                            <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#475569' }} />
                                            <RechartsTooltip formatter={(value: any) => `${Number(value).toLocaleString()} kg CO₂e`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Line type="monotone" dataKey="Total_Carbon" stroke="#ef4444" strokeWidth={4} name="Total Carbon (Embodied + Operational)" />
                                            <Line type="monotone" dataKey="Embodied" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" name="Embodied Carbon Only" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {activeTab === 'procurement' && (
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6 flex justify-between items-center bg-indigo-50">
                                <div>
                                    <h2 className="text-sm font-extrabold uppercase tracking-widest text-indigo-900">Bid Leveling & Procurement</h2>
                                    <p className="text-sm font-semibold text-indigo-700 mt-1">Enter unit costs to calculate the Carbon per Dollar ratio.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Total System Cost</div>
                                    <div className="text-3xl font-black text-indigo-900">${currentViewData?.totalCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm col-span-2">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Fossil Carbon (Phase Total)</div>
                                <div className="text-4xl font-extrabold text-slate-900">{currentViewData?.totalGwpFossil.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-semibold text-slate-500">kg CO₂e</span></div>
                            </div>
                            {activeTab === 'eol' ? (
                                <div className="bg-emerald-50 p-5 rounded-lg border border-emerald-200 shadow-sm col-span-2 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Module D: Reuse Savings</div>
                                        <div className="text-4xl font-extrabold text-emerald-600">{currentViewData?.totalModuleD.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-semibold text-emerald-500">kg CO₂e</span></div>
                                    </div>
                                    <svg className="w-12 h-12 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                            ) : (
                                <div className="bg-white p-5 rounded-lg border border-green-200 shadow-sm col-span-2">
                                    <div className="text-xs font-bold text-green-700 uppercase tracking-widest mb-1">Biogenic Stored (Phase Total)</div>
                                    <div className="text-4xl font-extrabold text-green-700">{currentViewData?.totalGwpBiogenic.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-semibold text-green-600">kg CO₂e</span></div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                            {currentViewData?.items.map((item: any, idx: number) => {
                                const max = Math.max(...currentViewData.items.map((i: any) => Math.abs(i.impact)), 1);
                                const width = Math.max(2, Math.round((Math.abs(item.impact) / max) * 100));
                                return (
                                    <div key={idx} className="border-b border-slate-100 p-4 hover:bg-slate-50 transition-colors">
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-12 md:col-span-4 font-bold text-slate-800 text-base">
                                                {item.name}
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.category}</div>
                                                {customAssemblies[item.name] && <span className="inline-block mt-1 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Assembly</span>}
                                            </div>
                                            
                                            <div className="col-span-4 md:col-span-3 flex items-center gap-2">
                                                <input type="number" value={item.qty} onChange={(e) => handleQuantityChange(item.originalIndex, e.target.value)} className="w-full max-w-[6rem] px-2 py-1 border-2 border-slate-300 rounded bg-white text-right font-mono text-sm font-bold text-slate-900 focus:border-blue-600 outline-none" />
                                                <span className="text-slate-500 text-[10px] font-bold uppercase">{item.unit}</span>
                                            </div>

                                            {activeTab === 'eol' && (
                                                <div className="col-span-4 md:col-span-3 flex items-center gap-2">
                                                    <input type="number" placeholder="0" value={item.recycleRate || ''} onChange={(e) => handleEolChange(item.originalIndex, Number(e.target.value))} className="w-full max-w-[5rem] px-2 py-1 border-2 border-emerald-300 rounded bg-white text-right font-mono text-sm font-bold text-emerald-900 focus:border-emerald-600 outline-none" />
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase">% Recovered</span>
                                                </div>
                                            )}

                                            {activeTab === 'procurement' && (
                                                <div className="col-span-4 md:col-span-3 flex items-center gap-2">
                                                    <span className="text-slate-500 font-bold">$</span>
                                                    <input type="number" placeholder="Cost/Unit" value={item.unitCost || ''} onChange={(e) => handleCostChange(item.originalIndex, e.target.value)} className="w-full max-w-[6rem] px-2 py-1 border-2 border-indigo-300 rounded bg-white text-right font-mono text-sm font-bold text-indigo-900 focus:border-indigo-600 outline-none" />
                                                    <div className="text-[10px] font-black text-indigo-500 ml-2 whitespace-nowrap">
                                                        {item.totalCost > 0 ? `${(item.impact / item.totalCost).toFixed(2)} kgCO₂/$` : ''}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`col-span-4 text-right font-mono font-bold text-base ${(activeTab === 'procurement' || activeTab === 'eol') ? 'md:col-span-2' : 'md:col-span-5 text-slate-700'}`}>
                                                {activeTab === 'procurement' ? `$${item.totalCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}` : `${item.impact.toLocaleString(undefined, {maximumFractionDigits:0})} kg`}
                                            </div>
                                        </div>
                                        {(activeTab !== 'procurement' && activeTab !== 'eol') && <div className="w-full bg-slate-100 rounded-full h-2 mt-3"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${width}%` }}></div></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}