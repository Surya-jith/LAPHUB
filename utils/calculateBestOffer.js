const calculateBestOffer = (
  productOffer = 0,
  categoryOffer = 0,
  basePrice = 0
) => {

  const bestOffer =
    Math.max(
      productOffer,
      categoryOffer
    );

  const finalPrice =
    basePrice -
    (
      basePrice *
      bestOffer
    ) / 100;

  return {

    finalOffer: bestOffer,

    finalPrice: Number(
      finalPrice.toFixed(2)
    )
  };
};

export default
  calculateBestOffer;