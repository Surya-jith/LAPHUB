import adminService from "../../services/admin/adminService.js"
import dashboardService from "../../services/admin/dashboardService.js";



const loadLogin=(req,res)=>{
    res.render("admin/login",{
        error:null
    })
}

const login=async(req,res)=>{
    try {
        const{email,password}=req.body
const result=await adminService.adminLogin(email,password);
if(!result.success){
    return res.render("admin/login",{
        error:result.message
    })
}

req.session.admin=result.admin._id;
res.redirect("/admin/dashboard")
        
    } catch (error) {
       console.log(error)
       res.redirect("/admin/login")
    }
    

}

const loadDashboard = async (
  req,
  res
) => {

  try {

    /*
    =================================
    FILTER
    =================================
    */

    const filter =
      req.query.filter || "monthly";

    /*
    =================================
    DASHBOARD DATA
    =================================
    */

    const data =
      await dashboardService
        .getDashboardData(
          filter
        );

    /*
    =================================
    RENDER
    =================================
    */

    res.render(
      "admin/dashboard",
      {

        ...data,

        filter
      }
    );

  } catch (error) {

    console.log(
      "Dashboard Error:",
      error
    );

    res.redirect(
      "/admin/login"
    );
  }
};

const loadUsers = async(req,res)=>{
    try {
        const page=parseInt(req.query.page)||1;
        const search=req.query.search||""
        const data =await adminService.getUsers(page,search)

        res.render("admin/users",{
            users:data.users,totalPages:data.totalPages,currentPage:page,search
        })
        
    } catch (error) {
        console.log(error);
    res.redirect("/admin/dashboard");
    }
}

const toggleBlockUser=async (req,res)=>{

    try {
         const userId=req.params.id
    await adminService.toggleBlockUser(userId);
    res.redirect("/admin/users")   
    } catch (error) {
        console.log(error)
        res.redirect("/admin/users");
        
    }
}

const logout=(req,res)=>{
    req.session.admin=null;
    res.redirect("/admin/login")
}






export default{
    loadLogin,
    login,
    loadDashboard,
    loadUsers,
    toggleBlockUser,
    logout
}