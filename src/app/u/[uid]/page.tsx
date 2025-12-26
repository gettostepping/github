'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import OnlineStatusWidget from '@/components/OnlineStatusWidget'
import AdminBadge from '@/components/AdminBadge'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import ConfirmationModal from '@/components/ConfirmationModal'
import { formatLastActive } from '@/lib/timeUtils'
import { getUserAvatar } from '@/lib/images'
import NotSignedIn from '@/components/NotSignedIn'

export default function UserProfile({ params }: { params: { uid: string } }) {
  const { data: session, status } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCommentId, setReportCommentId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [deleteCommentModal, setDeleteCommentModal] = useState<{ commentId: string } | null>(null)
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profiles?uid=${encodeURIComponent(params.uid)}`)
        if (!res.ok) {
          setError('Profile not found')
          return
        }
        const profileData = await res.json()
        setData(profileData)
        
        // If user is logged in, check which comments they've liked
        if (session?.user?.email) {
          const likedComments = new Set<string>()
          if (profileData.comments) {
            for (const comment of profileData.comments) {
              // Check if current user liked this comment
              if (comment.likedBy && comment.likedBy.some((like: any) => like.user.email === session.user?.email)) {
                likedComments.add(comment.id)
              }
            }
          }
          setLikedComments(likedComments)
        }
      } catch (err) {
        setError('Failed to load profile')
        console.error('Error fetching profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [params.uid, session?.user?.email])

  async function handleDeleteComment(commentId: string) {
    try {
      const res = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      })
      if (res.ok) {
        showSuccess('Comment deleted successfully')
        window.location.reload()
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

    // 🔒 If user is not signed in
  if (status === "unauthenticated") {
    return <NotSignedIn />;
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-3xl font-bold text-white mb-4">User Not Found</h1>
          <p className="text-neutral-400 mb-6">
            The user with UID <span className="font-mono bg-neutral-800 px-2 py-1 rounded">{params.uid}</span> doesn't exist.
          </p>
          <div className="text-sm text-neutral-500 mb-8">
            This might be because:
            <ul className="text-left mt-2 space-y-1">
              <li>• The user hasn't signed in yet</li>
              <li>• The UID was recently reset</li>
              <li>• The user account was deleted</li>
            </ul>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
            <a
              href="/members"
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              Browse Members
            </a>
          </div>
        </div>
      </div>
    )
  }

  const isMe = session?.user?.email === data?.user?.email
  const themeColor = data?.profile?.themeAccent || '#8b5cf6'
  let commentLikeCount = 0

  return (
    <main className="min-h-screen bg-neutral-900">
      {/* Hero Banner */}
      <div className="relative h-64 overflow-hidden">
        {data?.user?.banner ? (
          <Image 
            src={`${data.user.banner}${data.user.banner.includes('?') ? '&' : '?'}size=4096`}
            alt="Banner" 
            fill 
            sizes="100vw"
            className="object-cover" 
            quality={100}
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Profile Header */}
      <div className="relative -mt-20 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-neutral-700/50 shadow-2xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Avatar with decoration */}
              <div className="relative">
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-neutral-800 shadow-xl">
                  <Image 
                    src={getUserAvatar(data?.user?.image, data?.user?.discordId)} 
                    alt={data?.user?.name || ''} 
                    fill 
                  sizes="96px"
                    className="object-cover" 
                  />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">{data?.user?.name || 'User'}</h1>
                    <div className="flex items-center gap-3 text-neutral-400 mb-2">
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${themeColor}20`, 
                          color: themeColor 
                        }}
                      >
                        UID: {data?.user?.uid ?? '—'}
                      </span>
                      <span className="text-xs">
                        Joined {data?.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {data?.profile?.bio && (
                      <div className="text-sm text-neutral-300 max-w-md mb-2">
                        {data.profile.bio}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <AdminBadge userId={data?.user?.id || ''} />
                    </div>
                  </div>
                  
                  {isMe && (
                    <div className="flex gap-2">
                      <a
                        href="/settings"
                        className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded-md transition-colors font-medium"
                      >
                      Edit Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Online Status Widget */}
      <div className="max-w-4xl mx-auto px-6 mb-4">
        <OnlineStatusWidget userId={data?.user?.id || ''} />
      </div>

      {/* Stats Grid */}
      <div className="max-w-4xl mx-auto px-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4 hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <span className="text-brand-400 text-xs">⏰</span>
              </div>
              <span className="text-xs text-neutral-400 font-medium">Last Active</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {data?.profile?.lastActiveAt ? formatLastActive(data.profile.lastActiveAt) : '—'}
            </div>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4 hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <span className="text-brand-400 text-xs">👁️</span>
              </div>
              <span className="text-xs text-neutral-400 font-medium">Profile Views</span>
            </div>
            <div className="text-lg font-semibold text-white">{(data?.views?.length || 0)}</div>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4 hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <span className="text-brand-400 text-xs">💬</span>
              </div>
              <span className="text-xs text-neutral-400 font-medium">Comments</span>
            </div>
            <div className="text-lg font-semibold text-white">{(data?.comments?.length || 0)}</div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Last Watching */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-brand-400">🎬</span>
              Last Watching
            </h3>
            {data?.profile?.lastWatchingTitle ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden">
                  <Image 
                    src={data.profile.lastWatchingPoster || '/placeholder.png'} 
                    alt={data.profile.lastWatchingTitle || ''} 
                    width={48} 
                    height={64} 
                    className="object-cover rounded-lg" 
                  />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">{data.profile.lastWatchingTitle}</div>
                  {data.profile.lastWatchingType === 'tv' && (
                    <div className="text-xs text-neutral-400">S{data.profile.lastWatchingSeason} · E{data.profile.lastWatchingEpisode}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center">
                  <Image src="/placeholder.png" alt="poster" width={48} height={64} className="object-cover rounded-lg" />
                </div>
                <div>
                  <div className="font-medium text-white text-sm">No recent activity</div>
                  <div className="text-xs text-neutral-400">Start watching to see your progress here</div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Views */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-brand-400">👀</span>
              Recent Profile Views
            </h3>
            <div className="space-y-1">
              {data?.views?.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex justify-between items-center py-1 border-b border-neutral-800/50 last:border-b-0">
                  {v.viewer ? (
                    <a 
                      href={`/u/${v.viewer.uid}`}
                      className="text-xs text-neutral-300 hover:text-brand-400 transition-colors cursor-pointer"
                    >
                      {v.viewer.name || `User ${v.viewer.uid}`}
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-300">Anonymous</span>
                  )}
                  <span className="text-xs text-neutral-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {!data?.views?.length && <div className="text-neutral-400 text-xs">No views yet.</div>}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-4 bg-neutral-900/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-brand-400">💬</span>
            Comments
          </h3>
          
          {/* Comment Form */}
          {session && (
            <div className="mb-4 p-3 bg-neutral-800/50 rounded-lg">
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const content = formData.get('content') as string
                if (!content.trim()) return
                
                try {
                  const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      profileId: data?.profile?.id, 
                      content: content.trim() 
                    })
                  })
                  if (res.ok) {
                    window.location.reload()
                  } else {
                    showError('Failed to post comment')
                  }
                } catch (error) {
                  console.error('Error posting comment:', error)
                  showError('Failed to post comment')
                }
              }}>
                <textarea
                  name="content"
                  placeholder="Leave a comment..."
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-neutral-500">Max 500 characters</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs rounded-md transition-colors font-medium"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="space-y-4">
            {data?.comments?.map((c: any) => (
              <div key={c.id} className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700/50">
                <div className="flex items-start gap-3">
                  {/* Commenter Avatar */}
                  <div className="relative">
                    <button 
                      onClick={() => window.location.href = `/u/${c.author?.uid || c.authorId}`}
                      className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-600 hover:border-neutral-500 transition-colors cursor-pointer"
                    >
                      <Image 
                        src={getUserAvatar(c.author?.image, c.author?.discordId)} 
                        alt={c.author?.name || 'User'} 
                        width={40}
                        height={40}
                        className="object-cover" 
                      />
                    </button>
                  </div>
                  
                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button 
                        onClick={() => window.location.href = `/u/${c.author?.uid || c.authorId}`}
                        className="text-yellow-400 hover:text-yellow-300 font-medium text-sm transition-colors"
                      >
                        {c.author?.name || 'Anonymous'}
                      </button>
                      <span className="text-neutral-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-white text-sm mb-2">{c.body}</div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          if (!session) {
                            showError('Please sign in to like comments')
                            return
                          }
                          
                          try {
                            const res = await fetch('/api/comments/like', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ commentId: c.id })
                            })
                            
                            if (res.ok) {
                              const data = await res.json()
                              setLikedComments(prev => {
                                const newSet = new Set(prev)
                                if (data.liked) {
                                  newSet.add(c.id)
                                } else {
                                  newSet.delete(c.id)
                                }
                                return newSet
                              })
                              
                              // Update the comment in the data
                              setData((prev: any) => ({
                                ...prev,
                                comments: prev.comments.map((comment: any) => 
                                  comment.id === c.id 
                                    ? { ...comment, likes: data.likes }
                                    : comment
                                )
                              }))

                            } else {
                              showError('Failed to like comment')
                            }
                          } catch (error) {
                            console.error('Error liking comment:', error)
                            showError('Failed to like comment')
                          }
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          likedComments.has(c.id) 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                        }`}
                      >
                        <span>💙</span>
                        <span>{c.likes || 0}</span>
                      </button>
                      <button 
                        onClick={() => {
                          setReportCommentId(c.id)
                          setShowReportModal(true)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-white transition-colors"
                      >
                        <span>⚠</span>
                        <span>Report</span>
                      </button>
                      {session && (
                        <button 
                        onClick={() => setDeleteCommentModal({ commentId: c.id })}
                          className="flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 rounded text-xs text-red-400 transition-colors"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!data?.comments?.length && <div className="text-neutral-400 text-xs">No comments yet.</div>}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4 border border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Report content</h3>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Report reason:</label>
                <div className="space-y-2">
                  {[
                    { value: 'spam', label: 'Spam', description: 'Spamming content' },
                    { value: 'advertising', label: 'Advertising', description: 'Advertising discord server/community or a website.' },
                    { value: 'offensive_content', label: 'Offensive Content', description: 'Content that is offensive, inappropriate, or harmful' },
                    { value: 'racism', label: 'Racism', description: 'Content containing racist language or discriminatory remarks' },
                    { value: 'other', label: 'Other', description: 'Please use "More information" field to explain further.' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reportReason"
                        value={option.value}
                        checked={reportReason === option.value}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm text-white">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-neutral-400">{option.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-neutral-300 mb-2">More information:</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>
              
              <button
                onClick={async () => {
                  if (!reportReason) {
                    showError('Please select a report reason')
                    return
                  }
                  
                  try {
                    const res = await fetch('/api/reports', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        commentId: reportCommentId,
                        reason: reportReason,
                        details: reportDetails
                      })
                    })
                    
                    if (res.ok) {
                      showSuccess('Report submitted successfully')
                      setShowReportModal(false)
                      setReportReason('')
                      setReportDetails('')
                      setReportCommentId(null)
                    } else {
                      showError('Failed to submit report')
                    }
                  } catch (error) {
                    console.error('Error submitting report:', error)
                    showError('Failed to submit report')
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {deleteCommentModal && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
          onConfirm={() => handleDeleteComment(deleteCommentModal.commentId)}
          onCancel={() => setDeleteCommentModal(null)}
        />
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  )
}