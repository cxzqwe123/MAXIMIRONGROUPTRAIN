import React, { useState, useEffect } from 'react';
import { Calendar, Dumbbell, Save, Trash2, ChevronLeft, ChevronRight, Menu, X, Edit, Plus, Check, LogOut, LogIn } from 'lucide-react';
import { db, auth, googleProvider } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const defaultProgram = {
  monday: {
    name: 'Грудь',
    exercises: [
      { name: 'Жим под углом', sets: 4, reps: '8-10' },
      { name: 'Вертикальный жим сидя в тренажере', sets: 4, reps: '8-10' },
      { name: 'Бабочка', sets: 4, reps: '8-10' },
      { name: 'Махи вперед с гантелями', sets: 3, reps: '8' }
    ],
    cardio: '20-25 мин кардио на дорожке'
  },
  wednesday: {
    name: 'Спина',
    exercises: [
      { name: 'Тяга верхнего блока', sets: 4, reps: '8-10' },
      { name: 'Тяга Т грифа', sets: 4, reps: '8-10' },
      { name: 'Пуловер', sets: 4, reps: '8-10' },
      { name: 'Разводка в тренажере на заднюю дельту', sets: 3, reps: '8-10' }
    ],
    cardio: '20-25 мин кардио на дорожке'
  },
  friday: {
    name: 'Руки',
    exercises: [
      { name: 'Подъем гантелей на бицепс', sets: 4, reps: '8-10' },
      { name: 'Тяга на трицепс в тренажере', sets: 4, reps: '8-10' },
      { name: 'Махи гантелей в сторону', sets: 4, reps: '8-10' },
      { name: 'Гиперэкстензия', sets: 3, reps: '12-15' }
    ],
    cardio: '20-25 мин кардио на дорожке'
  }
};

// Whitelist email адресов (замени на свои!)
const ALLOWED_EMAILS = [
  'your@email.com',
  'friend@email.com'
];

