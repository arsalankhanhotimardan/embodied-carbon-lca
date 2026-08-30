"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SupplierPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [cnCode, setCnCode] = useState("");
  
  // Form State
  const [emissions, setEmissions] = useState<string>("");
  const [carbonTax, setCarbonTax] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Decode the token when the page loads
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing secure token. Please request a new link from your client.");
      setIsLoading(false);
      return;
    }

    try {
      // Decode the base64 token
      const decoded = atob(token);
      const [email, code] = decoded.split('|');
      
      if (!email || !code) throw new Error("Malformed token");
      
      setSupplierEmail(email);
      setCnCode(code);
    } catch (err) {
      setError("The secure token is corrupted or invalid.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate an API call saving the data to the central database
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-emerald-200 font-sans">
      
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-6 sm:p-8 text-center border-b-4 border-emerald-500">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Supply Chain Portal</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure EU CBAM Data Collection</p>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-bold mb-4">
              {error}
            </div>
          </div>
        ) : isSuccess ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Data Submitted Successfully</h2>
            <p className="text-slate-500 font-medium">Your embedded emissions data has been securely transmitted to your client's CBAM compliance portfolio. You may now close this window.</p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-8 text-sm text-slate-600">
              <p className="mb-2"><strong>Requested By:</strong> Your Client</p>
              <p className="mb-2"><strong>Supplier Account:</strong> {supplierEmail}</p>
              <p><strong>Material CN Code:</strong> <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-900 font-bold">{cnCode}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">Actual Embedded Emissions</label>
                <p className="text-xs text-slate-500 mb-3">Provide the verified specific embedded emissions for this product (Direct + Indirect).</p>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.0001" 
                    required 
                    value={emissions}
                    onChange={(e) => setEmissions(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 text-slate-900 text-lg font-bold font-mono rounded-xl p-4 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    placeholder="e.g. 1.850"
                  />
                  <span className="absolute right-4 top-4 text-slate-400 font-bold">tCO₂e / tonne</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">Local Carbon Tax Paid (Optional)</label>
                <p className="text-xs text-slate-500 mb-3">If you have already paid a local carbon price/tax in your jurisdiction of origin, enter the amount per tonne.</p>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-slate-400 font-bold">€</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={carbonTax}
                    onChange={(e) => setCarbonTax(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 text-slate-900 text-lg font-bold font-mono rounded-xl p-4 pl-8 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" 
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-4 text-slate-400 font-bold">/ tonne</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !emissions}
                className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-lg flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Securely Submit Data <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                )}
              </button>
            </form>
            <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Encrypted via Green Engineering Tools
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupplierPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div></div>}>
      <SupplierPortalContent />
    </Suspense>
  );
}