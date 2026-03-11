import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },

    async (accessToken, refreshToken, profile, done) => {

      try {

        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {

          user = await User.create({
            username: profile.displayName,
            email: email,
            password: null
          });

        }

        return done(null, user);

      } catch (error) {

        return done(error, null);

      }

    }
  )
);



// ================= PASSPORT SESSION =================

passport.serializeUser((user, done) => {

  done(null, user.id);

});


passport.deserializeUser(async (id, done) => {

  try {

    const user = await User.findById(id);

    done(null, user);

  } catch (error) {

    done(error, null);

  }

});



export default passport;