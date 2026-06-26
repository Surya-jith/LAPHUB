const CLOSED_ITEM_STATUSES = ["Cancelled", "Returned"]

const getActiveOrderItems = (order) => {
  return (order?.items || []).filter(
    item => !CLOSED_ITEM_STATUSES.includes(item.status)
  )
}

const calculateItemPaidAmount = (item, order) => {
  const itemTotal = Number(item?.totalPrice || 0)
  const subtotal = Number(order?.subtotal || 0)
  const discount = Number(order?.discount || 0)
  const gst = Number(order?.gst || 0)

  if (itemTotal <= 0 || subtotal <= 0) {
    return 0
  }

  const itemShare = itemTotal / subtotal
  const itemDiscount = discount * itemShare
  const itemGst = gst * itemShare

  return Number(Math.max(itemTotal + itemGst - itemDiscount, 0).toFixed(2))
}

const calculateItemsPaidAmount = (items, order) => {
  return Number(
    (items || [])
      .reduce((total, item) => total + calculateItemPaidAmount(item, order), 0)
      .toFixed(2)
  )
}

const calculateActiveOrderTotals = (order) => {
  const activeItems = getActiveOrderItems(order)
  const activeSubtotal = activeItems.reduce(
    (sum, item) => sum + Number(item.totalPrice || 0),
    0
  )
  const subtotal = Number(order?.subtotal || 0)
  const discount = Number(order?.discount || 0)
  const shippingCharge = Number(order?.shippingCharge || 0)
  const discountShare =
    subtotal > 0 ? discount * (activeSubtotal / subtotal) : 0
  const activeGst = Number((activeSubtotal * 0.02).toFixed(2))
  const activeDiscount = Number(
    Math.min(discountShare, activeSubtotal + activeGst).toFixed(2)
  )
  const finalAmount = Number(
    Math.max(
      activeSubtotal + activeGst + shippingCharge - activeDiscount,
      0
    ).toFixed(2)
  )

  return {
    activeItems,
    subtotal: Number(activeSubtotal.toFixed(2)),
    gst: activeGst,
    discount: activeDiscount,
    shippingCharge,
    finalAmount
  }
}

export {
  CLOSED_ITEM_STATUSES,
  getActiveOrderItems,
  calculateItemPaidAmount,
  calculateItemsPaidAmount,
  calculateActiveOrderTotals
}
