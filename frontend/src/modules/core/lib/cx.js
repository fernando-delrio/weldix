// Combina clases CSS filtrando valores falsy (null, undefined, false, '')
// Uso: cx('base', isActive && 'active', error ? 'red' : 'green')
// Devuelve: 'base active green'  (string listo para className={})
export const cx = (...classes) => classes.filter(Boolean).join(' ')
