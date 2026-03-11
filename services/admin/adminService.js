import User from "../../models/user.js"
import bcrypt from "bcryptjs"

const adminLogin=async(email,password)=>{

    const admin=await User.findOne({email})
    if(!admin){
           return {success:false,message:"admin not found"};
    }
    const match= await bcrypt.compare(password,admin.password)
    if(!match){
        return {success:false,message:"incorrect password"};
    }

    if(admin.role!=="admin"){
        return {success:false,message:"Access denied"}
    }

    return {success:true,admin}

}


const getUsers=async (page,search)=>{

    const limit=10;
    const skip=(page-1)*limit;

    const query = search ? { $or: [ { username: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } } ] } : {};
    const users = await User.find(query)
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit);

    const totalUsers=await User.countDocuments(query);
    const totalPages=Math.ceil(totalUsers / limit);

    return {users,totalPages};

}


const toggleBlockUser=async (userId)=>{
      const user = await User.findById(userId);
        user.isBlocked = !user.isBlocked;
        await user.save()


}





export default {
    adminLogin,
    getUsers,
    toggleBlockUser
}
