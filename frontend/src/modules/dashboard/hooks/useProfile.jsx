import { useState } from 'react'

import { useAuthSession } from '../../auth/hooks/useAuthSession'
import { changePassword, updateProfile } from '../services/profileService'

export const useProfile = () => {
  const { profile, refreshProfile, token } = useAuthSession()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [profileFeedback, setProfileFeedback] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  const submitProfile = async (event) => {
    event.preventDefault()
    setIsSavingProfile(true)
    setProfileError('')
    setProfileFeedback('')
    try {
      await updateProfile(fullName)
      await refreshProfile(token)
      setProfileFeedback('Perfil actualizado correctamente.')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }
    setIsSavingPassword(true)
    setPasswordError('')
    setPasswordFeedback('')
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordFeedback('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setIsSavingPassword(false)
    }
  }

  return {
    profile,
    fullName,
    setFullName,
    profileFeedback,
    profileError,
    isSavingProfile,
    submitProfile,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordFeedback,
    passwordError,
    isSavingPassword,
    submitPassword,
  }
}
