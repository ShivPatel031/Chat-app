import {User} from "../Models/user.model.js"
import { createPostCloudinary, removePostCloudinary } from "../Utility/Cloudinary.utility.js";
import { generateToken } from "../Utility/JWTtoken.js";
import { validateEmail, validateName, validatePassword } from "../Utility/Validations.js";
import bcrypt from "bcryptjs"
import fs from "fs";    

export const signup = async(req, res) => {

        let { fullName, email, password} = req.body;

        try {

            if(!fullName || !email || !password){
                return res.status(400).json({success:false,message: "All fields are required"});
            }

            email = email.trim().toLowerCase();
            fullName = fullName.trim().toLowerCase();

            if(!validateEmail(email)) return res.status(400).json({success:false,message: "Not a valid email."});

            if(!validateName(fullName)) return res.status(400).json({success:false,message: "Please enter valid name."});

            if (!validatePassword(password)) return res.status(404).json({ success:false, message: "Password must contain at least 1 lowercase, 1 uppercase , 1 number and 1 special character and length must be between 8-12." });


            if(password.length < 8){
                return res.status(400).json({message: "Password must be at least 8 characters"});
            }
    
            const user = await User.findOne({email})

            if(user) return res.status(400).json({message: "Email already exists"});

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                fullName,
                email,
                password: hashedPassword
            })

            if(newUser){
                generateToken(newUser._id, res)
                await newUser.save();

                res.status(201).json({
                    _id: newUser._id,
                    fullName: newUser.fullName,
                    email: newUser.email,
                    profilePic: newUser.profilePic,
                });
            } else {
                res.status(400).json({message: "Invalid user data"});
            }

        } catch(error) {
            console.log("Error in signup controller", error.message);
            res.status(500).json({ message: "Internal Server Error"});
        }
};

export const login = async (req, res) => {
    let {email, password} = req.body;
    try {

        if(!email || !password) return res.status(400).json({success:false,message: "All fields are required"});

        email = email.trim().toLowerCase();

        if(!validateEmail(email)) return res.status(400).json({success:false,message: "Not a valid email."});


        if (!validatePassword(password)) return res.status(404).json({ success:false, message: "Please enter correct credentials." });


        const user = await User.findOne({email})
        if(!user) {
            return res.status(400).json({message: "Invalid credentials"})
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(!isPasswordCorrect){
            return res.status(400).json({message: "Invalid credentials"})
        }

        generateToken(user._id, res)

        res.status(200).json({
            _id:user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic,
        })

    } catch(error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error"});
    }
}

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {maxAge:0})
        res.status(200).json({ message: "Logged out Successfully"});
    } catch(error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ message: "Internal Server Error"});
    }
}

export const updateProfile=async (req,res)=>
{   

    try {
        const {profilePic} = req.body;
        const userId = req.user._id;
        
        if(!profilePic) return res.status(404).json({success:false,message:"profile pic not found."});

        // const supportedType = ["mp4", "mov", "jpg", "jpeg", "png"]
        // const fileType = file.originalname.split('.')[1]
        // if (!supportedType.includes(fileType)) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "file type not supported."
        //     })
        // }

        // const postSize = file.size
        // const maxSize = 2097152
        // if (postSize > maxSize) {
        //     return res.status(413).json({
        //         success: false,
        //         message: "file size is too large."
        //     })
        // }
        
        const response = await createPostCloudinary(profilePic, "profile pic - chat app")

        if (!response) {
            return res.status(500).json({
                success: false,
                message: "error while uploading Post."
            })
        }

        const user = await User.findById(userId);

        if(!user) return res.status(500).json({success:false,message:"user not found."});

        if(user.cloudinaryId)
        {
            await removePostCloudinary(user.cloudinaryId);
        }
        

        user.profilePic=response.secure_url;
        user.cloudinaryId=response.public_id;

        const updatedUser = await user.save();
        

        return  res.status(200).json({success:true,message:updatedUser})
    } 
    catch (error) 
    {

         console.log("Something went wrong while updating profile.");

         return res.status(500).json({success:false,message:error.message})
    }
    // finally
    // {
    //     if(file) fs.unlinkSync(file.path);
    // }
}

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch(error) {
        console.log("Error in checkAuth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}