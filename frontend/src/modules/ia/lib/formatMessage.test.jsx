import { describe, it, expect } from 'vitest'
import { renderFormattedText } from './formatMessage'

// Bug real: el chat de IA pintaba **negrita** en crudo (asteriscos literales)
// en vez de texto en negrita, porque AssistantBubble mostraba `content` tal
// cual. renderFormattedText convierte los tramos **...** en <strong>.

describe('renderFormattedText', () => {
  it('convierte **texto** en un elemento <strong>', () => {
    const result = renderFormattedText('Usa **electrodo E6013**.')

    expect(result[0]).toBe('Usa ')
    expect(result[1].type).toBe('strong')
    expect(result[1].props.children).toBe('electrodo E6013')
    expect(result[2]).toBe('.')
  })

  it('deja el texto sin asteriscos intacto', () => {
    const result = renderFormattedText('Texto normal sin formato.')

    expect(result).toEqual(['Texto normal sin formato.'])
  })

  it('formatea varios tramos en negrita en el mismo mensaje', () => {
    const result = renderFormattedText('**Paso 1**: limpia. **Paso 2**: suelda.')

    const strongs = result.filter((part) => typeof part === 'object' && part.type === 'strong')
    expect(strongs).toHaveLength(2)
    expect(strongs[0].props.children).toBe('Paso 1')
    expect(strongs[1].props.children).toBe('Paso 2')
  })
})