export default function WorkoutTracker() {
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [workouts, setWorkouts] = useState({});
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [workoutProgram, setWorkoutProgram] = useState(defaultProgram);
  const [editMode, setEditMode] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Проверка авторизации
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Проверка whitelist
        if (!ALLOWED_EMAILS.includes(currentUser.email)) {
          alert('Доступ запрещен. Этот сайт доступен только авторизованным пользователям.');
          await signOut(auth);
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Загрузка данных после авторизации
  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadProgram();
    }
  }, [user]);

  // Загрузка тренировок из Firestore
  const loadWorkouts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const workoutsRef = collection(db, 'workouts');
      const q = query(workoutsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const workoutData = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workoutData[data.date] = data;
      });
      
      setWorkouts(workoutData);
    } catch (error) {
      console.error('Error loading workouts:', error);
      alert('Ошибка загрузки тренировок');
    }
    setLoading(false);
  };

  // Загрузка программы из Firestore
  const loadProgram = async () => {
    if (!user) return;
    
    try {
      const programDoc = await getDoc(doc(db, 'programs', user.uid));
      
      if (programDoc.exists()) {
        setWorkoutProgram(programDoc.data());
      }
    } catch (error) {
      console.error('Error loading program:', error);
    }
  };

  // Сохранение программы в Firestore
  const saveProgram = async (program) => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, 'programs', user.uid), program);
      setWorkoutProgram(program);
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Ошибка сохранения программы');
    }
  };

  // Сохранение тренировки в Firestore
  const saveWorkout = async (date, workout) => {
    if (!user) return;
    
    const dateKey = date.toISOString().split('T')[0];
    try {
      const workoutData = {
        userId: user.uid,
        date: dateKey,
        ...workout,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'workouts', `${user.uid}_${dateKey}`), workoutData);
      setWorkouts(prev => ({ ...prev, [dateKey]: workoutData }));
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Ошибка сохранения тренировки');
    }
  };

  // Удаление тренировки из Firestore
  const deleteWorkout = async (date) => {
    if (!user) return;
    
    const dateKey = date.toISOString().split('T')[0];
    try {
      await deleteDoc(doc(db, 'workouts', `${user.uid}_${dateKey}`));
      setWorkouts(prev => {
        const updated = { ...prev };
        delete updated[dateKey];
        return updated;
      });
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Ошибка удаления тренировки');
    }
  };

  // Google авторизация
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!ALLOWED_EMAILS.includes(result.user.email)) {
        alert('Доступ запрещен');
        await signOut(auth);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Ошибка авторизации');
    }
  };

  // Выход
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setWorkouts({});
      setWorkoutProgram(defaultProgram);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getDayOfWeek = (date) => {
    const day = date.getDay();
    if (day === 1) return 'monday';
    if (day === 3) return 'wednesday';
    if (day === 5) return 'friday';
    return null;
  };

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const openWorkoutModal = (date) => {
    const dayType = getDayOfWeek(date);
    if (!dayType) {
      alert('Тренировки только в Понедельник, Среду и Пятницу!');
      return;
    }

    setSelectedDate(date);
    const dateKey = date.toISOString().split('T')[0];
    const existingWorkout = workouts[dateKey];

    if (existingWorkout) {
      setCurrentWorkout(existingWorkout);
    } else {
      const program = workoutProgram[dayType];
      setCurrentWorkout({
        dayType,
        name: program.name,
        exercises: program.exercises.map(ex => ({
          ...ex,
          weights: Array(ex.sets).fill('')
        })),
        cardio: program.cardio,
        cardioTime: '',
        notes: ''
      });
    }
    setShowWorkoutModal(true);
  };

  const handleWeightChange = (exerciseIndex, setIndex, value) => {
    setCurrentWorkout(prev => {
      const updated = { ...prev };
      updated.exercises[exerciseIndex].weights[setIndex] = value;
      return updated;
    });
  };

  const handleSaveWorkout = () => {
    saveWorkout(selectedDate, currentWorkout);
    setShowWorkoutModal(false);
    setCurrentWorkout(null);
    setSelectedDate(null);
  };

  const handleDeleteWorkout = () => {
    if (confirm('Удалить эту тренировку?')) {
      deleteWorkout(selectedDate);
      setShowWorkoutModal(false);
      setCurrentWorkout(null);
      setSelectedDate(null);
    }
  };

  const startEditingDay = (day) => {
    setEditingDay({ ...workoutProgram[day], dayKey: day });
  };

  const saveEditedDay = () => {
    const updatedProgram = {
      ...workoutProgram,
      [editingDay.dayKey]: {
        name: editingDay.name,
        exercises: editingDay.exercises,
        cardio: editingDay.cardio
      }
    };
    saveProgram(updatedProgram);
    setEditingDay(null);
    setEditMode(false);
  };

  const addExercise = () => {
    setEditingDay(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name: '', sets: 4, reps: '8-10' }]
    }));
  };

  const removeExercise = (index) => {
    setEditingDay(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExercise = (index, field, value) => {
    setEditingDay(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

  // Экран загрузки
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mb-4"></div>
          <p className="text-slate-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Экран авторизации
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
            <span className="text-4xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Трекер тренировок</h1>
          <p className="text-slate-400 mb-6">Войдите чтобы продолжить</p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-slate-900 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-100 transition"
          >
            <LogIn className="w-5 h-5" />
            Войти через Google
          </button>
        </div>
      </div>
    );
  }

  // Основное приложение
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="sticky top-0 bg-slate-900 bg-opacity-95 backdrop-blur-sm z-40 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <span className="text-3xl md:text-4xl font-bold">M</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-7 h-7 md:w-10 md:h-10 text-blue-400" />
              <div>
                <h1 className="text-xl md:text-3xl font-bold">Трекер тренировок</h1>
                <p className="text-xs text-slate-400 hidden md:block">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="md:hidden p-2 hover:bg-slate-700 rounded-lg transition"
              >
                {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">Загрузка тренировок...</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 rounded-xl shadow-2xl p-3 md:p-6 mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="p-2 hover:bg-slate-700 rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <h2 className="text-lg md:text-2xl font-bold">
                  {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="p-2 hover:bg-slate-700 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center font-semibold text-slate-400 py-1 md:py-2 text-xs md:text-base">
                    {day}
                  </div>
                ))}
                {getMonthData().map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
                  
                  const dateKey = date.toISOString().split('T')[0];
                  const hasWorkout = workouts[dateKey];
                  const dayType = getDayOfWeek(date);
                  const isWorkoutDay = dayType !== null;
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={dateKey}
                      onClick={() => openWorkoutModal(date)}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        isToday ? 'border-blue-500' : 'border-slate-700'
                      } ${
                        hasWorkout
                          ? 'bg-green-600 hover:bg-green-500'
                          : isWorkoutDay
                          ? 'bg-slate-700 hover:bg-slate-600'
                          : 'bg-slate-800 hover:bg-slate-750 opacity-50'
                      } flex flex-col items-center justify-center p-1`}
                    >
                      <span className="text-sm md:text-lg font-semibold">{date.getDate()}</span>
                      {isWorkoutDay && (
                        <span className="text-[8px] md:text-xs text-slate-300 leading-tight">
                          {workoutProgram[dayType].name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`${showMenu ? 'block' : 'hidden'} md:block bg-slate-800 rounded-xl shadow-2xl p-4 md:p-6 mb-4`}>
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                  Программа тренировок
                </h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  {editMode ? 'Готово' : 'Редактировать'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {Object.entries(workoutProgram).map(([day, program]) => (
                  <div key={day} className="bg-slate-700 rounded-lg p-3 md:p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-base md:text-lg text-blue-400">
                        {day === 'monday' ? 'Понедельник' : day === 'wednesday' ? 'Среда' : 'Пятница'}: {program.name}
                      </h4>
                      {editMode && (
                        <button
                          onClick={() => startEditingDay(day)}
                          className="p-1 hover:bg-slate-600 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1 text-xs md:text-sm">
                      {program.exercises.map((ex, i) => (
                        <li key={i} className="text-slate-300">
                          {i + 1}. {ex.name} - {ex.sets}x{ex.reps}
                        </li>
                      ))}
                      <li className="text-green-400 mt-2">{program.cardio}</li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="md:hidden w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Выход
            </button>
          </>
        )}
      </div>

      <div className="text-center py-6 mt-8">
        <p className="text-sm md:text-base text-slate-400">
          Production by MAXIMIRONGROUP
        </p>
      </div>

      {/* Модалки остаются без изменений - editingDay и showWorkoutModal */}
      {/* ... (код модалок такой же как в предыдущей версии) ... */}
    </div>
  );
}