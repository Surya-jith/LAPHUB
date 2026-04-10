import express from "express";
import path from "path";
import session from "express-session";
import { fileURLToPath } from "url";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import passport from "./config/passport.js";
import User from "./models/user.js";
import cartCount from "./middlewares/cartCount.js"


const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "superSecretKey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      res.locals.user = user;
    } else {
      res.locals.user = null;
    }

    next();

  } catch (error) {
    res.locals.user = null;
    next();
  }
});

app.use((req, res, next) => {
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, private");

  next();
});


app.use(cartCount)
app.use("/", userRouter);
app.use("/admin", adminRouter);

export default app;
