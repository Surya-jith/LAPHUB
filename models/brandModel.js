import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({

name:{
type:String,
required:true,
trim:true,
unique:true
},

description:{
type:String
},

isListed:{
type:Boolean,
default:true
},

isDeleted:{
type:Boolean,
default:false
}

},{
timestamps:true
})

const Brand = mongoose.model("Brand",brandSchema)

export default Brand