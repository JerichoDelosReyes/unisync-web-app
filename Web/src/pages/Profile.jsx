import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from '../config/firebase'
import { updateProfile } from 'firebase/auth'
import { auth } from '../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  ExclamationTriangleIcon,
  UserIcon
} from '@heroicons/react/24/outline'

const ROLE_DISPLAY_NAMES = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  faculty: 'Faculty',
  student: 'Student'
}

export default function Profile() {
  const { user, userProfile, refreshProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const fileInputRef = useRef(null)
  
  // Check if user is faculty or higher (not student)
  const isFacultyOrHigher = userProfile?.role && ['faculty', 'admin', 'super_admin'].includes(userProfile.role)
  
  const [formData, setFormData] = useState({
    givenName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    // Student fields
    studentId: '',
    course: '',
    yearLevel: '',
    section: '',
    // Faculty fields
    employeeId: '',
    department: '',
    position: '',
    officeLocation: '',
    specialization: ''
  })

  useEffect(() => {
    if (userProfile) {
      setFormData({
        givenName: userProfile.givenName || '',
        middleName: userProfile.middleName || '',
        lastName: userProfile.lastName || '',
        suffix: userProfile.suffix || '',
        // Student fields
        studentId: userProfile.studentId || '',
        course: userProfile.course || '',
        yearLevel: userProfile.yearLevel || '',
        section: userProfile.section || '',
        // Faculty fields
        employeeId: userProfile.employeeId || '',
        department: userProfile.department || '',
        position: userProfile.position || '',
        officeLocation: userProfile.officeLocation || '',
        specialization: userProfile.specialization || ''
      })
    }
  }, [userProfile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file.' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB.' })
      return
    }

    setUploadingPhoto(true)
    setMessage({ type: '', text: '' })

    try {
      // Create a reference to the file location
      const fileExtension = file.name.split('.').pop()
      const storageRef = ref(storage, `profiles/${user.uid}/${user.uid}.${fileExtension}`)

      // Upload the file
      await uploadBytes(storageRef, file)

      // Get the download URL
      const photoURL = await getDownloadURL(storageRef)

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        photoURL: photoURL
      })

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: photoURL,
        updatedAt: serverTimestamp()
      })

      // Refresh user profile in context
      if (refreshProfile) {
        await refreshProfile()
      }

      setMessage({ type: 'success', text: 'Profile photo updated successfully!' })
    } catch (error) {
      console.error('Error uploading photo:', error)
      setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' })
    } finally {
      setUploadingPhoto(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Normalize suffix (n/a, N/A, none, NONE = empty)
      const normalizedSuffix = formData.suffix?.trim().toLowerCase()
      const suffix = (normalizedSuffix === 'n/a' || normalizedSuffix === 'none') 
        ? '' 
        : formData.suffix?.trim() || ''
      
      // Get middle initial (e.g., "Gabales" -> "G.")
      const middleInitial = formData.middleName ? `${formData.middleName.charAt(0).toUpperCase()}.` : ''
      
      // Build display name: "Juan G. Dela Cruz, Jr." format
      let displayName = formData.givenName
      if (middleInitial) displayName += ` ${middleInitial}`
      displayName += ` ${formData.lastName}`
      if (suffix) displayName += `, ${suffix}`
      
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName
      })

      // Update Firestore user document
      const updateData = {
        givenName: formData.givenName,
        middleName: formData.middleName || '',
        lastName: formData.lastName,
        suffix: suffix,
        displayName: displayName,
        updatedAt: serverTimestamp()
      }
      
      // Add role-specific fields
      if (isFacultyOrHigher) {
        updateData.employeeId = formData.employeeId
        updateData.department = formData.department
        updateData.position = formData.position
        updateData.officeLocation = formData.officeLocation
        updateData.specialization = formData.specialization
      } else {
        updateData.studentId = formData.studentId
        // Course, Year Level, and Section are read-only for students - only updated from reg form
        // Do NOT update these from profile edit to prevent manual override
      }
      
      await updateDoc(doc(db, 'users', user.uid), updateData)

      // Refresh user profile in context
      if (refreshProfile) {
        await refreshProfile()
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    if (userProfile) {
      setFormData({
        givenName: userProfile.givenName || '',
        middleName: userProfile.middleName || '',
        lastName: userProfile.lastName || '',
        suffix: userProfile.suffix || '',
        // Student fields
        studentId: userProfile.studentId || '',
        course: userProfile.course || '',
        yearLevel: userProfile.yearLevel || '',
        section: userProfile.section || '',
        // Faculty fields
        employeeId: userProfile.employeeId || '',
        department: userProfile.department || '',
        position: userProfile.position || '',
        officeLocation: userProfile.officeLocation || '',
        specialization: userProfile.specialization || ''
      })
    }
    setMessage({ type: '', text: '' })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoChange}
        accept="image/*"
        className="hidden"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-primary px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {userProfile?.photoURL ? (
                <img 
                  src={userProfile.photoURL} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                  {userProfile?.givenName?.[0]}{userProfile?.lastName?.[0]}
                </div>
              )}
              {/* Photo upload overlay */}
              <button
                type="button"
                onClick={handlePhotoClick}
                disabled={uploadingPhoto}
                className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingPhoto ? (
                  <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-white">
              <h2 className="text-xl font-semibold">{userProfile?.displayName}</h2>
              <p className="text-white/80 text-sm">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                {ROLE_DISPLAY_NAMES[userProfile?.role] || 'Student'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Given Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Given Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="givenName"
                  value={formData.givenName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Enter given name"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {userProfile?.givenName || '-'}
                </p>
              )}
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Middle Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Enter middle name"
                  required
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {userProfile?.middleName || '-'}
                  {userProfile?.middleName && (
                    <span className="ml-2 text-gray-500 text-sm">
                      ({userProfile.middleName.charAt(0).toUpperCase()}.)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Enter last name"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {userProfile?.lastName || '-'}
                </p>
              )}
            </div>

            {/* Suffix (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suffix
                <span className="text-gray-400 font-normal ml-1">(Optional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Jr., Sr., III, etc. (Leave blank if none)"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {userProfile?.suffix || '-'}
                </p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-500">
                {user?.email}
                <span className="ml-2 text-xs text-green-600">(Verified)</span>
              </p>
            </div>

            {/* Role-specific fields */}
            {isFacultyOrHigher ? (
              <>
                {/* Employee ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="Enter employee ID"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.employeeId || '-'}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="">Select department</option>
                      <option value="Computer Studies">Computer Studies</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Education">Education</option>
                      <option value="Business Administration">Business Administration</option>
                      <option value="Arts and Sciences">Arts and Sciences</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Criminal Justice">Criminal Justice</option>
                    </select>
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.department || '-'}
                    </p>
                  )}
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position/Designation
                  </label>
                  {isEditing ? (
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="">Select position</option>
                      <option value="Instructor I">Instructor I</option>
                      <option value="Instructor II">Instructor II</option>
                      <option value="Instructor III">Instructor III</option>
                      <option value="Assistant Professor I">Assistant Professor I</option>
                      <option value="Assistant Professor II">Assistant Professor II</option>
                      <option value="Assistant Professor III">Assistant Professor III</option>
                      <option value="Assistant Professor IV">Assistant Professor IV</option>
                      <option value="Associate Professor I">Associate Professor I</option>
                      <option value="Associate Professor II">Associate Professor II</option>
                      <option value="Associate Professor III">Associate Professor III</option>
                      <option value="Associate Professor IV">Associate Professor IV</option>
                      <option value="Associate Professor V">Associate Professor V</option>
                      <option value="Professor I">Professor I</option>
                      <option value="Professor II">Professor II</option>
                      <option value="Professor III">Professor III</option>
                      <option value="Professor IV">Professor IV</option>
                      <option value="Professor V">Professor V</option>
                      <option value="Professor VI">Professor VI</option>
                      <option value="University Professor">University Professor</option>
                    </select>
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.position || '-'}
                    </p>
                  )}
                </div>

                {/* Office Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="officeLocation"
                      value={formData.officeLocation}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="e.g., Room 201, DCS Building"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.officeLocation || '-'}
                    </p>
                  )}
                </div>

                {/* Specialization */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization/Area of Expertise
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="e.g., Software Engineering, Data Science"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.specialization || '-'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Student ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      placeholder="Enter student ID"
                    />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                      {userProfile?.studentId || '-'}
                    </p>
                  )}
                </div>

                {/* Course - Read-only, populated from registration form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course/Program
                    <span className="text-gray-400 font-normal ml-1">(From Reg Form)</span>
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {userProfile?.course || (
                      <span className="text-gray-400 italic">
                        Upload registration form in Schedule page
                      </span>
                    )}
                  </p>
                  {!userProfile?.course && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Go to Schedule page and upload your registration form to set your course.
                    </p>
                  )}
                </div>

                {/* Year Level - Read-only, populated from registration form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year Level
                    <span className="text-gray-400 font-normal ml-1">(From Reg Form)</span>
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {userProfile?.yearLevel || (
                      <span className="text-gray-400 italic">
                        Upload registration form in Schedule page
                      </span>
                    )}
                  </p>
                  {!userProfile?.yearLevel && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Go to Schedule page and upload your registration form to set your year level.
                    </p>
                  )}
                </div>

                {/* Section - Read-only, populated from registration form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                    <span className="text-gray-400 font-normal ml-1">(From Reg Form)</span>
                  </label>
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {userProfile?.section || (
                      <span className="text-gray-400 italic">
                        Upload registration form in Schedule page
                      </span>
                    )}
                  </p>
                  {!userProfile?.section && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Go to Schedule page and upload your registration form to set your section.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Account Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {ROLE_DISPLAY_NAMES[userProfile?.role] || 'Student'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Created
                </label>
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {userProfile?.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Organization Positions */}
          {(userProfile?.adviserOf || userProfile?.officerOf) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Positions</h3>
              <div className="space-y-3">
                {/* Adviser Positions */}
                {userProfile?.adviserOf && Object.keys(userProfile.adviserOf).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Adviser</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(userProfile.adviserOf).map(([orgCode, info]) => (
                        <span 
                          key={orgCode}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                        >
                          <UserIcon className="w-4 h-4 mr-1" />
                          {info.orgName} Adviser
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Officer Positions */}
                {userProfile?.officerOf && Object.keys(userProfile.officerOf).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Officer</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(userProfile.officerOf).map(([orgCode, info]) => (
                        <span 
                          key={orgCode}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                            info.canTagOfficers 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <span className="mr-1">{info.canTagOfficers ? '👑' : '🏅'}</span>
                          {info.positionTitle} - {info.orgName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
