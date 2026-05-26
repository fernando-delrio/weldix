import { useState } from 'react'
import WeldixButton from '../../core/components/WeldixButton'

const labelBase = 'mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-400'
const inputBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
const selectBase =
  'w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'

const isEmptyField = (v) => !v || v.trim() === ''
const isTooShort = (v) => v.length < 8
const validationError = (form) =>
  isEmptyField(form.email)
    ? 'El email es obligatorio'
    : isEmptyField(form.fullName)
      ? 'El nombre es obligatorio'
      : isEmptyField(form.password)
        ? 'La contraseña es obligatoria'
        : isTooShort(form.password)
          ? 'La contraseña debe tener al menos 8 caracteres'
          : null

const errorBanner = ({ error }) => error && <p className="mt-3 text-sm text-rose-400">{error}</p>

const CreateUserModal = ({ onClose, onConfirm }) => {
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'operario' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleConfirm = async () => {
    const validError = validationError(form)
    return validError ? setError(validError) : executeConfirm()
  }

  const executeConfirm = async () => {
    setIsLoading(true)
    setError('')
    try {
      await onConfirm({
        email: form.email,
        full_name: form.fullName,
        password: form.password,
        role: form.role,
      })
      onClose()
    } catch (err) {
      setError(err.message ?? 'Error al crear el usuario.')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Crear usuario</h2>
          <WeldixButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal de creación de usuario"
            className="h-11 w-11 border border-slate-700"
          >
            ✕
          </WeldixButton>
        </div>

        <div className="grid gap-1">
          <label className={labelBase}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={updateField('email')}
            placeholder="operario@empresa.com"
            className={inputBase}
          />
        </div>

        <div className="mt-3 grid gap-1">
          <label className={labelBase}>Nombre completo</label>
          <input
            type="text"
            value={form.fullName}
            onChange={updateField('fullName')}
            placeholder="Juan García"
            className={inputBase}
          />
        </div>

        <div className="mt-3 grid gap-1">
          <label className={labelBase}>Contraseña temporal</label>
          <input
            type="password"
            value={form.password}
            onChange={updateField('password')}
            placeholder="Mínimo 8 caracteres"
            className={inputBase}
          />
        </div>

        <div className="mt-3 grid gap-1">
          <label className={labelBase}>Rol</label>
          <select value={form.role} onChange={updateField('role')} className={selectBase}>
            <option value="operario">Operario</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {errorBanner({ error })}

        <WeldixButton
          variant="primary"
          size="lg"
          onClick={handleConfirm}
          isLoading={isLoading}
          loadingLabel="Creando usuario…"
          className="mt-5 w-full"
        >
          Crear usuario
        </WeldixButton>
      </div>
    </div>
  )
}

export default CreateUserModal
