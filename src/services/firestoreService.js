import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============ USER OPERATIONS ============

// Create user profile in Firestore
export const createUserProfile = async (uid, userData) => {
  const userRef = doc(db, 'users', uid);
  const data = {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(userRef, data);
  return data;
};

// Get user profile
export const getUserProfile = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
};

// Update user profile
export const updateUserProfile = async (uid, updates) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Get all users (admin only)
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============ ANNOUNCEMENTS ============

// Get all announcements
export const getAnnouncements = async (limitCount = 50) => {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get announcements by type
export const getAnnouncementsByType = async (type) => {
  const q = query(
    collection(db, 'announcements'),
    where('type', '==', type),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Create announcement
export const createAnnouncement = async (announcementData) => {
  const docRef = await addDoc(collection(db, 'announcements'), {
    ...announcementData,
    likes: 0,
    comments: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

// Update announcement
export const updateAnnouncement = async (id, updates) => {
  const docRef = doc(db, 'announcements', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Delete announcement
export const deleteAnnouncement = async (id) => {
  await deleteDoc(doc(db, 'announcements', id));
};

// Subscribe to announcements (real-time)
export const subscribeToAnnouncements = (callback) => {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(announcements);
  });
};

// ============ FACILITIES ============

// Get all facilities
export const getFacilities = async () => {
  const snapshot = await getDocs(collection(db, 'facilities'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get facilities by building
export const getFacilitiesByBuilding = async (buildingId) => {
  const q = query(
    collection(db, 'facilities'),
    where('building', '==', buildingId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Update facility status
export const updateFacilityStatus = async (id, status, currentClass = null) => {
  const docRef = doc(db, 'facilities', id);
  await updateDoc(docRef, {
    status,
    currentClass,
    updatedAt: serverTimestamp()
  });
};

// Subscribe to facilities (real-time)
export const subscribeToFacilities = (callback) => {
  return onSnapshot(collection(db, 'facilities'), (snapshot) => {
    const facilities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(facilities);
  });
};

// ============ BOOKINGS ============

// Create facility booking
export const createBooking = async (bookingData) => {
  const docRef = await addDoc(collection(db, 'bookings'), {
    ...bookingData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// Get user bookings
export const getUserBookings = async (userId) => {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all bookings (admin/faculty)
export const getAllBookings = async () => {
  const q = query(
    collection(db, 'bookings'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Update booking status
export const updateBookingStatus = async (id, status) => {
  const docRef = doc(db, 'bookings', id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp()
  });
};

// ============ ORGANIZATIONS ============

// Get all organizations
export const getOrganizations = async () => {
  const snapshot = await getDocs(collection(db, 'organizations'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get organization by ID
export const getOrganizationById = async (id) => {
  const docRef = doc(db, 'organizations', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// Create organization
export const createOrganization = async (orgData) => {
  const docRef = await addDoc(collection(db, 'organizations'), {
    ...orgData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

// Update organization
export const updateOrganization = async (id, updates) => {
  const docRef = doc(db, 'organizations', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// ============ SCHEDULES ============

// Get schedules
export const getSchedules = async (filters = {}) => {
  let q = query(collection(db, 'schedules'));
  
  const snapshot = await getDocs(q);
  let schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Apply filters
  if (filters.section) {
    schedules = schedules.filter(s => s.section === filters.section);
  }
  if (filters.instructor) {
    schedules = schedules.filter(s => s.instructor === filters.instructor);
  }
  if (filters.day) {
    schedules = schedules.filter(s => s.day === filters.day);
  }
  
  return schedules;
};

// Get user schedule
export const getUserSchedule = async (userId, role) => {
  const q = query(collection(db, 'schedules'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Create schedule entry
export const createSchedule = async (scheduleData) => {
  const docRef = await addDoc(collection(db, 'schedules'), {
    ...scheduleData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// Update schedule
export const updateSchedule = async (id, updates) => {
  const docRef = doc(db, 'schedules', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Delete schedule
export const deleteSchedule = async (id) => {
  await deleteDoc(doc(db, 'schedules', id));
};

// ============ REPORTS ============

// Create issue report
export const createReport = async (reportData) => {
  const docRef = await addDoc(collection(db, 'reports'), {
    ...reportData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// Get user reports
export const getUserReports = async (userId) => {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get all reports (admin)
export const getAllReports = async () => {
  const q = query(
    collection(db, 'reports'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Update report status
export const updateReportStatus = async (id, status, resolution = null) => {
  const docRef = doc(db, 'reports', id);
  await updateDoc(docRef, {
    status,
    resolution,
    resolvedAt: status === 'resolved' ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
};

// ============ EMERGENCY CONTACTS ============

// Get emergency contacts
export const getEmergencyContacts = async () => {
  const snapshot = await getDocs(collection(db, 'emergencyContacts'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Create emergency contact
export const createEmergencyContact = async (contactData) => {
  const docRef = await addDoc(collection(db, 'emergencyContacts'), {
    ...contactData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

// ============ BUILDINGS DIRECTORY ============

// Get buildings
export const getBuildings = async () => {
  const snapshot = await getDocs(collection(db, 'buildings'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ============ SEED DATA FUNCTION ============

export const seedDatabase = async () => {
  console.log('Starting database seed...');
  
  try {
    // Seed Announcements
    const announcements = [
      {
        title: 'Final Examination Schedule for First Semester A.Y. 2024-2025',
        content: 'The final examination for the first semester will be held from December 15-20, 2024. Please check your respective schedules through the student portal. All students are required to bring their school ID during the examination.',
        author: 'Office of the Registrar',
        authorRole: 'Admin',
        type: 'campus',
        likes: 145,
        comments: 23,
        image: null,
        priority: 'high'
      },
      {
        title: 'BITS General Assembly - December Meeting',
        content: 'All BITS members are invited to attend our monthly general assembly this Friday at 3:00 PM in Room 301, New Building. Attendance is mandatory for all officers.',
        author: 'BITS Organization',
        authorRole: 'Organization',
        type: 'organization',
        likes: 67,
        comments: 12,
        image: null,
        priority: 'normal'
      },
      {
        title: 'DIT Department Advisory',
        content: 'All DIT students are reminded to complete their clearance requirements before the enrollment period. Please submit all necessary documents to the department office.',
        author: 'DIT Department',
        authorRole: 'Department',
        type: 'department',
        likes: 89,
        comments: 8,
        image: null,
        priority: 'normal'
      },
      {
        title: 'Christmas Party Announcement',
        content: 'CvSU Bacoor Campus will be holding its annual Christmas party on December 18, 2024. All students and faculty are invited to join the celebration. There will be games, prizes, and food!',
        author: 'CSG - Central Student Government',
        authorRole: 'Organization',
        type: 'campus',
        likes: 234,
        comments: 45,
        image: null,
        priority: 'normal'
      },
    ];

    for (const announcement of announcements) {
      await createAnnouncement(announcement);
    }
    console.log('Announcements seeded');

    // Seed Facilities
    const facilities = [
      { name: 'Room 101', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null },
      { name: 'Room 102', building: 'new', floor: 1, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'IT Elective 3 - BSIT 4A' },
      { name: 'Room 201', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null },
      { name: 'Room 202', building: 'new', floor: 2, type: 'Classroom', capacity: 35, status: 'occupied', currentClass: 'Software Eng - BSIT 3B' },
      { name: 'Room 301', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'vacant', currentClass: null },
      { name: 'Room 302', building: 'new', floor: 3, type: 'Classroom', capacity: 40, status: 'occupied', currentClass: 'Database Systems - BSIT 2A' },
      { name: 'Room 401', building: 'new', floor: 4, type: 'Classroom', capacity: 35, status: 'vacant', currentClass: null },
      { name: 'DIT Office', building: 'new', floor: 2, type: 'Office', capacity: 10, status: 'occupied', currentClass: 'Department Office' },
      { name: 'CompLab 1', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'occupied', currentClass: 'Programming 2 - BSIT 1A' },
      { name: 'CompLab 2', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null },
      { name: 'CompLab 3', building: 'old', floor: 2, type: 'Computer Lab', capacity: 30, status: 'vacant', currentClass: null },
      { name: 'Library', building: 'old', floor: 1, type: 'Library', capacity: 50, status: 'occupied', currentClass: 'Open for Students' },
      { name: 'Health Service', building: 'old', floor: 1, type: 'Service', capacity: 5, status: 'occupied', currentClass: 'Operating Hours' },
      { name: 'Basketball Court', building: 'gym', floor: 1, type: 'Sports Facility', capacity: 100, status: 'vacant', currentClass: null },
      { name: 'Stage', building: 'gym', floor: 1, type: 'Event Venue', capacity: 200, status: 'vacant', currentClass: null },
      { name: 'Main Dining Area', building: 'canteen', floor: 1, type: 'Dining', capacity: 150, status: 'occupied', currentClass: 'Open Hours' },
      { name: 'Kitchen Lab 1', building: 'hm', floor: 1, type: 'Laboratory', capacity: 20, status: 'occupied', currentClass: 'Food Prep - BSHM 2A' },
      { name: 'Mock Hotel Room', building: 'hm', floor: 1, type: 'Laboratory', capacity: 10, status: 'vacant', currentClass: null },
    ];

    for (const facility of facilities) {
      await addDoc(collection(db, 'facilities'), {
        ...facility,
        createdAt: serverTimestamp()
      });
    }
    console.log('Facilities seeded');

    // Seed Organizations
    const organizations = [
      {
        name: 'CSG',
        fullName: 'Central Student Government',
        description: 'The official student government body representing all students of CvSU Bacoor Campus.',
        members: 15,
        type: 'Government',
        officers: [
          { position: 'President', name: 'Juan Dela Cruz' },
          { position: 'Vice President', name: 'Maria Santos' },
          { position: 'Secretary', name: 'Jose Garcia' },
        ],
        events: ['General Assembly', 'Leadership Summit', 'Campus Elections'],
        color: '#0D5C2F'
      },
      {
        name: 'BITS',
        fullName: 'Bachelor of Information Technology Society',
        description: 'An organization for IT students fostering technical skills and professional development.',
        members: 250,
        type: 'Academic',
        officers: [
          { position: 'President', name: 'Carlo Reyes' },
          { position: 'Vice President', name: 'Ana Lim' },
          { position: 'Secretary', name: 'Mark Tan' },
        ],
        events: ['IT Week', 'Hackathon', 'Tech Talks'],
        color: '#3b82f6'
      },
      {
        name: 'BMS',
        fullName: 'Business Management Society',
        description: 'Developing future business leaders through seminars, workshops, and entrepreneurial activities.',
        members: 180,
        type: 'Academic',
        officers: [
          { position: 'President', name: 'Sarah Cruz' },
          { position: 'Vice President', name: 'Paulo Santos' },
        ],
        events: ['Business Week', 'Trade Fair'],
        color: '#f59e0b'
      },
      {
        name: 'Cavite Communicators',
        fullName: 'Cavite Communicators',
        description: 'Enhancing communication skills through debates, public speaking, and media production.',
        members: 45,
        type: 'Special Interest',
        officers: [
          { position: 'President', name: 'Lisa Reyes' },
          { position: 'Vice President', name: 'Miguel Torres' },
        ],
        events: ['Debate Tournament', 'Speech Fest'],
        color: '#8b5cf6'
      },
      {
        name: 'CHTS',
        fullName: 'Hospitality and Tourism Society',
        description: 'Preparing students for careers in hospitality, tourism, and culinary arts.',
        members: 120,
        type: 'Academic',
        officers: [
          { position: 'President', name: 'Rica Mendoza' },
          { position: 'Vice President', name: 'James Villa' },
        ],
        events: ['Hotel Tour', 'Culinary Arts Week'],
        color: '#ec4899'
      },
    ];

    for (const org of organizations) {
      await createOrganization(org);
    }
    console.log('Organizations seeded');

    // Seed Schedules
    const schedules = [
      { day: 'Monday', time: '7:30', duration: 2, subject: 'IT Elective 3', section: 'BSIT 4A', room: 'Room 301', instructor: 'Prof. Santos' },
      { day: 'Monday', time: '10:00', duration: 2, subject: 'Software Engineering', section: 'BSIT 3B', room: 'Room 204', instructor: 'Prof. Cruz' },
      { day: 'Monday', time: '14:00', duration: 3, subject: 'Capstone Project', section: 'BSIT 4A', room: 'Room 401', instructor: 'Prof. Garcia' },
      { day: 'Tuesday', time: '8:00', duration: 2, subject: 'Database Systems', section: 'BSIT 2A', room: 'CompLab 2', instructor: 'Prof. Reyes' },
      { day: 'Tuesday', time: '13:00', duration: 3, subject: 'Programming 2', section: 'BSIT 1A', room: 'CompLab 1', instructor: 'Prof. Lim' },
      { day: 'Wednesday', time: '7:30', duration: 2, subject: 'IT Elective 3', section: 'BSIT 4A', room: 'Room 301', instructor: 'Prof. Santos' },
      { day: 'Wednesday', time: '10:00', duration: 2, subject: 'Software Engineering', section: 'BSIT 3B', room: 'Room 204', instructor: 'Prof. Cruz' },
      { day: 'Thursday', time: '8:00', duration: 2, subject: 'Database Systems', section: 'BSIT 2A', room: 'CompLab 2', instructor: 'Prof. Reyes' },
      { day: 'Thursday', time: '13:00', duration: 3, subject: 'Capstone Project', section: 'BSIT 4A', room: 'Room 401', instructor: 'Prof. Garcia' },
      { day: 'Friday', time: '9:00', duration: 3, subject: 'System Analysis', section: 'BSIT 3A', room: 'Room 302', instructor: 'Prof. Torres' },
      { day: 'Friday', time: '14:00', duration: 2, subject: 'Web Development', section: 'BSIT 2B', room: 'CompLab 3', instructor: 'Prof. Aquino' },
    ];

    for (const schedule of schedules) {
      await createSchedule(schedule);
    }
    console.log('Schedules seeded');

    // Seed Emergency Contacts
    const emergencyContacts = [
      {
        name: 'Civil Security Office',
        icon: 'Shield',
        location: 'Old Building, Ground Floor (Main Gate)',
        hours: '24/7',
        phone: '(046) XXX-XXXX',
        description: 'For campus security, room access requests, and emergency response.',
        color: 'error',
        order: 1
      },
      {
        name: 'Health Service Unit',
        icon: 'Heart',
        location: 'Old Building, Ground Floor',
        hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
        phone: '(046) XXX-XXXX',
        description: 'Medical consultations, first aid, and health certificates.',
        color: 'success',
        order: 2
      },
      {
        name: 'Guidance Office',
        icon: 'Users',
        location: 'New Building, 2nd Floor',
        hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
        phone: '(046) XXX-XXXX',
        description: 'Counseling services, career guidance, and student welfare.',
        color: 'primary',
        order: 3
      },
      {
        name: 'Office of Student Affairs',
        icon: 'BookOpen',
        location: 'New Building, 1st Floor',
        hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
        phone: '(046) XXX-XXXX',
        description: 'Student organizations, events, and disciplinary matters.',
        color: 'warning',
        order: 4
      },
    ];

    for (const contact of emergencyContacts) {
      await createEmergencyContact(contact);
    }
    console.log('Emergency contacts seeded');

    // Seed Buildings
    const buildings = [
      { id: 'new', name: 'New Building', icon: 'Building2', floors: 4 },
      { id: 'old', name: 'Old Building', icon: 'Building2', floors: 3 },
      { id: 'gym', name: 'Stage & Gymnasium', icon: 'Dumbbell', floors: 1 },
      { id: 'canteen', name: 'Canteen', icon: 'UtensilsCrossed', floors: 1 },
      { id: 'hm', name: 'HM Laboratory', icon: 'Home', floors: 1 },
    ];

    for (const building of buildings) {
      await setDoc(doc(db, 'buildings', building.id), {
        ...building,
        createdAt: serverTimestamp()
      });
    }
    console.log('Buildings seeded');

    console.log('Database seeding completed!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

export { db };
