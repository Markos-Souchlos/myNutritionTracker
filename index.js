import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();
const currentUser = 13;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();
console.log(`Database has been succesfully connected with the server`)

// Fetch users logs
async function getUserFoods() {
    try {
        const result = await db.query(`SELECT foods.id, name, gr, cal, prot, fat, carb, icon FROM FOODS JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID WHERE USER_FOODS.USER_ID = ${currentUser} ORDER BY CAL DESC;`);
        return result.rows;
    } catch (err) {
        console.log(err);
    }
}

// Fetch foods
async function getFoods() {
  try {
      const result = await db.query(`SELECT FOODS.* FROM FOODS LEFT JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID  AND USER_FOODS.USER_ID = ${currentUser} WHERE USER_FOODS.USER_ID IS NULL ORDER BY NAME;`);
      return result.rows;
  } catch (err) {
      console.log(err);
  }
}

app.post("/add", async (req,res) => {
  var foodsString = req.body.foodsArray;
  var gramsString = req.body.gramsArray;
  foodsString = foodsString.split(',');
  gramsString = gramsString.split(',');
  var command = "";

  for (let i=0; i<foodsString.length; i++) {
    if (!!(parseInt(gramsString[i])) && gramsString != "0") {
    command += `(${currentUser}, ${foodsString[i]}, ${gramsString[i]}),`;
    }
  }


  const final = command.slice(0, -1);

  if (!!(command)) {
    try {
      db.query(`INSERT INTO USER_FOODS VALUES ${final};`);
    } catch (error) {
      console.log(error);
    }
  }

  res.redirect("/secrets");
})

app.get("/add-food-page", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const foods = await getFoods();    
        res.render("add-food.ejs", {
            foods: foods
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.post("/update", async (req,res) => {
    const grams = parseInt(req.body.grams);
    const foodID = parseInt(req.body.food);
    if (grams === 0) {
        try {
            await db.query(`DELETE FROM USER_FOODS WHERE FOOD_ID = ${foodID} AND USER_ID = ${currentUser};`);
        } catch (error) {
            console.log(error);
        }
    } else {
        try {
            await db.query(`UPDATE USER_FOODS SET GR = ${grams} WHERE FOOD_ID = ${foodID} AND USER_ID = ${currentUser};`);
        } catch (error) {
            console.log(error);
        }
    }
    res.redirect("/secrets");
})

app.post("/delete", async (req,res) => {
    const id = req.body.id;
    try {
        await db.query(`DELETE FROM USER_FOODS WHERE FOOD_ID = ${id} AND USER_ID = ${currentUser};`);
    } catch (error) {
        console.log(error)
    }
    res.redirect("/secrets");
});

app.get("/", (req, res) => {
  res.render("login.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req,res) => {
  console.log("logout has been pushed");
  req.logout((err) => {
    if (err) {
      console.log("if initialized")
      console.log(err);
    } 
    res.redirect("/");
  })
});

app.get("/secrets", (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const foods = await getUserFoods();    
        res.render("secrets.ejs", {
            foods: foods
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log(err)
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

passport.use(new Strategy(async function verify(username, password, cb) {

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          return cb(err);
        } else {
          if (result) {
            return cb(null, user)
          } else {
            return cb(null, false);
          }
        }
      });
    } else {
      return cb("User not found");
    }
  } catch (err) {
    return cb(err);
  }

}));

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});





// todo add database foods
// todo add database foods
// todo add new food button

//todo make each user fetch his own data
// make .log buttons work
// make .add button work
// add favicon
// add navbar icons
// TODO add seperate css pages
//  add search engine
// TODO scan bar code
// todo make premium page + icon
// todo create food option
// todo make database macros float and update the values



//users premium account has more storage for foods in the database