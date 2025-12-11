import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('unisync_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Validate CvSU email
  const validateEmail = (email) => {
    return email.endsWith('@cvsu.edu.ph');
  };

  // Detect role from email
  const detectRole = (email) => {
    if (email.includes('admin')) return 'admin';
    if (email.includes('faculty') || email.includes('prof')) return 'faculty';
    if (email.includes('guard') || email.includes('security')) return 'guard';
    if (email.includes('class.rep') || email.includes('classrep')) return 'classrep';
    return 'student';
  };

  const login = async (email, password) => {
    // Validate institutional email
    if (!validateEmail(email)) {
      throw new Error('Please use your @cvsu.edu.ph email address');
    }

    // Simulate authentication (replace with actual API call)
    const role = detectRole(email);
    const isClassRep = email.includes('class.rep') || email.includes('classrep');
    const userData = {
      id: Date.now(),
      email,
      name: isClassRep ? 'Class Representative' : email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      role: isClassRep ? 'student' : role, // Class reps are still students but with extra permissions
      isClassRep: isClassRep,
      section: isClassRep ? 'BSIT 4A' : null, // Default section for demo
      department: 'DIT', // Default department
      avatar: null,
    };

    setUser(userData);
    localStorage.setItem('unisync_user', JSON.stringify(userData));
    
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unisync_user');
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('unisync_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
