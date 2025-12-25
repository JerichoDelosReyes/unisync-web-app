/**
 * Faculty Role Request Modal
 * 
 * Allows students/class reps to request faculty role.
 * Collects ID photo, department, and reason for request.
 */

import { useState, useRef } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../config/firebase'
import { submitFacultyRequest } from '../../services/facultyRequestService'
import { DEPARTMENTS, DEPARTMENT_CODES } from '../../constants/targeting'
import ModalOverlay from './ModalOverlay'

export default function FacultyRequestModal({ user, userProfile, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    department: '',
    reason: ''
  })
  const [idPhoto, setIdPhoto] = useState(null)
  const [idPhotoPreview, setIdPhotoPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setIdPhoto(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setIdPhotoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setIdPhoto(null)
    setIdPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadIdPhoto = async () => {
    if (!idPhoto) return null

    const fileExtension = idPhoto.name.split('.').pop()
    const fileName = `faculty_id_${user.uid}_${Date.now()}.${fileExtension}`
    const storageRef = ref(storage, `faculty_requests/${fileName}`)

    setUploadProgress('Uploading ID photo...')
    await uploadBytes(storageRef, idPhoto)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!idPhoto) {
      setError('Please upload a photo of your faculty ID.')
      return
    }
    if (!formData.department) {
      setError('Please select your department.')
      return
    }
    if (!formData.reason.trim()) {
      setError('Please provide a reason for your request.')
      return
    }
    if (formData.reason.trim().length < 20) {
      setError('Please provide a more detailed reason (at least 20 characters).')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload the ID photo first
      const idPhotoUrl = await uploadIdPhoto()
      
      setUploadProgress('Submitting request...')

      await submitFacultyRequest({
        userId: user.uid,
        userEmail: user.email,
        userName: userProfile?.displayName || `${userProfile?.givenName} ${userProfile?.lastName}`,
        idPhotoUrl: idPhotoUrl,
        department: formData.department,
        reason: formData.reason
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error submitting faculty request:', err)
      setError(err.message || 'Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Request Faculty Role</h2>
              <p className="text-white/80 text-sm">Submit your ID for verification</p>
            </div>
          </div>
        </div>

        {/* Form - scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Verification Required</p>
                <p className="mt-1 text-blue-700">Upload a clear photo of your official faculty ID. This will be reviewed by an administrator to verify your identity.</p>
              </div>
            </div>
          </div>

          {/* ID Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Faculty ID Photo <span className="text-red-500">*</span>
            </label>
            
            {idPhotoPreview ? (
              <div className="relative">
                <img 
                  src={idPhotoPreview} 
                  alt="ID Preview" 
                  className="w-full h-48 object-contain bg-gray-100 rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Photo selected: {idPhoto?.name}
                </p>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 font-medium">Click to upload your Faculty ID</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              📷 Make sure the ID photo is clear and all text is readable
            </p>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">Select your department</option>
              {Object.entries(DEPARTMENTS).map(([key, value]) => (
                <option key={key} value={value}>
                  {value} ({DEPARTMENT_CODES[key]})
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Information <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              placeholder="Please provide any additional information that may help verify your identity (e.g., subjects you teach, years of service)."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.reason.length}/200 characters (minimum 20)</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {uploadProgress}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}
