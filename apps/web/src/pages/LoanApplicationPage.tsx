import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
  User, Package, Banknote, CalendarDays,
  ArrowRight, ShieldCheck, AlertCircle, FileText,
  Calculator, CheckCircle2, Loader2, Info
} from 'lucide-react';

export const LoanApplicationPage = ({
  onNavigate
}: {
  onNavigate: (path: any) => void
}) => {
  const user = useAuthStore((state: any) => state.user);

  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedBorrower, setSelectedBorrower] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [term, setTerm] = useState<number | ''>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
        const query = `?lender_id=${activeLenderId}`;

        const [bRes, pRes] = await Promise.all([
          api.get(`/borrowers${query}`),
          api.get(`/loan-products${query}`)
        ]);

        // Only show verified customers for new loans
        setBorrowers(bRes.data.filter((b: any) => b.kyc_status === 'VERIFIED' || !b.kyc_status));
        // Temporarily show all borrowers during development
        //setBorrowers(bRes.data);
        setProducts(pRes.data.filter((p: any) => p.is_active));
      } catch (err: any) {
        console.error('Failed to load application data:', err);
        setErrorMsg('Failed to load system configurations. Please check connection.');
      } finally {
        setLoadingData(false);
      }
    };

    if (user) loadData();
  }, [user]);

  // Auto-fill configuration when a product is selected
  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product);
    if (product) {
      setTerm(product.default_term);
      if (!amount || amount < product.min_amount) {
        setAmount(product.min_amount);
      }
    } else {
      setTerm('');
    }
  };

  // Validation Logic
  const isAmountValid = selectedProduct && typeof amount === 'number'
    ? amount >= selectedProduct.min_amount && amount <= selectedProduct.max_amount
    : false;

  // Financial Engine
  const calculateInterest = () => {
    if (!selectedProduct || typeof amount !== 'number' || typeof term !== 'number') return 0;
    // Flat Rate Logic: Principal * (Rate / 100) * Term
    return amount * (selectedProduct.interest_rate / 100) * term;
  };

  const calculateTotal = () => {
    const principal = typeof amount === 'number' ? amount : 0;
    return principal + calculateInterest();
  };

  const calculateInstallment = () => {
    const t = typeof term === 'number' && term > 0 ? term : 1;
    return calculateTotal() / t;
  };

  const handleOriginate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedBorrower || !selectedProduct) {
      setErrorMsg('Please select both a borrower and a loan product.');
      return;
    }
    if (!isAmountValid) {
      setErrorMsg(`Amount must be between KES ${selectedProduct.min_amount} and ${selectedProduct.max_amount}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/loans/originate', {
        borrower_id: selectedBorrower,
        loan_product_id: selectedProduct.id,
        principal_amount: amount,
        term: term,
        lender_id: user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'
      });

      setSuccess(true);
      setTimeout(() => {
        onNavigate('disbursements'); // Redirect to Queue after success
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Application failed due to system constraints.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto mt-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Application Submitted</h2>
        <p className="text-slate-500 text-lg font-medium">The loan agreement has been generated and sent to the Disbursement Queue for managerial approval.</p>
        <div className="mt-8 flex justify-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">New Loan Origination</h1>
        <p className="text-slate-500 font-medium mt-1">Configure and generate a new credit agreement for a verified customer.</p>
      </div>

      {errorMsg && (
        <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start space-x-3 text-red-700 animate-fade-in">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="font-bold text-sm">{errorMsg}</p>
        </div>
      )}

      {loadingData ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
          <p className="text-slate-500 font-bold">Loading configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Form Section */}
          <div className="xl:col-span-2 order-2 xl:order-1 space-y-6">
            <form onSubmit={handleOriginate} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">

              {/* Step 1: Customer */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Borrower Identity</h2>
                    <p className="text-xs text-slate-500 font-medium">Select a fully verified customer.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                    onChange={(e) => setSelectedBorrower(e.target.value)}
                    value={selectedBorrower}
                    required
                  >
                    <option value="" disabled>-- Search & Select Verified Client --</option>
                    {borrowers.map(b => (
                      <option key={b.id} value={b.id}>{b.first_name} {b.last_name} — ID: {b.national_id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Product & Financials */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Package size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Product Configuration</h2>
                    <p className="text-xs text-slate-500 font-medium">Select the facility type and define parameters.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">Facility Type</label>
                    <select
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                      onChange={(e) => handleProductChange(e.target.value)}
                      value={selectedProduct?.id || ''}
                      required
                    >
                      <option value="" disabled>-- Select Loan Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Rate: {p.interest_rate}% {p.interest_type})</option>
                      ))}
                    </select>

                    {selectedProduct && (
                      <div className="mt-2 flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                        <Info size={14} className="mr-1.5 shrink-0" />
                        Approved Limits: KES {Number(selectedProduct.min_amount).toLocaleString()} - KES {Number(selectedProduct.max_amount).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex justify-between">
                        <span>Principal Request</span>
                        {selectedProduct && !isAmountValid && amount !== '' && (
                          <span className="text-red-500 text-xs">Outside Limits!</span>
                        )}
                      </label>
                      <div className="relative">
                        <Banknote size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${selectedProduct && !isAmountValid && amount !== '' ? 'text-red-400' : 'text-slate-400'}`} />
                        <input
                          type="number" required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          disabled={!selectedProduct}
                          className={`w-full pl-11 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none transition-all text-base font-mono font-black ${selectedProduct && !isAmountValid && amount !== ''
                            ? 'border-red-300 focus:ring-red-500 text-red-900 bg-red-50/30'
                            : 'border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900'
                            }`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 block">Term Duration</label>
                      <div className="relative">
                        <CalendarDays size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number" required min="1"
                          value={term}
                          onChange={(e) => setTerm(e.target.value === '' ? '' : Number(e.target.value))}
                          disabled={!selectedProduct}
                          className="w-full pl-11 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base font-bold text-slate-900"
                          placeholder="1"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {selectedProduct?.repayment_cycle === 'Weekly' ? 'Wks' : 'Mos'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-8 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center text-slate-500 text-xs font-medium">
                  <ShieldCheck size={16} className="mr-1.5 text-emerald-500" /> All inputs secured
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !isAmountValid || !selectedBorrower || !selectedProduct}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none outline-none"
                >
                  {isSubmitting ? (
                    <><Loader2 size={20} className="animate-spin" /><span>Generating...</span></>
                  ) : (
                    <><span>Submit Application</span> <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Repayment Preview */}
          <div className="xl:col-span-1 order-1 xl:order-2">
            <div className="bg-[#0B1121] text-white p-8 rounded-3xl shadow-2xl sticky top-24 border border-slate-800">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                <h2 className="text-xl font-black text-blue-400 flex items-center">
                  <Calculator size={20} className="mr-2" /> Live Summary
                </h2>
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md uppercase tracking-widest font-black border border-blue-500/30">
                  Estimate
                </span>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-sm font-medium">Principal Request</span>
                  <span className="text-white font-mono font-bold text-lg">KES {(typeof amount === 'number' ? amount : 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-sm font-medium">Interest Engine</span>
                  <span className="text-white font-mono font-bold text-sm bg-white/10 px-2 py-1 rounded-lg border border-white/5">
                    {selectedProduct?.interest_rate || 0}% {selectedProduct?.interest_type === 'Flat Rate' ? '(Flat)' : '(Red. Bal)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-sm font-medium">Expected Interest</span>
                  <span className="text-amber-400 font-mono font-bold">KES {calculateInterest().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Total Repayable</span>
                  <span className="text-4xl font-black text-emerald-400 tracking-tight">KES {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mt-6 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Est. Installment</p>
                    <p className="text-xs text-slate-500">{term || 1} {selectedProduct?.repayment_cycle || 'Monthly'} Payments</p>
                  </div>
                  <div className="text-right text-lg font-black text-white">
                    KES {calculateInstallment().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-start text-slate-500 text-[10px] leading-relaxed">
                <FileText size={14} className="mr-2 shrink-0 mt-0.5" />
                <p>
                  This calculation provides a preliminary estimate based on the standard <strong>{selectedProduct?.interest_type || 'Flat Rate'}</strong> model. The finalized, legally binding amortization schedule will be generated automatically upon executive approval in the disbursement queue.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};