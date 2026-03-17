import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  onAuthStateChanged, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  User
} from './firebase';
import { 
  Course, 
  Program, 
  CourseStatus, 
  OperationType, 
  FirestoreErrorInfo 
} from './types';
import { 
  Plus, 
  Search, 
  Filter, 
  Archive, 
  Edit2, 
  Trash2, 
  LogOut, 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  History,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error Handler
const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// Error Boundary / Alert Component
const ErrorAlert = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <div className="text-sm font-medium">{message}</div>
      <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-full transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isManualAdmin, setIsManualAdmin] = useState(() => {
    return localStorage.getItem('spkk_admin_session') === 'true';
  });
  const [loginMode, setLoginMode] = useState<'google' | 'manual'>('google');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [manualLoginError, setManualLoginError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState<Program | 'Semua'>('Semua');
  const [filterStatus, setFilterStatus] = useState<CourseStatus | 'Semua'>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Check if authorized user
  const isAuthorized = (user?.email === 'm.syahmi.sam@gmail.com') || isManualAdmin;
  const isLoggedIn = !!user || isManualAdmin;

  // Firestore Listener
  useEffect(() => {
    if (!isLoggedIn) {
      setCourses([]);
      return;
    }

    const path = 'courses';
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      setCourses(courseData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return unsubscribe;
  }, [user, isManualAdmin]);

  // Filtering Logic
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = 
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProgram = filterProgram === 'Semua' || course.program === filterProgram;
      const matchesStatus = filterStatus === 'Semua' || course.status === filterStatus;
      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [courses, searchQuery, filterProgram, filterStatus]);

  // Activity Log (Last 5 updates)
  const activityLog = useMemo(() => {
    return [...courses]
      .sort((a, b) => b.updatedAt?.seconds - a.updatedAt?.seconds)
      .slice(0, 5);
  }, [courses]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Kod', 'Nama', 'Program', 'Kredit', 'Status', 'Dikemaskini Oleh'];
    const rows = filteredCourses.map(c => [
      c.code,
      c.name,
      c.program,
      c.credits,
      c.status,
      c.updatedBy
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Senarai_Kod_Kursus_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Fail CSV berjaya dimuat turun');
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: courses.length,
      aktif: courses.filter(c => c.status === 'Aktif').length,
      arkib: courses.filter(c => c.status === 'Arkib').length,
      diploma: courses.filter(c => c.program === 'Diploma').length,
      asasi: courses.filter(c => c.program === 'Asasi').length,
    };
  }, [courses]);

  // CRUD Actions
  const handleSaveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthorized) return;

    const formData = new FormData(e.currentTarget);
    const courseData: Partial<Course> = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      program: formData.get('program') as Program,
      credits: Number(formData.get('credits')),
      status: formData.get('status') as CourseStatus,
      description: formData.get('description') as string,
      updatedAt: new Date(),
      updatedBy: user?.email || 'Admin Manual',
    };

    try {
      if (editingCourse?.id) {
        await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
        showToast('Kursus berjaya dikemaskini');
      } else {
        const newDocRef = doc(collection(db, 'courses'));
        await setDoc(newDocRef, {
          ...courseData,
          createdAt: new Date(),
        });
        showToast('Kursus baru berjaya ditambah');
      }
      setIsModalOpen(false);
      setEditingCourse(null);
    } catch (err) {
      handleFirestoreError(err, editingCourse ? OperationType.UPDATE : OperationType.CREATE, 'courses');
      showToast('Gagal menyimpan data. Akses terhad.', 'error');
    }
  };

  const handleArchive = async (course: Course) => {
    if (!isAuthorized || !course.id) return;
    const newStatus: CourseStatus = course.status === 'Aktif' ? 'Arkib' : 'Aktif';
    try {
      await updateDoc(doc(db, 'courses', course.id), {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.email || 'Admin Manual'
      });
      showToast(`Kursus berjaya di${newStatus.toLowerCase()}kan`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${course.id}`);
      showToast('Gagal mengarkib. Akses terhad.', 'error');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!isAuthorized || !window.confirm('Adakah anda pasti mahu memadam kod kursus ini?')) return;
    try {
      await deleteDoc(doc(db, 'courses', courseId));
      showToast('Kursus berjaya dipadam');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
      showToast('Gagal memadam. Akses terhad.', 'error');
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUsername === 'CPPBPT' && manualPassword === '12345') {
      setIsManualAdmin(true);
      localStorage.setItem('spkk_admin_session', 'true');
      setManualLoginError('');
      showToast('Log masuk manual berjaya');
    } else {
      setManualLoginError('Username atau Password salah.');
    }
  };

  const handleLogout = () => {
    if (isManualAdmin) {
      setIsManualAdmin(false);
      localStorage.removeItem('spkk_admin_session');
    } else {
      logout();
    }
    showToast('Anda telah log keluar');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user && !isManualAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 technical-grid">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
        >
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">SPKK Jabatan</h1>
          <p className="text-slate-500 text-center mb-8">Sistem Pengurusan Kod Kursus. Sila log masuk untuk menguruskan data.</p>
          
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button 
              onClick={() => setLoginMode('google')}
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", 
                loginMode === 'google' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Google
            </button>
            <button 
              onClick={() => setLoginMode('manual')}
              className={cn("flex-1 py-2 text-sm font-semibold rounded-lg transition-all", 
                loginMode === 'manual' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Admin Manual
            </button>
          </div>

          {loginMode === 'google' ? (
            <button 
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Log Masuk dengan Google
            </button>
          ) : (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                <input 
                  type="text"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Username"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <input 
                  type="password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>
              {manualLoginError && (
                <p className="text-xs text-red-600 font-medium">{manualLoginError}</p>
              )}
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-100"
              >
                Log Masuk Admin
              </button>
            </form>
          )}
          
          <p className="mt-6 text-xs text-center text-slate-400">
            Akses terhad kepada pegawai yang dibenarkan sahaja.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={cn("px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold", 
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white")}>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 hidden sm:block">SPKK Jabatan</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900">
                  {isManualAdmin ? 'Admin Manual (CPPBPT)' : user?.displayName}
                </span>
                <span className="text-xs text-slate-500">
                  {isManualAdmin ? 'Akses Khas' : user?.email}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Log Keluar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar / Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Statistik</h3>
              <div className="space-y-4">
                {[
                  { label: 'Jumlah', value: stats.total, color: 'indigo' },
                  { label: 'Aktif', value: stats.aktif, color: 'emerald' },
                  { label: 'Arkib', value: stats.arkib, color: 'slate' },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-end">
                    <span className="text-sm text-slate-500">{s.label}</span>
                    <span className={cn("text-xl font-bold", {
                      'text-indigo-600': s.color === 'indigo',
                      'text-emerald-600': s.color === 'emerald',
                      'text-slate-600': s.color === 'slate',
                    })}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Aktiviti Terkini</h3>
              <div className="space-y-4">
                {activityLog.map((log, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{log.code} dikemaskini</div>
                      <div className="text-slate-400">{log.updatedBy.split('@')[0]} • Baru tadi</div>
                    </div>
                  </div>
                ))}
                {activityLog.length === 0 && <div className="text-xs text-slate-400">Tiada aktiviti dikesan.</div>}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Cari kod atau nama kursus..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Eksport CSV
                </button>
                {isAuthorized && (
                  <button 
                    onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
                    className="flex-shrink-0 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kod & Nama</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Program</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {filteredCourses.map((course) => (
                        <motion.tr 
                          key={course.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 font-mono">{course.code}</div>
                            <div className="text-sm text-slate-500">{course.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", {
                              'bg-violet-100 text-violet-700': course.program === 'Diploma',
                              'bg-orange-100 text-orange-700': course.program === 'Asasi',
                            })}>
                              {course.program}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", {
                              'bg-emerald-100 text-emerald-700': course.status === 'Aktif',
                              'bg-slate-100 text-slate-700': course.status === 'Arkib',
                            })}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", {
                                'bg-emerald-500': course.status === 'Aktif',
                                'bg-slate-400': course.status === 'Arkib',
                              })} />
                              {course.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAuthorized ? (
                                <>
                                  <button 
                                    onClick={() => handleArchive(course)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title={course.status === 'Aktif' ? 'Arkibkan' : 'Aktifkan'}
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(course.id!)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Padam"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Lihat sahaja</span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>


      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCourse ? 'Kemaskini Kod Kursus' : 'Tambah Kod Kursus Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Kod Kursus</label>
                    <input 
                      name="code"
                      required
                      defaultValue={editingCourse?.code}
                      placeholder="cth: ACC101"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Jam Kredit</label>
                    <input 
                      name="credits"
                      type="number"
                      required
                      min="0"
                      max="10"
                      defaultValue={editingCourse?.credits || 3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nama Kursus</label>
                  <input 
                    name="name"
                    required
                    defaultValue={editingCourse?.name}
                    placeholder="cth: Pengenalan Perakaunan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Program</label>
                    <select 
                      name="program"
                      defaultValue={editingCourse?.program || 'Diploma'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Diploma">Diploma</option>
                      <option value="Asasi">Asasi</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select 
                      name="status"
                      defaultValue={editingCourse?.status || 'Aktif'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Arkib">Arkib</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Penerangan (Pilihan)</label>
                  <textarea 
                    name="description"
                    rows={3}
                    defaultValue={editingCourse?.description}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    {editingCourse ? 'Simpan Perubahan' : 'Tambah Kursus'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
    </div>
  );
}
