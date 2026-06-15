import Cart from "../../models/cartModel.js"
import Product from "../../models/productModel.js"

const MAX_LIMIT = 5

const addToCart = async (userId, productId, variantId, quantity) => {

const product = await Product.findById(productId)

if (!product) {
throw new Error("Product not found")
}

const variant = product.variants.id(variantId)

if (!variant) {
throw new Error("Selected variant not available")
}


// blocked product
if (product.isBlocked) {
throw new Error("This product is blocked")
}


// unlisted product
if (!product.isListed) {
throw new Error("Product unavailable")
}


// stock check
if (variant.stock <= 0) {
throw new Error("Product out of stock")
}


let cart = await Cart.findOne({ user: userId })


if (!cart) {

const qty = Math.min(Number(quantity), variant.stock, MAX_LIMIT)

cart = new Cart({
user: userId,
items: [{
product: productId,
variant: variantId,
quantity: qty
}]
})

if (quantity > qty) {
throw new Error(`Only ${qty} items available`)
}

} else {

const existingItem = cart.items.find(item =>
item.product.toString() === productId &&
item.variant.toString() === variantId
)


if (existingItem) {

let newQty = existingItem.quantity + Number(quantity)

// max limit check
if (newQty > MAX_LIMIT) {
existingItem.quantity = MAX_LIMIT
await cart.save()
throw new Error(`Maximum ${MAX_LIMIT} items allowed`)
}


// stock check
if (newQty > variant.stock) {

existingItem.quantity = variant.stock
await cart.save()

throw new Error(`Only ${variant.stock} items available`)
}

existingItem.quantity = newQty

} else {

const qty = Math.min(Number(quantity), variant.stock, MAX_LIMIT)

cart.items.push({
product: productId,
variant: variantId,
quantity: qty
})

if (quantity > qty) {
await cart.save()
throw new Error(`Only ${qty} items available`)
}

}

}

await cart.save()

return cart

}



const getCart = async (userId) => {

const cart = await Cart.findOne({ user: userId })
.populate("items.product")

return cart

}

const increaseQty = async (userId, productId, variantId)=>{

const cart = await Cart.findOne({user:userId})

if (!cart) {
throw new Error("Cart is empty")
}

const item = cart.items.find(
i =>
i.product.toString() === productId &&
i.variant.toString() === variantId
)

if (!item) {
throw new Error("Cart item not found")
}

const product = await Product.findById(productId)

if (!product) {
throw new Error("Product not found")
}

if (product.isBlocked) {
throw new Error("This product is currently unavailable")
}

const variant = product.variants.id(item.variant)

 if (item.quantity >= MAX_LIMIT) {
    throw new Error(`Maximum ${MAX_LIMIT} items allowed`);
  }

if(item.quantity + 1 > variant.stock){
throw new Error("Stock limit reached")
}

item.quantity += 1

await cart.save()

}


const decreaseQty = async (userId, productId, variantId)=>{

const cart = await Cart.findOne({user:userId})

if (!cart) {
throw new Error("Cart is empty")
}

const item = cart.items.find(
i =>
i.product.toString() === productId &&
i.variant.toString() === variantId
)

if (!item) {
throw new Error("Cart item not found")
}

if(item.quantity > 1){
item.quantity -= 1
}

await cart.save()

}


const removeCartItem = async (userId, productId, variantId)=>{

const cart = await Cart.findOne({user:userId})

if(!cart) return

cart.items = cart.items.filter(
item =>
!(
item.product.toString() === productId &&
item.variant.toString() === variantId
)
)

await cart.save()

}


export default {
addToCart,
getCart,
increaseQty,
decreaseQty,
removeCartItem
}
