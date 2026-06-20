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
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "local-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true"
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

app.use((req, res) => {
  res.status(404).render("errors/error", {
    title: "Page Not Found",
    statusCode: 404,
    message: "The page you requested does not exist or is no longer available."
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled application error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).render("errors/error", {
    title: "Something Went Wrong",
    statusCode: error.status || 500,
    message: "We could not complete that request. Please try again."
  });
});

export default app;
