"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

// --- EU REGULATORY CONSTANTS ---
const DEFAULT_MARKUP = 1.10;
const CBAM_SCHEDULE = [
  { year: 2026, factor: 0.025 }, { year: 2027, factor: 0.050 }, { year: 2028, factor: 0.100 },
  { year: 2029, factor: 0.225 }, { year: 2030, factor: 0.485 }, { year: 2031, factor: 0.735 },
  { year: 2032, factor: 0.860 }, { year: 2033, factor: 0.930 }, { year: 2034, factor: 1.000 },
];

interface Product { id: string; name: string; cn: string; defaultEf: number; actualEf: number; }
interface PortfolioItem { id: string; supplier: string; product: Product; volume: number; netCost: number; emissions: number; mode: string; }

export default function DefinitiveCbamPlatform() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeAppTab, setActiveAppTab] = useState<'calculator' | 'portfolio' | 'erp'>('calculator');
  const [productDatabase, setProductDatabase] = useState<Product[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Single Calculator State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [volume, setVolume] = useState<number>(50);
  const [supplierName, setSupplierName] = useState<string>(""); 
  const [euEtsPrice, setEuEtsPrice] = useState<number>(82.63); 
  const [foreignTaxRate, setForeignTaxRate] = useState<number>(0);
  const [emissionsMode, setEmissionsMode] = useState<'default' | 'verified'>('verified');
  const [directActualEf, setDirectActualEf] = useState<number>(0);

  // Enterprise States
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const erpFileInputRef = useRef<HTMLInputElement>(null);

  // Initial Fetch
  useEffect(() => {
    const fetchLiveCbamData = async () => {
      try {
        const res = await fetch('/api/cbam');
        const json = await res.json();
        if (json.success) {
          setEuEtsPrice(Number(json.etsPrice));
          const parsedProducts = json.products.map((p: any) => ({ ...p, defaultEf: Number(p.defaultEf), actualEf: Number(p.actualEf) }));
          setProductDatabase(parsedProducts);
          if (parsedProducts.length > 0) {
            setSelectedProduct(parsedProducts[0]);
            setDirectActualEf(parsedProducts[0].actualEf);
          }
        }
      } catch (error) { console.error("API Error", error); } 
      finally { setIsLoading(false); }
    };
    fetchLiveCbamData();
  }, []);

  useEffect(() => {
    if (selectedProduct && emissionsMode === 'verified') setDirectActualEf(selectedProduct.actualEf);
  }, [selectedProduct, emissionsMode]);

  // LIVE MATH ENGINE
  const calculation = useMemo(() => {
    if (!selectedProduct) return null;

    const finalActualEf = emissionsMode === 'default' ? (selectedProduct.defaultEf * DEFAULT_MARKUP) : directActualEf;
    
    const actEmissions = volume * finalActualEf;
    const actGrossCost = actEmissions * euEtsPrice;
    const actForeignDeduction = emissionsMode === 'default' ? 0 : actEmissions * foreignTaxRate; 
    const actAdjustedCost = Math.max(0, actGrossCost - actForeignDeduction);
    const actNet2026 = actAdjustedCost * CBAM_SCHEDULE[0].factor;

    const forecast = CBAM_SCHEDULE.map(s => ({
      year: s.year.toString(),
      "Cost Exposure": actAdjustedCost * s.factor,
    }));

    return { finalActualEf, actEmissions, actGrossCost, actForeignDeduction, actNet2026, actPerTonne: volume > 0 ? actNet2026/volume : 0, forecast };
  }, [selectedProduct, volume, euEtsPrice, foreignTaxRate, emissionsMode, directActualEf]);

  // --- PORTFOLIO EXEMPTION LOGIC (REGULATION EU 2025/2083) ---
  const exemptableVolume = useMemo(() => {
    return portfolio
      .filter(item => item.product.id !== 'hydrogen' && item.product.id !== 'electricity')
      .reduce((sum, item) => sum + item.volume, 0);
  }, [portfolio]);

  const isExempt = exemptableVolume < 50 && exemptableVolume > 0;

  const totalCorporateLiability = useMemo(() => {
    return portfolio.reduce((sum, item) => {
      if (isExempt && item.product.id !== 'hydrogen' && item.product.id !== 'electricity') {
        return sum; // 50-tonne exemption applied
      }
      return sum + item.netCost;
    }, 0);
  }, [portfolio, isExempt]);


  // --- PDF GENERATOR ---
  const generatePDF = () => {
    if (!calculation || !selectedProduct) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const primaryColor: [number, number, number] = [30, 58, 138]; 

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("CBAM FINANCIAL EXPOSURE", 14, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("European Union Carbon Border Adjustment Mechanism (Definitive Phase)", 14, 28);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("Import Parameters", 14, 55);
      
      autoTable(doc, {
        startY: 60,
        body: [
          ['Company / Supplier', supplierName || 'Not Specified'],
          ['Product Name', selectedProduct.name],
          ['CN Code', selectedProduct.cn],
          ['Import Volume', `${volume.toLocaleString('en-IE')} Tonnes`],
          ['EU ETS Price', `${euEtsPrice.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })} / Tonne`],
          ['Emissions Basis', emissionsMode.toUpperCase()],
          ['Embedded Factor (EF)', `${calculation.finalActualEf.toFixed(4)} tCO2e/t`],
          ['Foreign Carbon Tax Paid', `${foreignTaxRate.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })} / Tonne`]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 70 } }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("2026 Immediate Liability", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Metric', 'Amount']],
        body: [
          ['Total Embedded Emissions', `${calculation.actEmissions.toLocaleString('en-IE', {maximumFractionDigits:2})} tCO2e`],
          ['Gross Certificate Cost', calculation.actGrossCost.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })],
          ['Foreign Tax Deduction', `- ${calculation.actForeignDeduction.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}`],
          ['Phase-in Factor (2026)', '2.5%'],
          ['Net CBAM Cost (2026)', calculation.actNet2026.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })]
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold' } }
      });

      doc.save(`CBAM_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { alert("Failed to generate PDF."); } finally { setIsDownloading(false); }
  };

  // --- SINGLE XML GENERATOR ---
  const generateSingleXML = () => {
    if (!calculation || !selectedProduct) return;
    
    const itemIsExempt = volume < 50 && selectedProduct.id !== 'hydrogen' && selectedProduct.id !== 'electricity';
    const finalLiability = itemIsExempt ? 0 : calculation.actNet2026;

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMAnnualDeclaration xmlns="urn:eu:taxud:cbam:v2">
    <ReportingYear>2026</ReportingYear>
    <SubmissionDeadline>2027-09-30</SubmissionDeadline>
    <Declarant><Id>GREEN-ENGINEERING-TOOLS-SAAS</Id></Declarant>
    <Goods>
        <Commodity>
            <Supplier>${supplierName || 'Not Specified'}</Supplier>
            <CNCode>${selectedProduct.cn}</CNCode>
            <Description>${selectedProduct.name}</Description>
            <Quantity unit="tonnes">${volume}</Quantity>
        </Commodity>
        <Emissions>
            <EmissionsType>${emissionsMode === 'default' ? 'DEFAULT' : 'ACTUAL'}</EmissionsType>
            <SpecificEmbeddedEmissions>${calculation.finalActualEf.toFixed(4)}</SpecificEmbeddedEmissions>
            <TotalEmbeddedEmissions>${calculation.actEmissions.toFixed(2)}</TotalEmbeddedEmissions>
        </Emissions>
        <CarbonPriceDue>
            <ForeignCarbonTaxPaid>${foreignTaxRate.toFixed(2)}</ForeignCarbonTaxPaid>
            <NetLiability>${finalLiability.toFixed(2)}</NetLiability>
            ${itemIsExempt ? '<ExemptionReason>DeMinimis_Under_50t</ExemptionReason>' : ''}
        </CarbonPriceDue>
    </Goods>
</CBAMAnnualDeclaration>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `CBAM_Annual_Declaration_${selectedProduct.cn}.xml`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- ENTERPRISE FUNCTIONS ---
  const addToPortfolio = () => {
    if(!calculation || !selectedProduct) return;
    setPortfolio([...portfolio, { 
      id: Math.random().toString(36).substr(2, 9), 
      supplier: supplierName || "Unknown Supplier", 
      product: selectedProduct, 
      volume: volume, 
      netCost: calculation.actNet2026, 
      emissions: calculation.actEmissions, 
      mode: emissionsMode 
    }]);
    setActiveAppTab('portfolio');
    setSupplierName(""); 
  };

  const deleteFromPortfolio = (idToRemove: string) => {
    setPortfolio(portfolio.filter(item => item.id !== idToRemove));
  };

  const handleErpCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      Papa.parse(event.target?.result as string, {
        header: true,
        complete: (results) => {
          const newItems: PortfolioItem[] = [];
          results.data.forEach((row: any) => {
            if(!row.CN_Code) return;
            const prod = productDatabase.find(p => p.cn === row.CN_Code) || productDatabase[0];
            const vol = Number(row.Tonnes) || 0;
            const net = (vol * prod.defaultEf * DEFAULT_MARKUP * euEtsPrice) * CBAM_SCHEDULE[0].factor;
            newItems.push({ id: Math.random().toString(36).substr(2, 9), supplier: row.Supplier || 'ERP Bulk', product: prod, volume: vol, netCost: net, emissions: vol * prod.defaultEf, mode: 'default' });
          });
          setPortfolio([...portfolio, ...newItems]);
          setActiveAppTab('portfolio');
        }
      });
    };
    reader.readAsText(file);
  };

  const exportPortfolioXml = () => {
    let goodsStr = portfolio.map(item => {
        const itemIsExempt = isExempt && item.product.id !== 'hydrogen' && item.product.id !== 'electricity';
        const finalLiability = itemIsExempt ? 0 : item.netCost;

        return `
        <Commodity>
            <Supplier>${item.supplier}</Supplier>
            <CNCode>${item.product.cn}</CNCode>
            <Quantity unit="tonnes">${item.volume}</Quantity>
            <TotalEmbeddedEmissions>${item.emissions.toFixed(2)}</TotalEmbeddedEmissions>
            <NetLiability>${finalLiability.toFixed(2)}</NetLiability>
            ${itemIsExempt ? '<ExemptionReason>DeMinimis_Under_50t</ExemptionReason>' : ''}
        </Commodity>`;
    }).join("");

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMAnnualDeclaration xmlns="urn:eu:taxud:cbam:v2">
    <ReportingYear>2026</ReportingYear>
    <SubmissionDeadline>2027-09-30</SubmissionDeadline>
    <Declarant><Id>GREEN-ENGINEERING-TOOLS-ENTERPRISE</Id></Declarant>
    <Goods>${goodsStr}</Goods>
    <AnnualTotalDue>${totalCorporateLiability.toFixed(2)}</AnnualTotalDue>
</CBAMAnnualDeclaration>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `CBAM_Annual_Master_Declaration_2026.xml`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-200">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* APP HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">EU CBAM Calculator 2026</h1>
          <p className="text-base md:text-lg text-slate-600 font-medium px-2">Easily calculate your definitive phase CBAM certificate costs, process 50-tonne exemptions, and generate your annual XML declarations.</p>
        </div>

        {/* 3-TAB NAVIGATION */}
        <div className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm w-full mb-8">
          <button onClick={()=>setActiveAppTab('calculator')} className={`flex-1 flex items-center justify-center px-2 py-3 sm:px-4 text-sm font-bold rounded-lg transition-all ${activeAppTab === 'calculator' ? 'bg-slate-900 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}>1. Calculator</button>
          <button onClick={()=>setActiveAppTab('portfolio')} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 sm:px-4 text-sm font-bold rounded-lg transition-all ${activeAppTab === 'portfolio' ? 'bg-slate-900 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}>2. Portfolio <span className={`${activeAppTab === 'portfolio' ? 'bg-indigo-500' : 'bg-indigo-100 text-indigo-700'} text-white px-2 py-0.5 rounded-full text-[10px]`}>{portfolio.length}</span></button>
          <button onClick={()=>setActiveAppTab('erp')} className={`flex-1 flex items-center justify-center px-2 py-3 sm:px-4 text-sm font-bold rounded-lg transition-all ${activeAppTab === 'erp' ? 'bg-slate-900 shadow-md text-white' : 'text-slate-600 hover:bg-slate-100'}`}>3. Bulk Import</button>
        </div>

        {/* TAB 1: EASY CALCULATOR */}
        {activeAppTab === 'calculator' && (
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT COLUMN: 1-2-3 INPUTS */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* STEP 1 */}
              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <h3 className="font-black text-slate-900 mb-5 text-lg sm:text-xl flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-800 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm">1</span> What are you importing?
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">Company / Supplier Name</label>
                    <input type="text" value={supplierName} onChange={(e)=>setSupplierName(e.target.value)} placeholder="e.g. Acme Steel Corp" className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm sm:text-base font-semibold rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">Product Category</label>
                    <select value={selectedProduct?.id || ''} onChange={(e) => setSelectedProduct(productDatabase.find(p => p.id === e.target.value) || productDatabase[0])} className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm sm:text-base font-semibold rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                      {productDatabase.map(p => <option key={p.id} value={p.id}>{p.name} (CN: {p.cn})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1 flex justify-between">
                      Total Weight (Tonnes)
                      {volume < 50 && selectedProduct?.id !== 'hydrogen' && selectedProduct?.id !== 'electricity' && (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">De Minimis Eligible</span>
                      )}
                    </label>
                    <input type="number" value={volume} onChange={(e)=>setVolume(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 font-mono text-base sm:text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <h3 className="font-black text-slate-900 mb-4 sm:mb-5 text-lg sm:text-xl flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm">2</span> Emissions Data
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-4">Do you know the exact carbon emissions of the factory, or do you need to use the EU's estimated default values?</p>
                
                <div className="flex bg-slate-100 p-1 rounded-lg mb-4 shadow-inner">
                  <button onClick={() => setEmissionsMode('default')} className={`flex-1 text-[10px] sm:text-xs font-bold py-2.5 sm:py-3 rounded-md uppercase ${emissionsMode === 'default' ? 'bg-white shadow text-red-700 border border-red-200' : 'text-slate-500 hover:text-slate-800'}`}>Use EU Default</button>
                  <button onClick={() => setEmissionsMode('verified')} className={`flex-1 text-[10px] sm:text-xs font-bold py-2.5 sm:py-3 rounded-md uppercase ${emissionsMode === 'verified' ? 'bg-white shadow text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:text-slate-800'}`}>I Have Factory Data</button>
                </div>

                {emissionsMode === 'default' && (
                  <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 text-xs sm:text-sm text-red-800">
                    <strong>Note:</strong> Using default values triggers a mandatory 10% penalty in the EU system and prevents you from deducting local taxes.
                  </div>
                )}

                {emissionsMode === 'verified' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Factory Emissions (tCO2e/t)</label>
                      <input type="number" step="0.0001" value={directActualEf} onChange={(e) => setDirectActualEf(Number(e.target.value))} className="w-full border border-emerald-300 bg-emerald-50 rounded-lg p-2.5 sm:p-3 font-mono font-bold text-sm sm:text-base text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Foreign Carbon Tax Already Paid?</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 sm:top-3 font-bold text-slate-400">€</span>
                        <input type="number" step="0.01" value={foreignTaxRate} onChange={(e)=>setForeignTaxRate(Number(e.target.value))} placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-2.5 sm:p-3 pl-8 font-mono font-bold text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">If your factory paid a local carbon tax, enter it here to deduct it from your EU bill.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: DASHBOARD & RESULTS */}
            <div className="lg:col-span-7 space-y-6">
              {calculation && (
                <>
                  <div className="bg-slate-900 rounded-xl shadow-xl overflow-hidden text-white relative">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 sm:px-3 sm:py-1 rounded-bl-lg">Step 3: Results</div>
                    <div className="p-5 sm:p-8">
                      <h3 className="font-black text-xl sm:text-2xl mb-1">Your 2026 CBAM Liability</h3>
                      <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-8 border-b border-slate-700 pb-4">Based on {volume.toLocaleString()} tonnes of {selectedProduct?.name}.</p>
                      
                      {volume < 50 && selectedProduct?.id !== 'hydrogen' && selectedProduct?.id !== 'electricity' && (
                        <div className="bg-emerald-900/40 border border-emerald-500 p-4 rounded-xl mb-6 shadow-sm">
                            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> De Minimis Exemption Applies</h4>
                            <p className="text-xs text-emerald-200 mt-1">At {volume} tonnes, this single shipment falls below the 50-tonne annual threshold. If your aggregate yearly imports remain under 50 tonnes, your net liability is €0.00.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
                        <div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Carbon Emitted</div>
                          <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-200">{calculation.actEmissions.toLocaleString('en-IE', {maximumFractionDigits:0})} <span className="text-xs sm:text-sm">tCO₂e</span></div>
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Cost (Euros)</div>
                          <div className={`text-3xl sm:text-4xl font-mono font-black ${volume < 50 && selectedProduct?.id !== 'hydrogen' && selectedProduct?.id !== 'electricity' ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-emerald-400'}`}>{calculation.actNet2026.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}</div>
                          <div className="text-xs sm:text-sm font-medium text-slate-400 mt-1">Cost per tonne: {calculation.actPerTonne.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}</div>
                        </div>
                      </div>

                      {/* CLEAR PDF & XML EXPORT BUTTONS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <button onClick={generatePDF} disabled={isDownloading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 sm:py-4 px-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 text-xs sm:text-sm disabled:opacity-50 border border-blue-400">
                          {isDownloading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                          Download PDF Report
                        </button>
                        <button onClick={generateSingleXML} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 sm:py-4 px-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 text-xs sm:text-sm border border-slate-600">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          Export Annual XML
                        </button>
                      </div>

                      <button onClick={addToPortfolio} className="w-full mt-5 sm:mt-6 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 sm:py-5 px-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex justify-center items-center gap-2 sm:gap-3 text-sm sm:text-lg border border-emerald-400">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        Save Calculation to Portfolio
                      </button>
                    </div>
                  </div>

                  {/* Forecast Line Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 hidden sm:block">
                    <h3 className="font-black text-lg sm:text-xl text-slate-900 mb-2 sm:mb-6">Future Cost Projection (2026 - 2034)</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">The EU phases out free allowances every year. Here is what this exact shipment will cost you in the future.</p>
                    <div className="h-[200px] sm:h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={calculation.forecast} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(val) => `€${(val / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip formatter={(value: any) => Number(value).toLocaleString('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits:0 })} />
                          <Line type="monotone" dataKey="Cost Exposure" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PORTFOLIO AGGREGATOR */}
        {activeAppTab === 'portfolio' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-8 min-h-[500px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 border-b border-slate-100 pb-4 sm:pb-6 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">My Saved Portfolio</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Review your combined shipments and export your 2026 annual XML declaration.</p>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-none border-slate-200">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Corporate Liability</div>
                <div className="text-2xl sm:text-4xl font-black text-indigo-700 font-mono">
                  {totalCorporateLiability.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            </div>

            {isExempt && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-start gap-3 shadow-sm">
                    <svg className="w-6 h-6 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">De Minimis Exemption Active</h4>
                        <p className="text-xs sm:text-sm text-emerald-700 mt-1">Your total annual volume of applicable goods ({exemptableVolume.toLocaleString()} tonnes) is below the 50-tonne threshold. Under Regulation (EU) 2025/2083, these items are completely exempt from CBAM financial obligations.</p>
                    </div>
                </div>
            )}

            {portfolio.length === 0 ? (
              <div className="text-center py-16 sm:py-20 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 px-4">
                <p className="text-slate-500 font-bold text-base sm:text-lg mb-2">Your portfolio is currently empty.</p>
                <p className="text-slate-400 text-xs sm:text-sm">Use the Calculator or Bulk Import tab to start adding shipments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full pb-4">
                <table className="w-full text-xs sm:text-sm text-left border-collapse mb-6 min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-300">
                      <th className="p-3 sm:p-4 font-bold">Product (CN)</th>
                      <th className="p-3 sm:p-4 text-right font-bold">Volume</th>
                      <th className="p-3 sm:p-4 text-right font-bold bg-indigo-50 text-indigo-900">Total CBAM Cost</th>
                      <th className="p-3 sm:p-4 text-center font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item) => {
                      const itemIsExempt = isExempt && item.product.id !== 'hydrogen' && item.product.id !== 'electricity';
                      return (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 sm:p-4 text-slate-800 font-bold">{item.product.name} <span className="text-[10px] sm:text-xs text-slate-400 font-normal block mt-0.5">CN: {item.product.cn} | Source: {item.supplier}</span></td>
                          <td className="p-3 sm:p-4 text-right font-mono text-slate-500">{item.volume.toLocaleString('en-IE')} t</td>
                          <td className="p-3 sm:p-4 text-right font-mono font-black text-indigo-700 bg-indigo-50/30">
                            {itemIsExempt ? (
                                <span className="text-emerald-600 line-through decoration-emerald-500/50">€0.00 <span className="text-[10px] block uppercase font-bold mt-1">Exempt</span></span>
                            ) : (
                                item.netCost.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })
                            )}
                          </td>
                          <td className="p-3 sm:p-4 text-center">
                            <button onClick={() => deleteFromPortfolio(item.id)} className="text-slate-400 hover:text-red-600 transition-colors p-2" title="Remove Item">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
                  <button onClick={()=>setPortfolio([])} className="w-full sm:w-auto px-6 py-3 sm:py-4 font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 sm:border-none text-sm">Clear All</button>
                  <button onClick={exportPortfolioXml} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-emerald-400 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 text-sm">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Annual XML
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ERP SYNC */}
        {activeAppTab === 'erp' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
            <div className="bg-indigo-100 text-indigo-600 p-3 sm:p-4 rounded-full mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3">Bulk CSV Upload</h2>
            <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto mb-6 sm:mb-8 font-medium px-4">Upload a CSV extract from your ERP software. Ensure columns are named exactly: <code>Supplier</code>, <code>CN_Code</code>, and <code>Tonnes</code>.</p>
            
            <input type="file" accept=".csv" className="hidden" ref={erpFileInputRef} onChange={handleErpCsvUpload} />
            <button onClick={() => erpFileInputRef.current?.click()} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 sm:py-4 px-6 sm:px-10 rounded-xl shadow-lg transition-transform hover:scale-105 text-base sm:text-lg">
              Select Bulk CSV File
            </button>
          </div>
        )}

        {/* --- THE SEO GOLDMINE (VISIBLE FAQ & GUIDE) --- */}
        <div className="mt-12 sm:mt-16 bg-white border-t border-slate-200 pt-10 sm:pt-16 pb-10 sm:pb-12 px-5 sm:px-8 rounded-t-3xl shadow-sm">
          <div className="max-w-4xl mx-auto prose prose-slate">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 sm:mb-6">The Ultimate EU CBAM Calculator 2026 Guide</h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              If your business imports carbon-intensive goods into the European Union, calculating your exact financial liability is no longer optional. With the definitive phase beginning in January 2026, importers must purchase and surrender certificates. Our <strong>EU CBAM calculator 2026</strong> is designed to help you instantly understand and estimate your financial exposure.
            </p>
            
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-6 sm:mt-8 mb-3 sm:mb-4">How do you calculate CBAM liability?</h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              To accurately <strong>calculate CBAM liability</strong>, you must determine the total embedded emissions of your imported goods (such as steel, cement, or aluminum). You then multiply that volume by the current weekly EU ETS carbon price. Finally, you adjust for the specific phase-in factor for the current year (which is 2.5% in 2026). Our <strong>CBAM certificate cost estimator</strong> handles all of this math automatically in your browser.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-6 sm:mt-8 mb-3 sm:mb-4">How does the 50-Tonne Exemption work?</h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Regulation (EU) 2025/2083 introduced a critical update for importers: the 50-tonne de minimis threshold. This rule automatically exempts you from all financial and reporting obligations if your total annual volume of CBAM goods (excluding electricity and hydrogen) remains under 50 tonnes. Our built-in portfolio aggregator automatically tracks your annual volume and zero-rates your certificate costs if you qualify for the exemption.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-6 sm:mt-8 mb-3 sm:mb-4">Can I export my data for the EU Registry?</h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Yes. After running your calculations, simply click "Export Annual XML". The tool will automatically format your shipment data into the strict annual XML declaration schema required by the European Commission's CBAM Transitional Registry, which is due by September 30th of the following year.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}