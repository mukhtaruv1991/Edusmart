import React, { useState, useEffect } from 'react';
import { useStore } from '../../../lib/store';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DollarSign, Plus, Trash2, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  createdAt: any;
}

export default function FinancialsManagement() {
  const { user, language } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (!user?.school) return;

    const q = query(
      collection(db, 'transactions'),
      where('school', '==', user.school)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Transaction[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      // Sort by date descending
      fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching transactions:', error);
      toast.error(language === 'en' ? 'Failed to load transactions' : 'فشل في تحميل المعاملات');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        title,
        amount: parseFloat(amount),
        type,
        category,
        date,
        school: user.school,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'en' ? 'Transaction added successfully' : 'تم إضافة المعاملة بنجاح');
      setIsAdding(false);
      setTitle('');
      setAmount('');
      setType('income');
      setCategory('');
      setDate('');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error(language === 'en' ? 'Failed to add transaction' : 'فشل في إضافة المعاملة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === 'en' ? 'Are you sure you want to delete this transaction?' : 'هل أنت متأكد أنك تريد حذف هذه المعاملة؟')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast.success(language === 'en' ? 'Transaction deleted successfully' : 'تم حذف المعاملة بنجاح');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(language === 'en' ? 'Failed to delete transaction' : 'فشل في حذف المعاملة');
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ar-SA', {
      style: 'currency',
      currency: 'USD' // Assuming USD for now, could be dynamic
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            {language === 'en' ? 'Financials & Expenses' : 'المالية والمصروفات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {language === 'en' ? 'Manage school income and expenses' : 'إدارة إيرادات ومصروفات المدرسة'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{language === 'en' ? 'Add Transaction' : 'إضافة معاملة'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">
              {language === 'en' ? 'Total Balance' : 'إجمالي الرصيد'}
            </h3>
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(balance)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">
              {language === 'en' ? 'Total Income' : 'إجمالي الإيرادات'}
            </h3>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <ArrowDownRight className="w-6 h-6" />
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 font-medium">
              {language === 'en' ? 'Total Expenses' : 'إجمالي المصروفات'}
            </h3>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {language === 'en' ? 'Add New Transaction' : 'إضافة معاملة جديدة'}
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Title' : 'العنوان'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., Teacher Salary' : 'مثال: راتب معلم'}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Amount' : 'المبلغ'}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Type' : 'النوع'}
                </label>
                <select
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="income">{language === 'en' ? 'Income' : 'إيراد'}</option>
                  <option value="expense">{language === 'en' ? 'Expense' : 'مصروف'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Category' : 'الفئة'}
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">{language === 'en' ? 'Select Category' : 'اختر الفئة'}</option>
                  {type === 'income' ? (
                    <>
                      <option value="tuition">{language === 'en' ? 'Tuition Fees' : 'رسوم دراسية'}</option>
                      <option value="donation">{language === 'en' ? 'Donations' : 'تبرعات'}</option>
                      <option value="other_income">{language === 'en' ? 'Other Income' : 'إيرادات أخرى'}</option>
                    </>
                  ) : (
                    <>
                      <option value="salary">{language === 'en' ? 'Salaries' : 'رواتب'}</option>
                      <option value="maintenance">{language === 'en' ? 'Maintenance' : 'صيانة'}</option>
                      <option value="supplies">{language === 'en' ? 'Supplies' : 'مستلزمات'}</option>
                      <option value="utilities">{language === 'en' ? 'Utilities' : 'فواتير'}</option>
                      <option value="other_expense">{language === 'en' ? 'Other Expense' : 'مصروفات أخرى'}</option>
                    </>
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'en' ? 'Date' : 'التاريخ'}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {language === 'en' ? 'Save Transaction' : 'حفظ المعاملة'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Title' : 'العنوان'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Category' : 'الفئة'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Date' : 'التاريخ'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">{language === 'en' ? 'Amount' : 'المبلغ'}</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">{language === 'en' ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'Loading transactions...' : 'جاري تحميل المعاملات...'}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {language === 'en' ? 'No transactions found.' : 'لم يتم العثور على معاملات.'}
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          t.type === 'income' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {t.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{t.title}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {t.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t.date}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`font-medium ${
                        t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={language === 'en' ? 'Delete' : 'حذف'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
