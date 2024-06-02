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
async function getUserInfo(userID) {
  try {
    const result = await db.query(`
      SELECT USERS.ID, USERS.EMAIL, LANGUAGE.LANG, SYSTEM.SYS, ACTIVITY.ACT, GENDER.GEND, 
      GOAL.GOA, THEME.THEM, USERS.BIRTH_YEAR, USERS.HEIGHT, USERS.WEIGHT
      FROM USERS 
      JOIN LANGUAGE ON USERS.LANGUAGE_ID = LANGUAGE.ID 
      JOIN SYSTEM ON USERS.SYSTEM_ID = SYSTEM.ID 
      JOIN ACTIVITY ON USERS.ACTIVITY_ID = ACTIVITY.ID 
      JOIN GENDER ON USERS.GENDER_ID = GENDER.ID 
      JOIN GOAL ON USERS.GOAL_ID = GOAL.ID 
      JOIN THEME ON USERS.THEME_ID = THEME.ID 
      WHERE USERS.ID = ${userID};
    `);
    return result.rows[0];
  } catch (err) {
    console.log(err)
  }
}

//Update USER_HISTORY TABLE
async function updateUserHistory(userID) {
  const response = await db.query(`SELECT * FROM USER_HISTORY WHERE DATE = '${new Date().toLocaleDateString()}' AND USER_ID = ${userID};`);
  const foods = await getUserFoods(userID);
  if (foods.length) {
    if (response.rows[0]) {
      db.query(`     
      UPDATE USER_HISTORY SET 
      CAL = (SELECT COALESCE(SUM(FOODS.CAL * USER_FOODS.GR / 100), 0) FROM FOODS 
        JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
        WHERE USER_FOODS.USER_ID = ${userID}), 
      PROT = (SELECT COALESCE(SUM(FOODS.PROT * USER_FOODS.GR / 100), 0) FROM FOODS 
        JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
        WHERE USER_FOODS.USER_ID = ${userID}), 
      FAT = (SELECT COALESCE(SUM(FOODS.FAT * USER_FOODS.GR / 100), 0) FROM FOODS 
        JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
        WHERE USER_FOODS.USER_ID = ${userID}), 
      CARB = (SELECT COALESCE(SUM(FOODS.CARB * USER_FOODS.GR / 100), 0) FROM FOODS 
        JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
        WHERE USER_FOODS.USER_ID = ${userID})
      WHERE USER_HISTORY.USER_ID = ${userID} AND USER_HISTORY.DATE::DATE = NOW()::DATE;
      `);
    } else {
      db.query(`
      INSERT INTO USER_HISTORY VALUES (${userID},
      (SELECT SUM(FOODS.CAL * USER_FOODS.GR / 100) 
      FROM FOODS JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
      WHERE USER_FOODS.USER_ID = ${userID}), 
      (SELECT SUM(FOODS.PROT * USER_FOODS.GR / 100) 
      FROM FOODS JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
      WHERE USER_FOODS.USER_ID = ${userID}), 
      (SELECT SUM(FOODS.FAT * USER_FOODS.GR / 100) 
      FROM FOODS JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
      WHERE USER_FOODS.USER_ID = ${userID}), 
      (SELECT SUM(FOODS.CARB * USER_FOODS.GR / 100) 
      FROM FOODS JOIN USER_FOODS ON USER_FOODS.FOOD_ID = FOODS.ID 
      WHERE USER_FOODS.USER_ID = ${userID}), NOW() );
      `);
    }
  } else {
    db.query(`
    DELETE FROM USER_HISTORY 
    WHERE USER_ID = ${userID}
    AND DATE::DATE = NOW()::DATE; 
    `);
  }
} 

//Fetch USER_HISTORY table
async function getUserHistory(userID) {
  try {
    const result = await db.query(`SELECT * FROM USER_HISTORY WHERE USER_ID = ${userID} ORDER BY DATE;`);
    console.log(result.rows);
    return result.rows; 
  } catch (err) {
    console.log(err);
  }
}

// Fetch user's logs
async function getUserFoods(userID) {
    try {
        const result = await db.query(`
          SELECT foods.id, name, gr, cal, prot, fat, carb, icon 
          FROM FOODS JOIN USER_FOODS 
          ON USER_FOODS.FOOD_ID = FOODS.ID 
          WHERE USER_FOODS.USER_ID = ${userID} 
          ORDER BY CAL DESC;
          `);
        return result.rows;
    } catch (err) {
        console.log(err);
    }
}

//Fetch user's progress
async function getUserProgress(userID) {
  try {
      const result = await db.query(`
      SELECT * 
      FROM USER_PROGRESS 
      WHERE USER_ID = ${userID} 
      AND DATE > NOW() - INTERVAL '1year' 
      ORDER BY DATE;
      `);
      return result.rows;
  } catch (err) {
      console.log(err);
  }
}

// Fetch foods
async function getFoods(userID) {
  try {
      const result = await db.query(`
      SELECT FOODS.* 
      FROM FOODS LEFT JOIN USER_FOODS 
      ON FOODS.ID = USER_FOODS.FOOD_ID 
      AND USER_FOODS.USER_ID = ${userID} 
      WHERE (USER_FOODS.USER_ID IS NULL) 
      AND (FOODS.USER_ID IS NULL OR FOODS.USER_ID = ${userID}) 
      ORDER BY NAME;
    `);
      return result.rows;
  } catch (err) {
      console.log(err);
  }
}

