// Email validation for CvSU domain
export const ALLOWED_DOMAIN = 'cvsu.edu.ph';

export const validateCvsuEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== ALLOWED_DOMAIN) {
    return { valid: false, error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` };
  }

  return { valid: true, error: null };
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP expiry time (10 minutes)
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

// Create temporary user data with OTP for login
export const createLoginOTP = (email) => {
  const otp = generateOTP();
  const loginData = {
    email,
    otp,
    otpExpiry: Date.now() + OTP_EXPIRY_MS,
    type: 'login'
  };
  
  localStorage.setItem('unisync_login_otp', JSON.stringify(loginData));
  
  // In production, this would be sent via email
  console.log('🔐 Login OTP Code:', otp);
  
  return otp;
};

// Verify login OTP
export const verifyLoginOTP = (email, enteredOtp) => {
  const loginData = localStorage.getItem('unisync_login_otp');
  
  if (!loginData) {
    return { valid: false, error: 'Session expired. Please try again.' };
  }
  
  const data = JSON.parse(loginData);
  
  if (data.email !== email) {
    return { valid: false, error: 'Email mismatch. Please try again.' };
  }
  
  if (Date.now() > data.otpExpiry) {
    localStorage.removeItem('unisync_login_otp');
    return { valid: false, error: 'OTP expired. Please request a new one.' };
  }
  
  if (enteredOtp !== data.otp) {
    return { valid: false, error: 'Invalid OTP. Please try again.' };
  }
  
  localStorage.removeItem('unisync_login_otp');
  return { valid: true, error: null };
};

// Create temporary user data with OTP for signup
export const createSignupOTP = (userData) => {
  const otp = generateOTP();
  const tempUser = {
    ...userData,
    otp,
    otpExpiry: Date.now() + OTP_EXPIRY_MS,
    type: 'signup'
  };
  
  localStorage.setItem('unisync_temp_user', JSON.stringify(tempUser));
  
  // In production, this would be sent via email
  console.log('🔐 Signup OTP Code:', otp);
  
  return otp;
};

// Check if user exists
export const userExists = (email) => {
  const users = JSON.parse(localStorage.getItem('unisync_users') || '[]');
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
};

// Authenticate user (for login after OTP verification)
export const authenticateUser = (email, password) => {
  const users = JSON.parse(localStorage.getItem('unisync_users') || '[]');
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  if (!user.isVerified) {
    return { success: false, error: 'Please verify your email first' };
  }
  
  return { success: true, user };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  return { valid: true, error: null };
};
