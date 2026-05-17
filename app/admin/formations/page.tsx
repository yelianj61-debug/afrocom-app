'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, BookOpen, Loader2, Upload, X, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface CourseForm {
  title: string
  description: string
  full_description: string
  price: number
  currency: string
  is_published: boolean
}

export default function AdminFormations() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const coverRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CourseForm>({
    defaultValues: { currency: 'XOF', is_published: true },
  })

  async function loadCourses() {
    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { loadCourses() }, [])

  function openAdd() {
    setEditing(null)
    setCoverUrl('')
    setFileUrl('')
    reset({ currency: 'XOF', is_published: true, title: '', description: '', full_description: '', price: 0 })
    setShowForm(true)
  }

  function openEdit(course: Course) {
    setEditing(course)
    setCoverUrl(course.cover_image_url || '')
    setFileUrl(course.file_url || '')
    reset({
      title: course.title,
      description: course.description || '',
      full_description: course.full_description || '',
      price: course.price,
      currency: course.currency,
      is_published: course.is_published,
    })
    setShowForm(true)
  }

  async function uploadFile(file: File, folder: string, type: 'cover' | 'ebook') {
    if (type === 'cover') setUploadingCover(true)
    else setUploadingFile(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      if (type === 'cover') setCoverUrl(url)
      else setFileUrl(url)
      toast.success('Fichier téléchargé !')
    } catch {
      toast.error('Erreur lors du téléchargement')
    }

    if (type === 'cover') setUploadingCover(false)
    else setUploadingFile(false)
  }

  async function onSubmit(data: CourseForm) {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      ...data,
      price: Number(data.price),
      cover_image_url: coverUrl || null,
      file_url: fileUrl || null,
      created_by: user.id,
    }

    let error
    if (editing) {
      const res = await supabase.from('courses').update(payload).eq('id', editing.id)
      error = res.error
    } else {
      const res = await supabase.from('courses').insert(payload)
      error = res.error
    }

    if (error) {
      toast.error('Erreur lors de la sauvegarde')
    } else {
      toast.success(editing ? 'Formation mise à jour !' : 'Formation créée !')
      setShowForm(false)
      loadCourses()
    }
    setSaving(false)
  }

  async function deleteCourse(id: string) {
    if (!confirm('Supprimer cette formation ?')) return
    const supabase = createClient()
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) toast.error('Erreur lors de la suppression')
    else { toast.success('Formation supprimée'); loadCourses() }
  }

  async function togglePublish(course: Course) {
    const supabase = createClient()
    await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id)
    loadCourses()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Formations</h1>
          <p className="text-gray-500 mt-1">{courses.length} formation{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-5 h-5" />
          Nouvelle formation
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editing ? 'Modifier la formation' : 'Nouvelle formation'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="label">Titre *</label>
                <input {...register('title', { required: true })} className="input-field" placeholder="Nom de la formation" />
              </div>
              <div>
                <label className="label">Description courte *</label>
                <textarea {...register('description', { required: true })} rows={2} className="input-field resize-none" placeholder="Description en 1-2 phrases" />
              </div>
              <div>
                <label className="label">Description complète</label>
                <textarea {...register('full_description')} rows={4} className="input-field resize-none" placeholder="Description détaillée de la formation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prix *</label>
                  <input {...register('price', { required: true, min: 0 })} type="number" className="input-field" placeholder="15000" />
                </div>
                <div>
                  <label className="label">Devise</label>
                  <select {...register('currency')} className="input-field">
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Cover image upload */}
              <div>
                <label className="label">Image de couverture</label>
                {coverUrl ? (
                  <div className="relative h-32 rounded-xl overflow-hidden mb-2">
                    <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                    <button type="button" onClick={() => setCoverUrl('')} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverRef.current?.click()}
                    disabled={uploadingCover}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                  >
                    {uploadingCover ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 mb-1" />}
                    <span className="text-sm">{uploadingCover ? 'Téléchargement...' : 'Cliquer pour ajouter une image'}</span>
                  </button>
                )}
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'afrotv_images', 'cover')} />
              </div>

              {/* Ebook file upload */}
              <div>
                <label className="label">Fichier ebook/formation</label>
                {fileUrl ? (
                  <div className="flex items-center gap-3 bg-green-50 p-3 rounded-xl">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 flex-1 truncate">Fichier téléchargé</span>
                    <button type="button" onClick={() => setFileUrl('')} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-full h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
                  >
                    {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-sm">{uploadingFile ? 'Téléchargement...' : 'Ajouter un fichier PDF/ebook'}</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.epub,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'afrotv_videos', 'ebook')} />
              </div>

              <div className="flex items-center gap-3">
                <input {...register('is_published')} type="checkbox" id="published" className="w-4 h-4 accent-primary-600" />
                <label htmlFor="published" className="text-sm font-medium text-dark">Publier immédiatement</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outline justify-center">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary justify-center">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {saving ? 'Sauvegarde...' : (editing ? 'Mettre à jour' : 'Créer la formation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-4">Aucune formation créée</p>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-5 h-5" />
            Créer ma première formation
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course.id} className="card">
              <div className="relative h-40 bg-gradient-to-br from-primary-500 to-primary-700 overflow-hidden">
                {course.cover_image_url ? (
                  <Image src={course.cover_image_url} alt={course.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/40" />
                  </div>
                )}
                <div className={`absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full ${course.is_published ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {course.is_published ? '● Publié' : '○ Brouillon'}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-dark mb-1 line-clamp-1">{course.title}</h3>
                <p className="text-gray-400 text-xs mb-3 line-clamp-2">{course.description}</p>
                <div className="font-bold text-primary-600 mb-3">{formatCurrency(course.price, course.currency)}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePublish(course)}
                    className={`p-2 rounded-lg transition-colors ${course.is_published ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={course.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {course.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(course)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
