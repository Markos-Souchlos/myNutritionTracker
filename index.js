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
const currentUser = 1;

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

//Fetch user's information
async function getUserInfo() {
  try {
    const result = await db.query(`
      SELECT USERS.ID, LANGUAGE.LANG, SYSTEM.SYS, ACTIVITY.ACT, GENDER.GEND, 
      GOAL.GOA, THEME.THEM, USERS.BIRTH_YEAR, USERS.HEIGHT, USERS.WEIGHT
      FROM USERS 
      JOIN LANGUAGE ON USERS.LANGUAGE_ID = LANGUAGE.ID 
      JOIN SYSTEM ON USERS.SYSTEM_ID = SYSTEM.ID 
      JOIN ACTIVITY ON USERS.ACTIVITY_ID = ACTIVITY.ID 
      JOIN GENDER ON USERS.GENDER_ID = GENDER.ID 
      JOIN GOAL ON USERS.GOAL_ID = GOAL.ID 
      JOIN THEME ON USERS.THEME_ID = THEME.ID 
      WHERE USERS.ID = ${currentUser};
    `);
    return result.rows[0];
  } catch (err) {
    console.log(err)
  }
}

// Fetch user's logs
async function getUserFoods() {
    try {
        const result = await db.query(`
          SELECT foods.id, name, gr, cal, prot, fat, carb, icon 
          FROM FOODS JOIN USER_FOODS 
          ON USER_FOODS.FOOD_ID = FOODS.ID 
          WHERE USER_FOODS.USER_ID = ${currentUser} 
          ORDER BY CAL DESC;
          `);
        return result.rows;
    } catch (err) {
        console.log(err);
    }
}

//Fetch user's progress
async function getUserProgress() {
  try {
      const result = await db.query(`
      SELECT * 
      FROM USER_PROGRESS 
      WHERE USER_ID = ${currentUser} 
      AND DATE > NOW() - INTERVAL '1year' 
      ORDER BY DATE;
      `);
      return result.rows;
  } catch (err) {
      console.log(err);
  }
}

// Fetch foods
async function getFoods() {
  try {
      const result = await db.query(`
      SELECT FOODS.* 
      FROM FOODS LEFT JOIN USER_FOODS 
      ON FOODS.ID = USER_FOODS.FOOD_ID 
      AND USER_FOODS.USER_ID = ${currentUser} 
      WHERE (USER_FOODS.USER_ID IS NULL) 
      AND (FOODS.USER_ID IS NULL OR FOODS.USER_ID = ${currentUser}) 
      ORDER BY NAME;
    `);
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
  console.log(final)

  if (!!(command)) {
    try {
      db.query(`
        INSERT INTO USER_FOODS 
        VALUES ${final};
      `);
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

app.get("/create-food", (req,res) => {
  if (req.isAuthenticated()) {
    res.render("create-food.ejs");
  } else {
    res.redirect("/login");
  }
});

app.post("/update", async (req,res) => {
    const grams = parseInt(req.body.grams);
    const foodID = parseInt(req.body.food);
    if (grams === 0) {
        try {
            await db.query(`
              DELETE FROM USER_FOODS 
              WHERE FOOD_ID = ${foodID} 
              AND USER_ID = ${currentUser};
            `);
        } catch (error) {
            console.log(error);
        }
    } else {
        try {
            await db.query(`
              UPDATE USER_FOODS 
              SET GR = ${grams} 
              WHERE FOOD_ID = ${foodID} 
              AND USER_ID = ${currentUser};
            `);
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
      console.log(err);
    } 
    res.redirect("/");
  })
});

app.get("/secrets", (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const foods = await getUserFoods();    
        const info = await getUserInfo();
        res.render("secrets.ejs", {
          foods: foods,
          info: info
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.get("/history", (req,res) => {
  if (req.isAuthenticated()) {
    // (async () => {
    //     const foods = await getUserFoods();    
    //     res.render("secrets.ejs", {
    //         foods: foods
    //     })
    // })();
    res.render("history.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get("/stats", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const prog = await getUserProgress(); 
        res.render("stats.ejs", {
            prog: prog
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.get("/settings", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const info = await getUserInfo();
        const prog = await getUserProgress();  
        // console.log(info);  
        // console.log(prog);  
        res.render("settings.ejs", {
            prog: prog,
            info: info
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.post("/update-settings", async (req,res) => {
  if (req.isAuthenticated()) {
    const field = req.body.field;
    const value = req.body.value;

    if (field=="weight" || field=="muscle" || field=="fat") {
      try {
        const date = new Date().toLocaleDateString();
        const result = await db.query(`SELECT * FROM USER_PROGRESS WHERE USER_ID = ${currentUser} AND DATE = '${date}';`);
        console.log(result.rows[0]);
        if (result.rows[0]) {
          console.log("update");
          db.query(`UPDATE USER_PROGRESS SET ${field} = ${value} WHERE USER_ID = ${currentUser} AND DATE = '${date}'`);
        } else {
          console.log("insert");
          db.query(`INSERT INTO USER_PROGRESS (USER_ID, ${field}, DATE) VALUES (${currentUser}, ${value}, '${date}');`);
        }
      } catch (err) {
        console.log(err)
      }
    } else {
      await db.query(`UPDATE USERS SET ${field} = ${value} WHERE ID = ${currentUser};`);
    }
    
    res.redirect("/settings");

  } else {
    res.redirect("/login");
  }
});


app.get("/premium", (req,res) => {
  if (req.isAuthenticated()) {
    // (async () => {
    //     const foods = await getUserFoods();    
    //     res.render("secrets.ejs", {
    //         foods: foods
    //     })
    // })();
    res.render("premium.ejs");
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





// add database foods
// add new food button

// todo make each user fetch his own data
// make .log buttons work
// make .add button work
// add favicon
// add navbar icons
// TODO add seperate css pages
//  add search engine
// TODO scan bar code
// todo make database macros float and update the values
// todo user not found error message
// todo email already exists handler 
// added empty logs image
// upgraded database
// new create-food.ejs file
// stats reads weight,muscle,fat information from database
// new index.sql folder with database commands
// added cutlery icon to user's custom foods

// todo make secrets.ejs calculate goals of user
// todo make create food work
// todo stats.ejs bars are working
// todo history.ejs is working
// settings.ejs updates database
// todo render page based on settings
// todo add formated inputs for each settings field
// todo add bmi, bmr, maximum muscular potential etc to stats

// todo make premium work



//? Pro have more storage for foods in the database
//? Pro users have access to stats
//? Pro users have more themes