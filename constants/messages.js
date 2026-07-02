const MESSAGES = Object.freeze({
  ORDER_NOT_FOUND: "Order not found",
  PAYMENT_ALREADY_COMPLETED: "Payment already completed",
  PAYMENT_RETRY_RAZORPAY_ONLY: "Retry available only for Razorpay orders",
  PAYMENT_RETRY_CANCELLED: "Payment cannot be retried for a cancelled order",
  PAYMENT_RETRY_UNAVAILABLE: "Unable to retry payment",
  COUPON_APPLIED: "Coupon applied",
  COUPON_REMOVED: "Coupon removed",
  COUPON_REMOVE_FAILED: "Unable to remove coupon",
  PRODUCT_IMAGE_UPLOAD_FAILED: "Unable to upload product images"
});

export default MESSAGES;
