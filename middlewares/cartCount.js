import Cart from "../models/cartModel.js"

const cartCount = async (req,res,next)=>{

if(req.session.user){

const cart = await Cart.findOne({user:req.session.user})

res.locals.cartCount = cart ? cart.items.length : 0

}else{

res.locals.cartCount = 0

}

next()

}

export default cartCount