app.post("/add", async (req,res) => {
  const userID = req.user.id;
  var foodsString = req.body.foodsArray;
  console.log("foodstring",foodsString);
  var gramsString = req.body.gramsArray; 
  console.log("gramString",gramsString);
  foodsString = foodsString.split(',');
  gramsString = gramsString.split(',');
  var command = "";

  for (let i=0; i<foodsString.length; i++) {
    if (!!(parseInt(gramsString[i])) && gramsString != "0") {
    command += `(${userID}, ${foodsString[i]}, ${gramsString[i]}),`;
    }
  }


  const final = command.slice(0, -1);
  console.log(final)

  if (!!(command)) {
    try {
      db.query(`INSERT INTO USER_FOODS VALUES ${final};`);
    } catch (error) {
      console.log(error);
    }
    updateUserHistory(userID);
  }

  res.redirect("/secrets");
})

app.get("/add-food-page", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const info = await getUserInfo(req.user.id);
        const foods = await getFoods(req.user.id);    
        res.render("add-food.ejs", {
            foods: foods,
            info: info
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.get("/create-food", (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
      const info = await getUserInfo(req.user.id);
      res.render("create-food.ejs", {
          info: info
      })
  })();
  } else {
    res.redirect("/login");
  }
});

app.post("/create-new-food", async (req,res) => {
  const userID = req.user.id;
  const name = req.body.name;
  const cal = req.body.cal;
  const prot = req.body.prot;
  const fat = req.body.fat;
  const carb = req.body.carb;

  var values = "";
  var fields = "";
  if (prot) {
    values += `, ${prot}`;
    fields += `, PROT`
  }
  if (fat) {
    values += `, ${fat}`;
    fields += `, FAT`
  }
  if (carb) {
    values += `, ${carb}`;
    fields += `, CARB`
  }

  const command = `INSERT INTO FOODS (NAME, CAL${fields} ,USER_ID) VALUES ('${name}', ${cal} ${values}, ${userID} );`;
  console.log(command)
  db.query(command);
  res.redirect("/secrets")

})

app.post("/update", async (req,res) => {  
    const userID = req.user.id;
    const grams = parseInt(req.body.grams);
    const foodID = parseInt(req.body.food);
    if (grams === 0) {
        try {
            await db.query(`
              DELETE FROM USER_FOODS 
              WHERE FOOD_ID = ${foodID} 
              AND USER_ID = ${userID};
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
              AND USER_ID = ${userID};
            `);
        } catch (error) {
            console.log(error);
        }
    }

    updateUserHistory(userID);
    res.redirect("/secrets");
})

app.post("/delete", async (req,res) => {
  const userID = req.user.id;
  const id = req.body.id;

  try {
      await db.query(`DELETE FROM USER_FOODS WHERE FOOD_ID = ${id} AND USER_ID = ${userID};`);
  } catch (error) {
      console.log(error)
  }

  updateUserHistory(userID);
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
        const foods = await getUserFoods(req.user.id);    
        const info = await getUserInfo(req.user.id);
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
    (async () => {
        const userID = req.user.id;
        const info = await getUserInfo(req.user.id);
        const history = await getUserHistory(userID);    
        res.render("history.ejs", {
            history: history,
            info: info
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.get("/stats", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const info = await getUserInfo(req.user.id);
        const prog = await getUserProgress(req.user.id); 
        const history = await getUserHistory(req.user.id); 
        res.render("stats.ejs", {
            prog: prog,
            info: info
        })
    })();
  } else {
    res.redirect("/login");
  }
});

app.get("/settings", async (req,res) => {
  if (req.isAuthenticated()) {
    (async () => {
        const info = await getUserInfo(req.user.id);
        const prog = await getUserProgress(req.user.id);  
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

    const userID = req.user.id;
    const field = req.body.field;
    const value = req.body.value;

    console.log("value: ",value);
    console.log("field: ",field);
    console.log("userID: ",userID);

    if (field=="weight" || field=="muscle" || field=="fat") { 
      try {
        const date = new Date().toLocaleDateString();
        const result = await db.query(`SELECT * FROM USER_PROGRESS WHERE USER_ID = ${userID} AND DATE = '${date}';`);
        console.log(result.rows[0]);

        if (result.rows[0]) {
          db.query(`UPDATE USER_PROGRESS SET ${field} = ${value} WHERE USER_ID = ${userID} AND DATE = '${date}'`);
        } else {
          db.query(`INSERT INTO USER_PROGRESS (USER_ID, ${field}, DATE) VALUES (${userID}, ${value}, '${date}');`);
        }

        if (field=="weight") {
          db.query(`UPDATE USERS SET WEIGHT = ${value} WHERE ID = ${userID};`);
        }

      } catch (err) {
        console.log(err)
      }
    } else {
      await db.query(`UPDATE USERS SET ${field} = ${value} WHERE ID = ${userID};`);
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
  cb(null, user.id);
}); 

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query(`SELECT * FROM users WHERE id = ${id};`);
    const user = result.rows[0];
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


//  make update weight update USER_PROGRESS.WEIGHT AND USERS.WEIGHT
// todo make create food work

//? Pro have more storage for foods in the database
//? Pro users have access to stats
//? Pro users have more themes