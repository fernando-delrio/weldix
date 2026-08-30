// El asistente (Mistral) suele responder con **negrita** en markdown. React
// escapa el texto por defecto (no dangerouslySetInnerHTML), así que sin esto
// el usuario veía los asteriscos literales en vez de texto en negrita.
const isBold = (part) => part.startsWith('**') && part.endsWith('**') && part.length > 3

export const renderFormattedText = (content) =>
  content
    .split(/(\*\*.+?\*\*)/g)
    .map((part, i) => (isBold(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part))
