import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Tier 1 Organizations (Campus-Wide posting)
const TIER1_ORGS = ['CSG', 'The Flare', 'Honor Society', 'Sinag-Tala'];

// Tier 2 Organizations (Members/Followers Only)
const TIER2_ORGS = ['BITS', 'BMS', 'Cavite Communicators', 'CHTS', 'CYLE', 'CSC', "Educators' Guild", 'SMMS', 'YOPA'];

// All supported organizations
const ALL_ORGS = [...TIER1_ORGS, ...TIER2_ORGS];

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

  // Validate CvSU institutional email
  const validateEmail = (email) => {
    return email.toLowerCase().endsWith('@cvsu.edu.ph');
  };

  // Detect role from email with specific logic
  const detectRole = (email) => {
    const lowerEmail = email.toLowerCase();
    
    // Civil Security (Guard) - ONLY imus.guard@cvsu.edu.ph
    if (lowerEmail === 'imus.guard@cvsu.edu.ph') {
      return 'guard';
    }
    
    // Admin/MIS accounts
    if (lowerEmail.includes('admin') || lowerEmail.includes('mis')) {
      return 'admin';
    }
    
    // Faculty accounts
    if (lowerEmail.includes('faculty') || lowerEmail.includes('prof') || lowerEmail.includes('instructor')) {
      return 'faculty';
    }
    
    // Default to student
    return 'student';
  };

  // Check if user is a class representative
  const isClassRepresentative = (email) => {
    const lowerEmail = email.toLowerCase();
    return lowerEmail.includes('class.rep') || lowerEmail.includes('classrep') || lowerEmail.includes('rep.');
  };

  // Check if user is an organization officer
  const getOrgOfficerInfo = (email) => {
    const lowerEmail = email.toLowerCase();
    
    // Check for org officer pattern (e.g., bits.officer@cvsu.edu.ph)
    for (const org of ALL_ORGS) {
      const orgKey = org.toLowerCase().replace(/['\s]/g, '');
      if (lowerEmail.includes(orgKey + '.officer') || lowerEmail.includes(orgKey + '.pres') || lowerEmail.includes(orgKey + '.head')) {
        return {
          isOfficer: true,
          organization: org,
          tier: TIER1_ORGS.includes(org) ? 1 : 2
        };
      }
    }
    
    return { isOfficer: false, organization: null, tier: null };
  };

  // Get posting privileges based on role
  const getPostingPrivileges = (role, isClassRep, orgInfo) => {
    if (role === 'faculty') {
      return { canPost: true, scope: 'campus-wide', purpose: 'Academic notices, class suspensions, general updates' };
    }
    
    if (role === 'admin') {
      return { canPost: true, scope: 'campus-wide', purpose: 'System maintenance alerts, website downtime, critical errors' };
    }
    
    if (orgInfo?.isOfficer) {
      if (orgInfo.tier === 1) {
        return { canPost: true, scope: 'campus-wide', purpose: `${orgInfo.organization} announcements` };
      } else {
        return { canPost: true, scope: 'members-only', purpose: `${orgInfo.organization} member announcements` };
      }
    }
    
    if (isClassRep) {
      return { canPost: true, scope: 'section-only', purpose: 'Homework, cancellations, room changes' };
    }
    
    return { canPost: false, scope: null, purpose: null };
  };

  const login = async (email, password) => {
    // Validate institutional email
    if (!validateEmail(email)) {
      throw new Error('Please use your @cvsu.edu.ph email address');
    }

    // Simulate authentication (replace with actual API call)
    const role = detectRole(email);
    const isClassRep = isClassRepresentative(email);
    const orgInfo = getOrgOfficerInfo(email);
    const postingPrivileges = getPostingPrivileges(role, isClassRep, orgInfo);
    
    // Generate display name
    let displayName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    if (role === 'guard') {
      displayName = 'Civil Security Officer';
    } else if (isClassRep) {
      displayName = 'Class Representative';
    } else if (orgInfo.isOfficer) {
      displayName = `${orgInfo.organization} Officer`;
    }

    const userData = {
      id: Date.now(),
      email: email.toLowerCase(),
      name: displayName,
      role,
      isClassRep,
      isOrgOfficer: orgInfo.isOfficer,
      organization: orgInfo.organization,
      orgTier: orgInfo.tier,
      postingPrivileges,
      section: isClassRep ? 'BSCS 3-1' : null, // Demo section
      department: 'DIT',
      avatar: null,
      createdAt: new Date().toISOString(),
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

  // Check if user can post announcements
  const canPostAnnouncement = () => {
    return user?.postingPrivileges?.canPost || false;
  };

  // Get announcement scope for current user
  const getAnnouncementScope = () => {
    return user?.postingPrivileges?.scope || null;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    canPostAnnouncement,
    getAnnouncementScope,
    TIER1_ORGS,
    TIER2_ORGS,
    ALL_ORGS,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
