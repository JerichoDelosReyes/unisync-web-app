/**
 * Create Organization Modal
 * 
 * Allows Admin/Super Admin to create new student organizations.
 */

import { useState, useRef } from 'react'
import ModalOverlay from '../ui/ModalOverlay'
import { ORG_CATEGORIES, createOrganization } from '../../services/organizationService'
import { DEPARTMENTS } from '../../constants/targeting'

// Course options for audience targeting
const COURSE_OPTIONS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Business Administration',
  'BS Entrepreneurship',
  'BS Hospitality Management',
  'BS Tourism Management',
  'BS Psychology',
  'BS Office Administration',
  'BA Communication',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education'
]

export default function CreateOrganizationModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    fullName: '',
    category: '',
    audienceType: 'all',
    audienceCourse: '',
    audienceDepartment: '',
    maxAdvisers: 1,
    description: ''
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxAdvisers' ? parseInt(value) || 1 : value
    }))
    setError('')
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setLogoFile(file)
    setError('')

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const newOrg = await createOrganization(formData, logoFile)
      onSuccess?.(newOrg)
      handleClose()
    } catch (err) {
      console.error('Error creating organization:', err)
      setError(err.message || 'Failed to create organization')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      code: '',
      name: '',
      fullName: '',
      category: '',
      audienceType: 'all',
      audienceCourse: '',
      audienceDepartment: '',
      maxAdvisers: 1,
      description: ''
    })
    setLogoFile(null)
    setLogoPreview(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <ModalOverlay onClose={handleClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Create New Organization</h3>
          <p className="text-sm text-gray-500 mt-1">Add a new student organization to the system</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Organization Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Logo
              </label>
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="relative">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Organization Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., CSG, BITS, CSC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                maxLength={10}
                required
              />
              <p className="mt-1 text-xs text-gray-500">2-10 uppercase letters/numbers</p>
            </div>

            {/* Short Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Short Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Computer Science Clique"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g., Computer Science Clique of CvSU Imus"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select category...</option>
                {Object.entries(ORG_CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Audience Type */}
            <div>
              <label htmlFor="audienceType" className="block text-sm font-medium text-gray-700 mb-1">
                Announcement Audience <span className="text-red-500">*</span>
              </label>
              <select
                id="audienceType"
                name="audienceType"
                value={formData.audienceType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="all">All Students (Campus-wide)</option>
                <option value="course">Specific Course</option>
                <option value="department">Specific Department</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Who can receive announcements from this organization</p>
            </div>

            {/* Conditional: Audience Course */}
            {formData.audienceType === 'course' && (
              <div>
                <label htmlFor="audienceCourse" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Course <span className="text-red-500">*</span>
                </label>
                <select
                  id="audienceCourse"
                  name="audienceCourse"
                  value={formData.audienceCourse}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select course...</option>
                  {COURSE_OPTIONS.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Conditional: Audience Department */}
            {formData.audienceType === 'department' && (
              <div>
                <label htmlFor="audienceDepartment" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Department <span className="text-red-500">*</span>
                </label>
                <select
                  id="audienceDepartment"
                  name="audienceDepartment"
                  value={formData.audienceDepartment}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Max Advisers */}
            <div>
              <label htmlFor="maxAdvisers" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Advisers
              </label>
              <select
                id="maxAdvisers"
                name="maxAdvisers"
                value={formData.maxAdvisers}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={1}>1 Adviser</option>
                <option value={2}>2 Advisers</option>
                <option value={3}>3 Advisers</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the organization..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">ℹ️ Note:</span> New organizations will be created with default executive positions 
                (President, VP Internal, VP External, Secretary General, Treasurer General, Auditor, PRO). 
                Advisers and officers can be assigned after creation.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}
