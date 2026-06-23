import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, ArrowUpRight, ArrowDownRight, RefreshCcw, DollarSign, Wallet, Loader, Activity } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'https://nexus-app-full-stack.vercel.app';

export const PaymentsPage: React.FC = () => {
  const { token, user } = useAuth() as any;
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchPaymentData = useCallback(async () => {
    try {
      const [balRes, transRes] = await Promise.all([
        axios.get(`${API}/api/payments/balance`, authHeaders),
        axios.get(`${API}/api/payments`, authHeaders)
      ]);
      setBalance(balRes.data.balance);
      setTransactions(transRes.data);
    } catch (err) {
      console.error('Fetch payment error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchPaymentData();
  }, [token, fetchPaymentData]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post(`${API}/api/payments/deposit`, { amount: Number(amount), description: 'Stripe Mock Deposit' }, authHeaders);
      toast.success('Funds deposited successfully');
      setShowDeposit(false);
      setAmount('');
      fetchPaymentData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post(`${API}/api/payments/withdraw`, { amount: Number(amount), description: 'Bank Transfer Mock Withdrawal' }, authHeaders);
      toast.success('Funds withdrawn successfully');
      setShowWithdraw(false);
      setAmount('');
      fetchPaymentData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string, isSender: boolean) => {
    if (type === 'deposit') return <ArrowDownRight size={20} className="text-green-500" />;
    if (type === 'withdraw') return <ArrowUpRight size={20} className="text-red-500" />;
    if (type === 'transfer' && isSender) return <ArrowUpRight size={20} className="text-orange-500" />;
    if (type === 'transfer' && !isSender) return <ArrowDownRight size={20} className="text-green-500" />;
    return <Activity size={20} className="text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
          <p className="text-gray-600">Manage your mock deposits, withdrawals, and transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white md:col-span-1 shadow-lg border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Wallet size={80} />
          </div>
          <CardBody className="relative z-10 p-6 flex flex-col h-full justify-between">
            <div>
              <p className="text-primary-100 font-medium">Available Balance</p>
              <h2 className="text-4xl font-bold mt-2 flex items-center">
                <DollarSign size={36} className="opacity-80" />
                {balance.toLocaleString()}
              </h2>
            </div>
            <div className="flex gap-3 mt-8">
              <Button
                className="flex-1 bg-white text-primary-700 hover:bg-gray-100 border-0"
                onClick={() => setShowDeposit(true)}
              >
                Deposit
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-white border-white hover:bg-primary-700 hover:text-white"
                onClick={() => setShowWithdraw(true)}
              >
                Withdraw
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Quick Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <Card className="flex items-center p-6">
            <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Received</p>
              <h3 className="text-xl font-bold text-gray-900">
                ${transactions.filter(t => t.type === 'deposit' || (t.type === 'transfer' && t.recipient?._id === user?.id)).reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
              </h3>
            </div>
          </Card>
          <Card className="flex items-center p-6">
            <div className="p-3 bg-red-100 rounded-full text-red-600 mr-4">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Spent</p>
              <h3 className="text-xl font-bold text-gray-900">
                ${transactions.filter(t => t.type === 'withdraw' || (t.type === 'transfer' && t.user?._id === user?.id)).reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
              </h3>
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="flex justify-between items-center bg-gray-50 border-b">
          <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
          <Button variant="outline" size="sm" onClick={fetchPaymentData} leftIcon={<RefreshCcw size={16} />}>Refresh</Button>
        </CardHeader>
        <CardBody className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-gray-500 font-medium">No transactions found</h3>
              <p className="text-sm text-gray-400">Your mock transaction history will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map(t => {
                const isSender = t.user?._id === user?.id;
                return (
                  <div key={t._id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {getTransactionIcon(t.type, isSender)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {t.type}
                          {t.type === 'transfer' && (isSender ? ` to ${t.recipient?.name}` : ` from ${t.user?.name}`)}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</p>
                        {t.referenceId && <p className="text-[10px] text-gray-400 font-mono mt-0.5">Ref: {t.referenceId}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        (t.type === 'deposit') || (t.type === 'transfer' && !isSender)
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}>
                        {(t.type === 'deposit') || (t.type === 'transfer' && !isSender) ? '+' : '-'}${t.amount.toLocaleString()}
                      </p>
                      <Badge variant={t.status === 'Completed' ? 'success' : t.status === 'Failed' ? 'danger' : 'warning'} size="sm">
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <ArrowDownRight className="text-green-500" /> Mock Deposit
              </h3>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Enter amount to deposit"
                  />
                  <p className="text-xs text-gray-500 mt-2">This is a sandbox simulation. No real money will be deducted.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeposit(false)} type="button">Cancel</Button>
                  <Button className="flex-1" type="submit" isLoading={isProcessing}>Deposit</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <ArrowUpRight className="text-red-500" /> Mock Withdraw
              </h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Enter amount to withdraw"
                  />
                  <p className="text-xs text-gray-500 mt-2">Available to withdraw: ${balance.toLocaleString()}</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(false)} type="button">Cancel</Button>
                  <Button className="flex-1" type="submit" isLoading={isProcessing}>Withdraw</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
