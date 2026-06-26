const getActiveOfferPercentage = (product) => {
  const now = new Date()

  const productOffer =
    product?.productOffer?.expiryDate &&
    new Date(product.productOffer.expiryDate) > now
      ? Number(product.productOffer.percentage || 0)
      : 0

  const categoryOffer =
    product?.category?.categoryOffer?.expiryDate &&
    new Date(product.category.categoryOffer.expiryDate) > now
      ? Number(product.category.categoryOffer.percentage || 0)
      : 0

  return Math.max(productOffer, categoryOffer)
}

const applyOfferToPrice = (price, offerPercentage = 0) => {
  const basePrice = Number(price || 0)
  const offer = Math.max(Number(offerPercentage || 0), 0)

  return Number((basePrice - (basePrice * offer) / 100).toFixed(2))
}

const getEffectiveVariantPrice = (product, variant) => {
  const offer = getActiveOfferPercentage(product)
  return applyOfferToPrice(variant?.price, offer)
}

const getLowestEffectivePrice = (product) => {
  const variants = product?.variants || []

  if (!variants.length) {
    return applyOfferToPrice(product?.price, getActiveOfferPercentage(product))
  }

  return Math.min(
    ...variants.map(variant => getEffectiveVariantPrice(product, variant))
  )
}

export {
  getActiveOfferPercentage,
  applyOfferToPrice,
  getEffectiveVariantPrice,
  getLowestEffectivePrice
}
