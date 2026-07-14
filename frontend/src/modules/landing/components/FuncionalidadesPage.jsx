import { useOutletContext } from 'react-router-dom'

import FeatureCategories from './FeatureCategories'
import FeaturesShowcase from './FeaturesShowcase'

const FuncionalidadesPage = () => {
  const { t } = useOutletContext()

  return (
    <div className="pt-16">
      <FeaturesShowcase t={t} />
      <FeatureCategories t={t} />
    </div>
  )
}

export default FuncionalidadesPage
