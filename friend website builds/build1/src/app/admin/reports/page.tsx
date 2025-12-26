'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import ConfirmationModal from '@/components/ConfirmationModal'

interface Report {
  id: string
  reason: string
  details: string | null
  status: string
  createdAt: string
  reporter: {
    name: string
    image: string
    uid: number
  }
  comment: {
    id: string
    body: string
    author: {
      name: string
      image: string
      uid: number
    }
    profile: {
      user: {
        name: string
        uid: number
      }
    }
  }
}

export default function AdminReports() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'under_review' | 'resolved'>('active')
  const { toasts, removeToast, showSuccess, showError } = useToast()
  
  // Confirmation modals
  const [deleteCommentModal, setDeleteCommentModal] = useState<{ commentId: string } | null>(null)
  const [banUserModal, setBanUserModal] = useState<{ userId: string; reason: string; duration?: number } | null>(null)

  useEffect(() => {
    async function checkAuth() {
      if (status === 'loading') return
      if (!session) {
        router.push('/')
        return
      }

      try {
        const res = await fetch('/api/admin/check')
        const data = await res.json()
        
        if (data.isOwner || data.isDeveloper || data.isAdmin || data.isModerator || data.isTrialMod) {
          setIsAuthorized(true)
          fetchReports()
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/')
      }
    }

    checkAuth()
  }, [session, status, router])

  async function fetchReports() {
    try {
      const res = await fetch('/api/admin/reports')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateReportStatus(reportId: string, status: string) {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status })
      })
      
      if (res.ok) {
        showSuccess('Report status updated successfully')
        fetchReports() // Refresh the list
      } else {
        showError('Failed to update report status')
      }
    } catch (error) {
      console.error('Error updating report:', error)
      showError('Failed to update report status')
    }
  }

  async function deleteComment(commentId: string) {
    try {
      const res = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      })
      
      if (res.ok) {
        showSuccess('Comment deleted successfully')
        fetchReports() // Refresh the list
      } else {
        showError('Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      showError('Failed to delete comment')
    } finally {
      setDeleteCommentModal(null)
    }
  }

  async function warnUser(userId: string, reason: string) {
    try {
      const res = await fetch('/api/admin/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      })
      
      if (res.ok) {
        showSuccess('User warned successfully')
        fetchReports() // Refresh the list
      } else {
        showError('Failed to warn user')
      }
    } catch (error) {
      console.error('Error warning user:', error)
      showError('Failed to warn user')
    }
  }

  async function banUser(userId: string, reason: string, duration?: number) {
    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, duration })
      })
      
      if (res.ok) {
        showSuccess('User banned successfully')
        fetchReports() // Refresh the list
      } else {
        showError('Failed to ban user')
      }
    } catch (error) {
      console.error('Error banning user:', error)
      showError('Failed to ban user')
    } finally {
      setBanUserModal(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  // Filter reports based on active tab
  const filteredReports = reports.filter(report => {
    switch (activeTab) {
      case 'active':
        return report.status === 'pending'
      case 'under_review':
        return report.status === 'reviewed'
      case 'resolved':
        return report.status === 'resolved'
      default:
        return true
    }
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Report Management</h1>
          <p className="text-neutral-400">Manage user reports and moderation actions</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-neutral-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Active ({reports.filter(r => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('under_review')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'under_review'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Under Review ({reports.filter(r => r.status === 'reviewed').length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Resolved ({reports.filter(r => r.status === 'resolved').length})
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-600">
                    <img 
                      src={report.reporter.image || '/placeholder.png'} 
                      alt={report.reporter.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{report.reporter.name}</div>
                    <div className="text-sm text-neutral-400">UID: {report.reporter.uid}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                    report.status === 'reviewed' ? 'bg-blue-600/20 text-blue-400' :
                    'bg-green-600/20 text-green-400'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-neutral-400 mb-1">Report Reason:</div>
                <div className="font-medium capitalize">{report.reason.replace('_', ' ')}</div>
                {report.details && (
                  <div className="mt-2 text-sm text-neutral-300">{report.details}</div>
                )}
              </div>

              <div className="mb-4 p-4 bg-neutral-700/50 rounded-lg">
                <div className="text-sm text-neutral-400 mb-2">Reported Comment:</div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-600">
                    <img 
                      src={report.comment.author.image || '/placeholder.png'} 
                      alt={report.comment.author.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{report.comment.author.name}</span>
                      <span className="text-xs text-neutral-400">UID: {report.comment.author.uid}</span>
                    </div>
                    <div className="text-sm">{report.comment.body}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500">
                  Reported on {new Date(report.createdAt).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Status Update Buttons */}
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateReportStatus(report.id, 'reviewed')}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        onClick={() => updateReportStatus(report.id, 'resolved')}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {report.status === 'reviewed' && (
                    <button
                      onClick={() => updateReportStatus(report.id, 'resolved')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                  
                  {/* Moderation Actions */}
                  <div className="border-l border-neutral-600 pl-2 ml-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteCommentModal({ commentId: report.comment.id })}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                      >
                        Delete Comment
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Warning reason:')
                          if (reason) warnUser(report.comment.author.uid.toString(), reason)
                        }}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-colors"
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Ban reason:')
                          const duration = prompt('Ban duration in days (leave empty for permanent):')
                          if (reason) {
                            setBanUserModal({
                              userId: report.comment.author.uid.toString(),
                              reason,
                              duration: duration ? parseInt(duration) * 24 * 60 * 60 * 1000 : undefined
                            })
                          }
                        }}
                        className="px-3 py-1 bg-red-800 hover:bg-red-900 rounded text-sm transition-colors"
                      >
                        Ban User
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <div className="text-neutral-400">
                {activeTab === 'active' && 'No active reports'}
                {activeTab === 'under_review' && 'No reports under review'}
                {activeTab === 'resolved' && 'No resolved reports'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      {deleteCommentModal && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={() => deleteComment(deleteCommentModal.commentId)}
          onCancel={() => setDeleteCommentModal(null)}
        />
      )}

      {banUserModal && (
        <ConfirmationModal
          isOpen={true}
          title="Ban User"
          message={`Are you sure you want to ban this user? This action cannot be undone.\n\nReason: ${banUserModal.reason}\n${banUserModal.duration ? `Duration: ${banUserModal.duration / (24 * 60 * 60 * 1000)} days` : 'Duration: Permanent'}`}
          confirmText="Ban User"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={() => banUser(banUserModal.userId, banUserModal.reason, banUserModal.duration)}
          onCancel={() => setBanUserModal(null)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
