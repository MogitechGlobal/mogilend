import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    Clock, CheckCircle2, XCircle, AlertCircle,
    Search, FileText, User, CreditCard, Loader2, X
} from 'lucide-react';

export const ApprovalsPendingPage = () => {
    const [pendingLoans, setPendingLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Review Drawer State
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const loadPendingApprovals = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/loans/pending');
            setPendingLoans(response.data);
        } catch (error) {
            console.error('Failed to load pending approvals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPendingApprovals();
    }, []);

    const handleAction = async (loanId: string, status: 'APPROVED' | 'REJECTED' | 'AMENDMENT_REQUIRED') => {
        // Dynamically set the confirmation text based on the action
        let actionText = '';
        if (status === 'APPROVED') actionText = 'approve';
        else if (status === 'REJECTED') actionText = 'reject';
        else actionText = 'request an amendment for';

        if (!window.confirm(`Are you sure you want to ${actionText} this loan application?`)) return;

        setIsProcessing(true);
        try {
            await api.patch(`/loans/${loanId}/status`, { status });
            setIsDrawerOpen(false);
            loadPendingApprovals(); // Refresh the queue
        } catch (error: any) {
            alert(error.response?.data?.message || `Failed to ${actionText} loan.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const openReview = (loan: any) => {
        setSelectedLoan(loan);
        setIsDrawerOpen(true);
    };

    const filteredLoans = pendingLoans.filter(loan =>
        `${loan.borrower?.first_name} ${loan.borrower?.last_name} ${loan.borrower?.national_id}`
            .toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pending Approvals</h1>
                    <p className="text-slate-500 font-medium mt-1">Review and authorize pending loan facilities awaiting disbursement.</p>
                </div>
            </div>

            {/* Main Queue */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <div className="relative group w-full max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search by borrower name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                    </div>
                    <div className="flex items-center space-x-2 text-sm font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                        <Clock size={16} /> <span>{pendingLoans.length} Awaiting Review</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
                        <p className="font-bold">Loading approval queue...</p>
                    </div>
                ) : filteredLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                        <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
                        <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                        <p className="text-slate-500 text-sm mt-1">There are no pending loan applications requiring your attention.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="p-5 pl-6">Borrower</th>
                                    <th className="p-5">Facility Details</th>
                                    <th className="p-5 text-right">Requested Capital</th>
                                    <th className="p-5 text-center">System Risk</th>
                                    <th className="p-5 text-right pr-6">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLoans.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 pl-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm uppercase border border-slate-200 shrink-0">
                                                    {loan.borrower.first_name[0]}{loan.borrower.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{loan.borrower.first_name} {loan.borrower.last_name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {loan.borrower.national_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-sm font-bold text-slate-700">{loan.loan_product.name}</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wide">
                                                {loan.interest_rate}% {loan.loan_product.interest_type.replace('_', ' ')} • {loan.loan_product.default_term} DAYS
                                            </p>
                                        </td>
                                        <td className="p-5 text-right">
                                            <p className="text-sm font-black text-slate-900">KES {loan.principal_amount.toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Total Owed: KES {loan.total_owed.toLocaleString()}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${loan.borrower.risk_score < 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                loan.borrower.risk_score < 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                Score: {loan.borrower.risk_score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right pr-6">
                                            <button onClick={() => openReview(loan)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- REVIEW SLIDE-OUT DRAWER --- */}
            {isDrawerOpen && selectedLoan && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsDrawerOpen(false)}></div>
                    <div className="bg-white w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col animate-fade-in translate-x-0 border-l border-slate-200">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#0B1121] text-white">
                            <div className="flex items-center space-x-3">
                                <FileText className="text-blue-400" size={24} />
                                <h2 className="text-xl font-black tracking-tight">Application Review</h2>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">

                            {/* Profile Context */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><User size={14} className="mr-1.5" /> Borrower Identity</h4>
                                <h3 className="text-lg font-black text-slate-900">{selectedLoan.borrower.first_name} {selectedLoan.borrower.last_name}</h3>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm text-slate-600 font-medium">National ID: <span className="font-mono text-slate-900">{selectedLoan.borrower.national_id}</span></p>
                                    <p className="text-sm text-slate-600 font-medium">Contact: <span className="font-mono text-slate-900">{selectedLoan.borrower.phone_number}</span></p>
                                </div>
                            </div>

                            {/* Financial Context */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><CreditCard size={14} className="mr-1.5" /> Facility Terms</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 mb-0.5">Product</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedLoan.loan_product.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 mb-0.5">Term Limit</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedLoan.loan_product.default_term} Days</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">Principal Requested</span>
                                        <span className="text-sm font-black text-slate-900">KES {selectedLoan.principal_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-slate-600">Expected Interest ({selectedLoan.interest_rate}%)</span>
                                        <span className="text-sm font-black text-slate-900">KES {(selectedLoan.total_owed - selectedLoan.principal_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-sm font-black text-slate-900">Total Obligation</span>
                                        <span className="text-lg font-black text-blue-600">KES {selectedLoan.total_owed.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warnings */}
                            {selectedLoan.borrower.risk_score >= 50 && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start space-x-3">
                                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h5 className="text-sm font-bold text-red-900">High Risk Indicator</h5>
                                        <p className="text-xs font-medium text-red-700 mt-1">This applicant has a system risk score of {selectedLoan.borrower.risk_score.toFixed(1)}. Please ensure manual KYC verification is complete before approval.</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Action Footer */}
                        <div className="p-6 bg-white border-t border-slate-200 flex space-x-3 shrink-0">
                            <button onClick={() => handleAction(selectedLoan.id, 'REJECTED')} disabled={isProcessing} className="flex-1 flex justify-center items-center py-3.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                                <XCircle size={18} className="mr-2 hidden md:block" /> Reject
                            </button>

                            {/* NEW BUTTON: Send to Amendments Queue */}
                            <button onClick={() => handleAction(selectedLoan.id, 'AMENDMENT_REQUIRED')} disabled={isProcessing} className="flex-1 flex justify-center items-center py-3.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50">
                                <AlertCircle size={18} className="mr-2 hidden md:block" /> Amend
                            </button>

                            <button onClick={() => handleAction(selectedLoan.id, 'APPROVED')} disabled={isProcessing} className="flex-[2] flex justify-center items-center py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50">
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} className="mr-2" /> Approve</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};