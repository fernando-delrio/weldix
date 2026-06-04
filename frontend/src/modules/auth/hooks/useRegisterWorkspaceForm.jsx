import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuthSession } from './useAuthSession'

const TOKEN_KEY = 'weldix_access_token'

const isEmptyField = (valor) => !valor || valor.trim().length === 0

const validationError = (form) => {
  if (isEmptyField(form.nombre_taller)) return 'El nombre del taller es obligatorio'
  if (isEmptyField(form.admin_email)) return 'El email es obligatorio'
  if (isEmptyField(form.admin_password)) return 'La contraseña es obligatoria'
  if (form.admin_password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!form.aceptar_terminos) return 'Debes aceptar los términos y condiciones'
  return null
}

const useRegisterWorkspaceForm = () => {
  const { saveToken, refreshProfile } = useAuthSession()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre_taller: '',
    admin_email: '',
    admin_password: '',
    admin_name: '',
    aceptar_terminos: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const update = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setFeedback('')

    const err = validationError(form)
    if (err) {
      setError(err)
      return
    }

    setIsSubmitting(true)
    try {
      const data = await authService.registerWorkspace(form)
      saveToken(data.access_token)
      await refreshProfile(data.access_token)
      setFeedback(`¡Bienvenido a Weldix, ${data.tenant_nombre}!`)
      setTimeout(() => navigate('/app/inicio'), 800)
    } catch (ex) {
      setError(ex.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { form, update, isSubmitting, error, feedback, submit }
}

export default useRegisterWorkspaceForm
