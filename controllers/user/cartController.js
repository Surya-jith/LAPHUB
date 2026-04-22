import cartService from "../../services/user/cartService.js"

const loadCart = async (req, res) => {

  try {

    const userId = req.session.user;

    const cart = await cartService.getCart(userId);

    let cartItems = [];
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;
    let disableCheckout = false;

    if (cart && cart.items.length > 0) {

      // 🔥 REMOVE unavailable / deleted products
      cartItems = cart.items
        .filter(item => item.product) // remove deleted products
        .map(item => {

          const variant = item.product.variants.find(
            v => v._id.toString() === item.variant.toString()
          );

          // skip if variant missing
          if (!variant) return null;

          const price = variant.price;
          const itemSubtotal = price * item.quantity;

          subtotal += itemSubtotal;

          // validation for checkout
          if (
            variant.stock === 0 ||
            item.product.isBlocked ||
            !item.product.isListed ||
            item.quantity > variant.stock
          ) {
            disableCheckout = true;
          }

          return {
            product: item.product,
            productId: item.product._id,
            variant,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            isUnavailable: false
          };

        })
        .filter(Boolean); // remove null entries

    }

    tax = Number((subtotal * 0.02).toFixed(2));
    total = Number((subtotal + tax - discount).toFixed(2));

    res.render("user/cart", {
      cartItems,
      subtotal,
      discount,
      tax,
      total,
      disableCheckout
    });

  } catch (error) {

    console.log(error);
    res.redirect("/");

  }

};

const addToCart = async (req,res)=>{

try{

const userId = req.session.user

const {productId, variantId, quantity} = req.body

await cartService.addToCart(
userId,
productId,
variantId,
quantity
)

res.redirect("/cart")

}catch(error){

console.log(error)

res.redirect(`/product/${req.body.productId}?error=${encodeURIComponent(error.message)}`)

}

}

const increaseQty = async (req,res)=>{

try{

const userId = req.session.user
const productId = req.params.id

await cartService.increaseQty(userId, productId)

res.redirect("/cart")

}catch(error){

res.redirect(`/cart?error=${encodeURIComponent(error.message)}`)

}

}



const decreaseQty = async (req,res)=>{

try{

const userId = req.session.user
const productId = req.params.id

await cartService.decreaseQty(userId, productId)

res.redirect("/cart")

}catch(error){

res.redirect("/cart")

}

}

const removeCartItem = async (req,res)=>{

try{

const userId = req.session.user
const productId = req.params.id

await cartService.removeCartItem(userId, productId)

res.redirect("/cart")

}catch(error){

console.log(error)
res.redirect("/cart")

}

}


export default {
addToCart,
loadCart,
increaseQty,
decreaseQty,
removeCartItem
}